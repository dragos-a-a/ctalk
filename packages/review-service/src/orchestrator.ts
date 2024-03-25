import { REDIS_REVIEW_CHANNEL_NAME } from '@common/generic/utils/constants'
import { env } from '@common/generic/utils/envConfig'
import Redis from 'ioredis'
import mysql from 'mysql2/promise'
import { pino } from 'pino'
import promiseRetry from 'promise-retry'
import Redlock, { Lock } from 'redlock'

import { getReviewScoringService } from './reviewScoringService'

const logger = pino({ name: 'review' })
logger.info('Initializing database')
const { DB_NAME, DB_HOST, DB_PORT, DB_USER, DB_PWD } = env
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PWD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

const initDb = async (pool: mysql.Pool) => {
  let retries = 0
  let connection
  // first waiting a bit to give the DB time to start
  await new Promise((resolve) => setTimeout(resolve, 3000))
  while (retries < 3 && !connection) {
    try {
      connection = await pool.getConnection()
      logger.info('Connected to database!')
      break
    } catch (err) {
      logger.error('Could not connect to database. Retrying...', err)
      retries++
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  if (!connection) {
    console.error('Could not connect to database. Exiting...')
    process.exit(1)
  }
}

initDb(pool)

logger.info('Initializing Redis')
const { REDIS_HOST, REDIS_PORT } = env
const redisCache = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
})

const redlock = new Redlock([redisCache], { retryCount: 0 })

redisCache.on('connect', () => {
  logger.info('Connected to Redis as cache!')
})

redisCache.on('error', (error) => {
  logger.error('Failed to connect to Redis as cache:', error)
})

const redisSubscriber = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
})

redisSubscriber.on('connect', () => {
  logger.info('Connected to Redis as subscriber')
  redisSubscriber.subscribe(REDIS_REVIEW_CHANNEL_NAME)
})

redisSubscriber.on('error', (error) => {
  logger.error('Failed to connect to Redis as subscriber:', error)
})

// Calculates the avg rating for a product in a simple way (delta based on the previous avgRating and the new rating and type of action)
// Should be more efficient than a full recalculation of the avg rating
const calculateSimpleRatingChange = async (
  productId: number,
  reviewId: number,
  type: 'add' | 'update' | 'delete',
  newRating?: number,
  oldRating?: number
) => {
  switch (type) {
    case 'add':
      if (!newRating) {
        break
      }
      return await reviewScoringService.calculateRatingOnAdd(productId, reviewId, newRating)
    case 'update':
      if (!newRating || !oldRating) {
        break
      }
      return await reviewScoringService.calculateRatingOnUpdate(productId, reviewId, newRating, oldRating)
    case 'delete':
      if (!oldRating) {
        break
      }
      return await reviewScoringService.calculateRatingOnDelete(productId, reviewId, oldRating)
    default:
      logger.error('Invalid message type')
      break
  }

  return false
}

const reviewScoringService = getReviewScoringService(pool, redisCache)
const getProductProcessingCacheKey = (productId: number) => `processing:${productId}`

const MAX_RETRIES_FOR_FULL_CALCULATION = 100

// Calculates the full rating for a product
// used if simple calculations fail or if by the end of a simple calculations new changes came in
// recalulates until there are no more messages to process for that productId
const retryCalculateCompexRatingChange = async (productId: number) => {
  try {
    await promiseRetry(
      async (retry, number: number) => {
        if (number > 1) {
          logger.info(`Attempt ${number} in calculating complex rating change for productId ${productId}`)
        }

        try {
          // We need to recalculate the full rating as new reviews came after we started processing
          const processingCacheKey = getProductProcessingCacheKey(productId)

          // clear the queue
          await redisCache.del(processingCacheKey)
          await reviewScoringService.calculateFullRating(productId)

          // check if there are new messages to process
          const hasNewDataToProcess = await redisCache.get(processingCacheKey)
          if (hasNewDataToProcess) {
            retry(null)
          }
        } catch (err) {
          // if this fails we will have an inconsistent state for the avg rating
          // it should reach eventual consistency the next time a full recalculation is triggered
          // NOTE: it might take some time to reach cosistency and we might need a batch job to recalculate all the avg ratings (maybe nightly?)
          // or we store the corrupted productIds and recalculate them in a batch job or upon service startup
          logger.error(`Error in trying to recalculate complex rating change for productId ${productId}:`, err)
        }
      },
      {
        retries: MAX_RETRIES_FOR_FULL_CALCULATION,
      }
    )
  } catch {
    logger.info(`Failed retryCalculateCompexRatingChange after 20 retries for productId ${productId}`)
  }
}

// When we receive a message that a review change happened we need to recalculate the avg rating.
// In order to support multiple instances and high traffic of different actions for one productId we use locking and redis cache to maintain consistency.
// For the optimistic case in which a single review action happens (new review added / updated / deleted)
// we try to update the avg rating via a delta based on the previous avgRating and the new rating and type of action (to optimize db usage).
// If we have multiple actions happening on the same productId we fallback to a full recalculation of the avg rating (which is more expensive).
// If by the time we finish the full recalculation new actions happened we retry the full recalculation
// until there is a window in which there are no more actions between the start and the end of the recalculation.
redisSubscriber.on('message', async (channel, message) => {
  let lock: Lock | null = null
  try {
    if (channel === REDIS_REVIEW_CHANNEL_NAME) {
      let messageData: {
        productId: number
        reviewId: number
        type: 'add' | 'update' | 'delete'
        newRating?: number
        oldRating?: number
        timestamp: number
      } | null = null
      try {
        messageData = JSON.parse(message)
      } catch (err) {
        logger.error('Failed to parse message:', err)
      }

      if (!messageData || !messageData.productId || !messageData.reviewId || !messageData.type) {
        logger.warn('Invalid message received:', message)
        return
      }

      const { productId, reviewId, type, newRating, oldRating, timestamp } = messageData

      try {
        // Try to acquire a lock
        lock = await redlock.acquire([`${productId}:${timestamp}`], 5000)
      } catch (error) {
        // If the lock was not acquired, give up as other server is processing the message
        return
      }

      logger.info(`Received message from ${channel}: ${message}`)

      // checking if we are already processing this productId
      // we want to ensure that only 1 service is processing the productId at a time
      const processingCacheKey = getProductProcessingCacheKey(productId)
      const processingQueueCacheValue = await redisCache.get(processingCacheKey)

      if (processingQueueCacheValue) {
        const processingQueue = JSON.parse(processingQueueCacheValue) as string[]
        if (processingQueue.includes(timestamp.toString())) {
          // already processing this message (product id and timestamp) (possibly missed by the lock due to crash)
          return
        }

        processingQueue.push(timestamp.toString())

        logger.info(`Already processing message for product ${productId}. Adding timestamp ${timestamp} to queue.`)

        // this will let know other instances that a new message came in and they should recalculate the whole rating
        await redisCache.set(processingCacheKey, JSON.stringify(processingQueue), 'EX', 60)

        return
      } else {
        // this will let other instances know that we started processing for this productId
        // and they not try to calculate the score but just mark that a change came for the productId
        await redisCache.set(processingCacheKey, [timestamp].toString(), 'EX', 60)
      }

      const hasProcessed = await calculateSimpleRatingChange(productId, reviewId, type, newRating, oldRating)

      if (!hasProcessed) {
        logger.error(`Failed to process efficiently for message ${message}. Recalculating the whole rating`)
        await retryCalculateCompexRatingChange(productId)
        return
      }

      // check after we did the simple processing the status of the processing queue
      const processingQueueCacheValueAfterProcessing = await redisCache.get(processingCacheKey)
      if (processingQueueCacheValueAfterProcessing) {
        const processingQueueAfterProcessing = JSON.parse(processingQueueCacheValueAfterProcessing) as string[]
        const index = processingQueueAfterProcessing.indexOf(timestamp.toString())
        if (index !== -1) {
          // find and remove the current message from the queue
          processingQueueAfterProcessing.splice(index, 1)
          if (processingQueueAfterProcessing.length === 0) {
            // no new messages came in while we were processing
            await redisCache.del(processingCacheKey)
            logger.info(`Finished processing message for product ${productId}, timestamp ${timestamp}`)
            return
          } else {
            // new messages came in while we were processing so werecalculate the whole review rating until no more messages are coming to the queue
            await retryCalculateCompexRatingChange(productId)
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error processing message:', error)
  } finally {
    if (lock) {
      await lock.release()
    }
  }
})

export { logger }

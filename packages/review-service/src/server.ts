import { REDIS_REVIEW_CHANNEL_NAME } from '@common/generic/utils/constants'
import { env } from '@common/generic/utils/envConfig'
import Redis from 'ioredis'
import mysql from 'mysql2/promise'
import { pino } from 'pino'
import promiseRetry from 'promise-retry'
import Redlock, { Lock } from 'redlock'

import { getReviewScoringService } from './api/reviewScoringService'

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

const reviewScoringService = getReviewScoringService(pool, redisCache)
const getProductProcessingCacheKey = (productId: number) => `processing:${productId}`

const retryHeavyRatingCalculation = async (productId: number) => {
  try {
    await promiseRetry(
      async (retry, number: number) => {
        if (number > 1) {
          logger.info(`retryHeavyRatingCalculation attempt ${number} for productId ${productId}`)
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
          logger.error(`Error in retryHeavyRatingCalculation for productId ${productId}:`, err)
        }
      },
      {
        retries: 20,
      }
    )
  } catch {
    logger.info(`Failed retryHeavyRatingCalculation after 20 retries for productId ${productId}`)
  }
}

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

      const processingCacheKey = getProductProcessingCacheKey(productId)
      const processingQueueCacheValue = await redisCache.get(processingCacheKey)
      if (processingQueueCacheValue) {
        const processingQueue = JSON.parse(processingQueueCacheValue) as string[]
        if (processingQueue.includes(timestamp.toString())) {
          // already processing this message (possibly missed by the lock due to crash)
          return
        }
        processingQueue.push(timestamp.toString())
        logger.info(`Already processing message for product ${productId}. Adding timestamp ${timestamp} to queue.`)
        await redisCache.set(processingCacheKey, JSON.stringify(processingQueue), 'EX', 60)
        return
      } else {
        await redisCache.set(processingCacheKey, [timestamp].toString(), 'EX', 60)
      }

      let hasProcessed = false

      switch (type) {
        case 'add':
          if (!newRating) {
            break
          }
          hasProcessed = await reviewScoringService.calculateRatingOnAdd(productId, reviewId, newRating)
          break
        case 'update':
          if (!newRating || !oldRating) {
            break
          }
          hasProcessed = await reviewScoringService.calculateRatingOnUpdate(productId, reviewId, newRating, oldRating)
          break
        case 'delete':
          if (!oldRating) {
            break
          }
          hasProcessed = await reviewScoringService.calculateRatingOnDelete(productId, reviewId, oldRating)
          break
        default:
          logger.error('Invalid message type')
          break
      }

      if (!hasProcessed) {
        logger.error(`Failed to process efficiently for message ${message}. Recalculating the whole rating`)
        await retryHeavyRatingCalculation(productId)
        return
      }

      const processingQueueCacheValueAfterProcessing = await redisCache.get(processingCacheKey)
      if (processingQueueCacheValueAfterProcessing) {
        const processingQueueAfterProcessing = JSON.parse(processingQueueCacheValueAfterProcessing) as string[]
        const index = processingQueueAfterProcessing.indexOf(timestamp.toString())
        if (index !== -1) {
          processingQueueAfterProcessing.splice(index, 1)
          if (processingQueueAfterProcessing.length === 0) {
            await redisCache.del(processingCacheKey)
            logger.info(`Finished processing message for product ${productId}, timestamp ${timestamp}`)
            return
          } else {
            // recalculate the whole review rating until no more messages are coming to the queue
            await retryHeavyRatingCalculation(productId)
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

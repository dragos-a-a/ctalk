import { REDIS_REVIEW_CHANNEL_NAME } from '@common/generic/utils/constants'
import { env } from '@common/generic/utils/envConfig'
import Redis from 'ioredis'
import mysql from 'mysql2/promise'
import { pino } from 'pino'

import { getReviewScoringService } from './api/reviewScoringService'

const logger = pino({ name: 'server start' })
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
const redisSubscriber = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
})

redisSubscriber.on('connect', () => {
  logger.info('Connected to Redis as subscriber')
})

redisSubscriber.on('error', (error) => {
  logger.error('Failed to connect to Redis as subscriber:', error)
})

const redisCache = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
})

redisCache.on('connect', () => {
  logger.info('Connected to Redis as cache!')
})

redisCache.on('error', (error) => {
  logger.error('Failed to connect to Redis as cache:', error)
})

redisSubscriber.subscribe(REDIS_REVIEW_CHANNEL_NAME, (err, count) => {
  if (err) {
    logger.error('Failed to subscribe to review channel:', err)
  } else {
    logger.info(`Subscribed to review channel. ${count} total subscriptions`)
  }
})

const reviewScoringService = getReviewScoringService(pool, redisCache)

redisSubscriber.on('message', async (channel, message) => {
  logger.info(`Received message from ${channel}: ${message}`)
  if (channel === REDIS_REVIEW_CHANNEL_NAME) {
    let data
    try {
      data = JSON.parse(message)
    } catch (err) {
      logger.error('Failed to parse message:', err)
    }
    // TODO: implement / switch
    reviewScoringService.calculateScoreOnAdd(data.productId, data.reviewId)
  }
})

export { logger }

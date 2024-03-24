import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { healthCheckRouter } from '@common/api/healthCheck/healthCheckRouter'
import { getOpenAPIRouter } from '@common/api-docs/openAPIRouter'
import errorHandler from '@common/generic/middleware/errorHandler'
import { getRateLimiter } from '@common/generic/middleware/rateLimiter'
import requestLogger from '@common/generic/middleware/requestLogger'
import { env } from '@common/generic/utils/envConfig'
import cors from 'cors'
import express, { Express } from 'express'
import helmet from 'helmet'
import mysql from 'mysql2/promise'
import { pino } from 'pino'

import { initDb } from '../scripts/initDb'
import { getProductRouter } from './api/routers/productRouter'
import { getReviewRouter } from './api/routers/reviewRouter'

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

initDb(pool)
const openApiRegistry = new OpenAPIRegistry()

const app: Express = express()

// Set the application to trust the reverse proxy
app.set('trust proxy', true)

// Middlewares
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(helmet())
app.use(getRateLimiter(logger))

// Add body-parser middleware
app.use(express.json())

// Request logging
app.use(requestLogger())

// Routes
app.use('/health-check', healthCheckRouter)
app.use('/products', getProductRouter(pool, openApiRegistry))
app.use('/reviews', getReviewRouter(pool, openApiRegistry))

// Swagger UI
app.use(getOpenAPIRouter(openApiRegistry))

// Error handlers
app.use(errorHandler())

export { app, logger, pool }

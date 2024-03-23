import { healthCheckRouter } from '@common/api/healthCheck/healthCheckRouter'
import { getOpenAPIRouter } from '@common/api-docs/openAPIRouter'
import errorHandler from '@common/generic/middleware/errorHandler'
import { getRateLimiter } from '@common/generic/middleware/rateLimiter'
import requestLogger from '@common/generic/middleware/requestLogger'
import { env } from '@common/generic/utils/envConfig'
import cors from 'cors'
import express, { Express } from 'express'
import helmet from 'helmet'
import { pino } from 'pino'

import { reviewScoringRegistry, reviewScoringRouter } from './api/reviewScoringRouter'

const logger = pino({ name: 'server start' })
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
app.use('/review-scoring', reviewScoringRouter)

// Swagger UI
app.use(getOpenAPIRouter(reviewScoringRegistry))

// Error handlers
app.use(errorHandler())

export { app, logger }

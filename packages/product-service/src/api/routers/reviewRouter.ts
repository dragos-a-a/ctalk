import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { createApiResponse } from '@common/api-docs/openAPIResponseBuilders'
import { handleServiceResponse, validateRequest } from '@common/generic/utils/httpHandlers'
import express, { Request, Response, Router } from 'express'
import { Redis } from 'ioredis'
import { Pool } from 'mysql2/promise'
import { z } from 'zod'

import {
  GetReviewSchema,
  PostReviewSchema,
  PutReviewSchema,
  ReviewCreate,
  ReviewCreateSchema,
  ReviewSchema,
  ReviewUpdateSchema,
} from '../models/reviewModel'
import { getReviewService } from '../services/reviewService'

export const getReviewRouter = (pool: Pool, redis: Redis, openApiRegistry: OpenAPIRegistry): Router => {
  const router = express.Router()
  const reviewService = getReviewService(pool, redis)

  openApiRegistry.register('Review', ReviewSchema)
  openApiRegistry.register('Review Create', ReviewCreateSchema)
  openApiRegistry.register('Review Update', PutReviewSchema)

  openApiRegistry.registerPath({
    method: 'get',
    path: '/reviews',
    tags: ['Review'],
    responses: createApiResponse(z.array(ReviewSchema), 'Success'),
  })

  router.get('/', async (_req: Request, res: Response) => {
    const serviceResponse = await reviewService.findAll()
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'get',
    path: '/reviews/{id}',
    tags: ['Review'],
    request: { params: GetReviewSchema.shape.params },
    responses: createApiResponse(ReviewSchema, 'Success'),
  })

  router.get('/:id', validateRequest(GetReviewSchema), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10)
    const serviceResponse = await reviewService.findById(id)
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'post',
    path: '/reviews/{productId}',
    tags: ['Review'],
    request: {
      params: PostReviewSchema.shape.params,
      body: {
        content: {
          'application/json': {
            schema: ReviewCreateSchema,
          },
        },
      },
    },
    responses: createApiResponse(z.number(), 'Success'),
  })

  router.post('/:productId', validateRequest(PostReviewSchema), async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId as string, 10)
    const serviceResponse = await reviewService.create(productId, req.body as ReviewCreate)
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'put',
    path: '/reviews/{id}',
    tags: ['Review'],
    request: {
      params: GetReviewSchema.shape.params,
      body: {
        content: {
          'application/json': {
            schema: ReviewUpdateSchema,
          },
        },
      },
    },
    responses: createApiResponse(z.boolean(), 'Success'),
  })

  router.put('/:id', validateRequest(PutReviewSchema), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10)
    const serviceResponse = await reviewService.update(id, req.body as ReviewCreate)
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'delete',
    path: '/reviews/{id}',
    tags: ['Review'],
    request: { params: GetReviewSchema.shape.params },
    responses: createApiResponse(z.boolean(), 'Success'),
  })

  router.delete('/:id', validateRequest(GetReviewSchema), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10)
    const serviceResponse = await reviewService.delete(id)
    handleServiceResponse(serviceResponse, res)
  })

  return router
}

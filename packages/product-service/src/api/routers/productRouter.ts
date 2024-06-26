import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { createApiResponse } from '@common/api-docs/openAPIResponseBuilders'
import { handleServiceResponse, validateRequest } from '@common/generic/utils/httpHandlers'
import express, { Request, Response, Router } from 'express'
import { Redis } from 'ioredis'
import { Pool } from 'mysql2/promise'
import { z } from 'zod'

import {
  GetProductSchema,
  PostProductSchema,
  ProductCreate,
  ProductCreateSchema,
  ProductSchema,
  PutProductSchema,
} from '../models/productModel'
import { ReviewSchema } from '../models/reviewModel'
import { getProductService } from '../services/productService'
import { getReviewService } from '../services/reviewService'

export const getProductRouter = (pool: Pool, redis: Redis, openApiRegistry: OpenAPIRegistry): Router => {
  const router = express.Router()
  const productService = getProductService(pool, redis)
  const reviewService = getReviewService(pool, redis)

  openApiRegistry.register('Product', ProductSchema)
  openApiRegistry.register('Product Create', ProductCreateSchema)
  openApiRegistry.register('Product Update', PutProductSchema)

  openApiRegistry.registerPath({
    method: 'get',
    path: '/products',
    tags: ['Product'],
    responses: createApiResponse(z.array(ProductSchema), 'Success'),
  })

  router.get('/', async (_req: Request, res: Response) => {
    const serviceResponse = await productService.findAll()
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'get',
    path: '/products/{id}',
    tags: ['Product'],
    request: { params: GetProductSchema.shape.params },
    responses: createApiResponse(ProductSchema, 'Success'),
  })

  router.get('/:id', validateRequest(GetProductSchema), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10)
    const serviceResponse = await productService.findById(id)
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'post',
    path: '/products',
    tags: ['Product'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: ProductCreateSchema,
          },
        },
      },
    },
    responses: createApiResponse(z.number(), 'Success'),
  })

  router.post('/', validateRequest(PostProductSchema), async (req: Request, res: Response) => {
    const serviceResponse = await productService.create(req.body as ProductCreate)
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'put',
    path: '/products/{id}',
    tags: ['Product'],
    request: {
      params: GetProductSchema.shape.params,
      body: {
        content: {
          'application/json': {
            schema: ProductCreateSchema,
          },
        },
      },
    },
    responses: createApiResponse(z.boolean(), 'Success'),
  })

  router.put('/:id', validateRequest(PutProductSchema), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10)
    const serviceResponse = await productService.update(id, req.body as ProductCreate)
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'delete',
    path: '/products/{id}',
    tags: ['Product'],
    request: { params: GetProductSchema.shape.params },
    responses: createApiResponse(z.boolean(), 'Success'),
  })

  router.delete('/:id', validateRequest(GetProductSchema), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10)
    const serviceResponse = await productService.delete(id)
    handleServiceResponse(serviceResponse, res)
  })

  openApiRegistry.registerPath({
    method: 'get',
    path: '/products/{id}/reviews',
    tags: ['Product'],
    request: { params: GetProductSchema.shape.params },
    responses: createApiResponse(z.array(ReviewSchema), 'Success'),
  })

  router.get('/:id/reviews', validateRequest(GetProductSchema), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10)
    const serviceResponse = await reviewService.findByProductId(id)
    handleServiceResponse(serviceResponse, res)
  })

  return router
}

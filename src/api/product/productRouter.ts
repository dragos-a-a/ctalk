import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import express, { Request, Response, Router } from 'express'
import { z } from 'zod'

import { GetProductSchema, ProductSchema } from '@/api/product/productModel'
import { productService } from '@/api/product/productService'
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders'
import { handleServiceResponse, validateRequest } from '@/common/utils/httpHandlers'

export const productRegistry = new OpenAPIRegistry()

productRegistry.register('Product', ProductSchema)

export const productRouter: Router = (() => {
  const router = express.Router()

  productRegistry.registerPath({
    method: 'get',
    path: '/products',
    tags: ['Product'],
    responses: createApiResponse(z.array(ProductSchema), 'Success'),
  })

  router.get('/', async (_req: Request, res: Response) => {
    const serviceResponse = await productService.findAll()
    handleServiceResponse(serviceResponse, res)
  })

  productRegistry.registerPath({
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

  return router
})()

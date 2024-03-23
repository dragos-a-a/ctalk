import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { createApiResponse } from '@common/api-docs/openAPIResponseBuilders'
import { handleServiceResponse, validateRequest } from '@common/generic/utils/httpHandlers'
import express, { Request, Response, Router } from 'express'
import { z } from 'zod'

import { PostReviewScoringSchema } from './reviewScoringModel'
import { reviewScoringService } from './reviewScoringService'

export const reviewScoringRegistry = new OpenAPIRegistry()

export const reviewScoringRouter: Router = (() => {
  const router = express.Router()

  reviewScoringRegistry.registerPath({
    method: 'post',
    path: '/review-scoring/add/{productId}',
    tags: ['Review Scoring'],
    request: {
      params: PostReviewScoringSchema.shape.params,
      body: {
        content: {
          'application/json': {
            schema: z.object({ reviewId: z.number() }),
          },
        },
      },
    },
    responses: createApiResponse(z.boolean(), 'Success'),
  })

  router.post('/add/:productId', validateRequest(PostReviewScoringSchema), async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId as string, 10)
    const reviewId = req.body.reviewId
    const serviceResponse = await reviewScoringService.calculateScoreOnAdd(productId, reviewId)
    handleServiceResponse(serviceResponse, res)
  })

  return router
})()

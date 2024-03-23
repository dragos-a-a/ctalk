import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { commonValidations } from '@common/generic/utils/commonValidation'
import { z } from 'zod'

extendZodWithOpenApi(z)

export type Review = z.infer<typeof ReviewSchema>
export const ReviewSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  reviewText: z.string(),
  rating: z.number(),
})

// Input Validation for 'GET reviews/:id' endpoint
export const GetReviewSchema = z.object({
  params: z.object({ id: commonValidations.id }),
})

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { commonValidations } from '@common/generic/utils/commonValidation'
import { z } from 'zod'

extendZodWithOpenApi(z)

export type Product = z.infer<typeof ProductSchema>
export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  reviewIds: z.array(z.number()),
  avgReviewRating: z.number(),
})

// Input Validation for 'GET products/:id' endpoint
export const GetProductSchema = z.object({
  params: z.object({ id: commonValidations.id }),
})

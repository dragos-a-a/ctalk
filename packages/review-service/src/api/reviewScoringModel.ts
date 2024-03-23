import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { commonValidations } from '@common/generic/utils/commonValidation'
import { z } from 'zod'

extendZodWithOpenApi(z)

// Input Validation for endpoints
export const PostReviewScoringSchema = z.object({
  params: z.object({ productId: commonValidations.id }),
  body: z.object({ reviewId: commonValidations.id }),
})

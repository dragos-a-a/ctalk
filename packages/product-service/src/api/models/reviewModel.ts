import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { commonValidations } from '@common/generic/utils/commonValidation'
import { z } from 'zod'

extendZodWithOpenApi(z)

export type Review = z.infer<typeof ReviewSchema>
export type ReviewCreate = z.infer<typeof ReviewCreateSchema>
export type ReviewUpdate = z.infer<typeof ReviewUpdateSchema>

export const ReviewUpdateSchema = z.object({
  rating: z.number(),
  reviewText: z.string(),
})

export const ReviewCreateSchema = ReviewUpdateSchema.merge(
  z.object({
    firstName: z.string(),
    lastName: z.string(),
  })
)

export const ReviewSchema = ReviewCreateSchema.merge(
  z.object({
    id: z.number(),
    productId: z.number(),
  })
)

// Input Validation for 'GET reviews/:id' endpoint
export const GetReviewSchema = z.object({
  params: z.object({ id: commonValidations.id }),
})

const updateFieldsValidation = {
  reviewText: z
    .string()
    .refine((reviewText) => reviewText.length > 0, { message: 'Review description must not be empty' }),
  rating: z.number().refine((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5, {
    message: 'Rating must be a whole number between 1 and 5',
  }),
}

// Input Validation for 'POST reviews' endpoint
export const PostReviewSchema = z.object({
  params: z.object({ productId: commonValidations.id }),
  body: z.object({
    firstName: z.string().refine((firstName) => firstName.length > 0, { message: 'First name must not be empty' }),
    lastName: z.string().refine((lastName) => lastName.length > 0, { message: 'Last name must not be empty' }),
    ...updateFieldsValidation,
  }),
})

// Input Validation for 'PUT reviews/:id' endpoint
export const PutReviewSchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: z.object(updateFieldsValidation),
})

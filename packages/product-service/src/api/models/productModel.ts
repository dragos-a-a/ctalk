import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { commonValidations } from '@common/generic/utils/commonValidation'
import { z } from 'zod'

extendZodWithOpenApi(z)

export type Product = z.infer<typeof ProductSchema>
export type ProductCreate = z.infer<typeof ProductCreateSchema>
export type ProductReviewIdsPopulated = z.infer<typeof ProductReviewIdsSchema>

export const ProductCreateSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
})

export const ProductSchema = ProductCreateSchema.merge(
  z.object({
    id: z.number(),
    avgReviewRating: z.number(),
  })
)

const ProductReviewIdsSchema = ProductSchema.merge(
  z.object({
    reviewIds: z.array(z.number()),
  })
)

// Input Validation for 'GET products/:id' endpoint
export const GetProductSchema = z.object({
  params: z.object({ id: commonValidations.id }),
})

const updateFieldsValidation = z.object({
  name: z.string().refine((name) => name.length > 3, { message: 'Name must have at least 3 characters' }),
  description: z.string().refine((description) => description.length > 0, { message: 'Description must not be empty' }),
  price: z.number().refine((price) => price > 0, { message: 'Price must be greater than 0' }),
})

// Input Validation for 'POST products' endpoint
export const PostProductSchema = z.object({
  body: updateFieldsValidation,
})

// Input Validation for 'PUT products/:id' endpoint
export const PutProductSchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: updateFieldsValidation,
})

import { ResponseStatus, ServiceResponse } from '@common/generic/models/serviceResponse'
import { REDIS_REVIEW_CHANNEL_NAME } from '@common/generic/utils/constants'
import { StatusCodes } from 'http-status-codes'
import { Redis } from 'ioredis'
import { Pool } from 'mysql2/promise'

import { logger } from '../../server'
import { Review, ReviewCreate, ReviewUpdate } from '../models/reviewModel'
import { getProductRepository } from '../repositories/productRepository'
import { getProductReviewsRepository } from '../repositories/productReviewsRepository'
import { getReviewRepository } from '../repositories/reviewRepository'

export const getReviewService = (pool: Pool, redis: Redis) => {
  const reviewRepository = getReviewRepository(pool)
  const productRepository = getProductRepository(pool)
  const productReviewsRepository = getProductReviewsRepository(pool)

  const publishReviewUpdate = async (params: {
    productId: number
    reviewId: number
    type: 'add' | 'update' | 'delete'
    oldRating?: number
    newRating?: number
  }) => {
    redis.publish(REDIS_REVIEW_CHANNEL_NAME, JSON.stringify(params))
  }

  const getReviewCacheKey = (id: number) => `review:${id}`
  const getProductReviewCacheKey = (productId: number) => `product:${productId}:reviews`
  const getProductCacheKey = (id: number) => `product:${id}`
  const cacheDuration = 60 * 60 // 1 hour

  return {
    findAll: async (): Promise<ServiceResponse<Review[] | null>> => {
      try {
        const reviews = await reviewRepository.findAllAsync()
        if (!reviews || reviews.length === 0) {
          return new ServiceResponse(ResponseStatus.Failed, 'No Reviews found', null, StatusCodes.NOT_FOUND)
        }
        return new ServiceResponse<Review[]>(ResponseStatus.Success, 'Reviews found', reviews, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error finding all reviews: $${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    findById: async (id: number): Promise<ServiceResponse<Review | null>> => {
      try {
        const cacheKey = getReviewCacheKey(id)
        const cachedReview = await redis.get(cacheKey)
        if (cachedReview) {
          const result = JSON.parse(cachedReview) as Review
          return new ServiceResponse<Review>(ResponseStatus.Success, 'Review found', result, StatusCodes.OK)
        }

        const review = await reviewRepository.findByIdAsync(id)
        if (!review) {
          return new ServiceResponse(ResponseStatus.Failed, 'Review not found', null, StatusCodes.NOT_FOUND)
        }

        await redis.set(cacheKey, JSON.stringify(review), 'EX', cacheDuration)

        return new ServiceResponse<Review>(ResponseStatus.Success, 'Review found', review, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error finding review with id ${id}:, ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    findByProductId: async (productId: number): Promise<ServiceResponse<Review[] | null>> => {
      try {
        const cacheKey = getProductReviewCacheKey(productId)
        const cachedReviews = await redis.get(cacheKey)
        if (cachedReviews) {
          const result = JSON.parse(cachedReviews) as Review[]
          return new ServiceResponse<Review[]>(ResponseStatus.Success, 'Reviews found', result, StatusCodes.OK)
        }
        const reviews = await reviewRepository.findByProductIdAsync(productId)
        if (!reviews || reviews.length === 0) {
          return new ServiceResponse(ResponseStatus.Failed, 'No reviews found', null, StatusCodes.NOT_FOUND)
        }
        await redis.set(cacheKey, JSON.stringify(reviews), 'EX', cacheDuration)
        return new ServiceResponse<Review[]>(ResponseStatus.Success, 'Reviews found', reviews, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error finding reviews with product id ${productId}:, ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    create: async (productId: number, review: ReviewCreate): Promise<ServiceResponse<number | null>> => {
      try {
        const foundProduct = await productRepository.findByIdWithoutReviewsAsync(productId)

        if (!foundProduct) {
          return new ServiceResponse(ResponseStatus.Failed, 'Product not found', null, StatusCodes.NOT_FOUND)
        }

        // TODO (out of scope): consider not allowing multiple reviews from same user

        const newReviewId = await reviewRepository.createAsync(review)
        if (!newReviewId) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Review not created',
            null,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }

        const hasAttachedReview = await productReviewsRepository.addProductReviewAsync(productId, newReviewId)
        if (!hasAttachedReview) {
          await reviewRepository.deleteByIdAsync(newReviewId)
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Review not attached to product',
            null,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }

        publishReviewUpdate({ productId, reviewId: newReviewId, type: 'add', newRating: review.rating })

        await Promise.all([
          redis.del(getProductReviewCacheKey(productId)),
          redis.del(getProductCacheKey(productId)), // invalidate avg rating
        ])

        return new ServiceResponse<number>(ResponseStatus.Success, 'Review created', newReviewId, StatusCodes.CREATED)
      } catch (ex) {
        const errorMessage = `Error creating review: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    update: async (id: number, review: ReviewUpdate): Promise<ServiceResponse<boolean>> => {
      try {
        const foundReview = await reviewRepository.findByIdAsync(id)

        if (!foundReview) {
          return new ServiceResponse(ResponseStatus.Failed, 'Review not found', false, StatusCodes.NOT_FOUND)
        }

        const hasUpdated = await reviewRepository.updateAsync(id, review)
        if (!hasUpdated) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Review not updated',
            false,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }

        publishReviewUpdate({
          productId: foundReview.productId,
          reviewId: id,
          type: 'update',
          oldRating: foundReview.rating,
          newRating: review.rating,
        })

        await Promise.all([
          redis.del(getReviewCacheKey(id)),
          redis.del(getProductReviewCacheKey(foundReview.productId)),
          redis.del(getProductCacheKey(foundReview.productId)), // invalidate avg rating
        ])

        return new ServiceResponse<boolean>(ResponseStatus.Success, 'Review updated', hasUpdated, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error updating review with id ${id}: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, false, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    delete: async (id: number): Promise<ServiceResponse<boolean>> => {
      try {
        const foundReview = await reviewRepository.findByIdAsync(id)

        if (!foundReview) {
          return new ServiceResponse(ResponseStatus.Failed, 'Review not found', false, StatusCodes.NOT_FOUND)
        }

        const hasDeletedProductReview = await productReviewsRepository.deleteProductReviewAsync(id)
        if (!hasDeletedProductReview) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Review not detached from product',
            false,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }

        const hasDeletedReview = await reviewRepository.deleteByIdAsync(id)
        if (!hasDeletedReview) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Review not deleted',
            false,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }

        publishReviewUpdate({
          productId: foundReview.productId,
          reviewId: id,
          type: 'delete',
          oldRating: foundReview.rating,
        })

        await Promise.all([
          redis.del(getReviewCacheKey(id)),
          redis.del(getProductReviewCacheKey(foundReview.productId)),
          redis.del(getProductCacheKey(foundReview.productId)), // invalidate avg rating
        ])

        return new ServiceResponse<boolean>(ResponseStatus.Success, 'Review deleted', hasDeletedReview, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error deleting review with id ${id}: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, false, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },
  }
}

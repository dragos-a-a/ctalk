import { ResponseStatus, ServiceResponse } from '@common/generic/models/serviceResponse'
import { StatusCodes } from 'http-status-codes'
import { Pool } from 'mysql2/promise'

import { logger } from '../../server'
import { Review, ReviewCreate, ReviewUpdate } from '../models/reviewModel'
import { getReviewRepository } from '../repositories/reviewRepository'

// TODO: enhance with product relationships
export const getReviewService = (pool: Pool) => {
  const reviewRepository = getReviewRepository(pool)
  return {
    findAll: async (): Promise<ServiceResponse<Review[] | null>> => {
      try {
        const reviews = await reviewRepository.findAllAsync()
        if (!reviews) {
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
        const review = await reviewRepository.findByIdAsync(id)
        if (!review) {
          return new ServiceResponse(ResponseStatus.Failed, 'Review not found', null, StatusCodes.NOT_FOUND)
        }
        return new ServiceResponse<Review>(ResponseStatus.Success, 'Review found', review, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error finding review with id ${id}:, ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    create: async (review: ReviewCreate): Promise<ServiceResponse<number | null>> => {
      try {
        const newReviewId = await reviewRepository.createAsync(review)
        if (!newReviewId) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Review not created',
            null,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }
        return new ServiceResponse<number>(ResponseStatus.Success, 'Review created', newReviewId, StatusCodes.CREATED)
      } catch (ex) {
        const errorMessage = `Error creating review: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    update: async (id: number, review: ReviewUpdate): Promise<ServiceResponse<boolean>> => {
      try {
        const foundItem = await reviewRepository.findByIdAsync(id)

        if (!foundItem) {
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
        return new ServiceResponse<boolean>(ResponseStatus.Success, 'Review updated', hasUpdated, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error updating review with id ${id}: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, false, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    delete: async (id: number): Promise<ServiceResponse<boolean>> => {
      try {
        const foundItem = await reviewRepository.findByIdAsync(id)

        if (!foundItem) {
          return new ServiceResponse(ResponseStatus.Failed, 'Review not found', false, StatusCodes.NOT_FOUND)
        }

        const hasDeleted = await reviewRepository.deleteByIdAsync(id)
        if (!hasDeleted) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Review not deleted',
            false,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }
        return new ServiceResponse<boolean>(ResponseStatus.Success, 'Review deleted', hasDeleted, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error deleting review with id ${id}: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, false, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },
  }
}

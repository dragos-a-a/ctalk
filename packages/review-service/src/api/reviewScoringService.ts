import { ResponseStatus, ServiceResponse } from '@common/generic/models/serviceResponse'
import { StatusCodes } from 'http-status-codes'

import { logger } from '../server'
import { reviewScoringRepository } from './reviewScoringRepository'

export const reviewScoringService = {
  calculateScoreOnAdd: async (productId: number, reviewId: number): Promise<ServiceResponse<boolean>> => {
    try {
      console.log(`Calculating review score on add for productId: ${productId} and reviewId: ${reviewId}`)
      // TODO: implement
      const result = await reviewScoringRepository.calculateScore()
      return new ServiceResponse<boolean>(ResponseStatus.Success, 'Review Scorings found', result, StatusCodes.OK)
    } catch (ex) {
      const errorMessage = `Error calculating review score on add for productId: ${productId}: $${(ex as Error).message}`
      logger.error(errorMessage)
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, false, StatusCodes.INTERNAL_SERVER_ERROR)
    }
  },
}

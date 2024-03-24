import { Redis } from 'ioredis'
import { Pool } from 'mysql2/promise'

import { logger } from '../server'
import { getReviewScoringRepository } from './reviewScoringRepository'

export const getReviewScoringService = (pool: Pool, redisCache: Redis) => {
  const reviewScoringRepository = getReviewScoringRepository(pool)

  return {
    calculateScoreOnAdd: async (productId: number, reviewId: number): Promise<boolean> => {
      try {
        logger.info(`Calculating review score on add for productId: ${productId} and reviewId: ${reviewId}`)
        const updatedAvgScore = await reviewScoringRepository.calculateScore()
        // TODO update in db
        // proper cache invalidation
        redisCache.del(`product:${productId}`)
        return true
      } catch (ex) {
        const errorMessage = `Error calculating review score on add for productId: ${productId}: $${(ex as Error).message}`
        logger.error(errorMessage)
        return false
      }
    },
  }
}

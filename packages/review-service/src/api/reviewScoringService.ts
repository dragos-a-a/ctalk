import { Redis } from 'ioredis'
import { Pool } from 'mysql2/promise'

import { logger } from '../server'
import { getReviewScoringRepository } from './reviewScoringRepository'

export const getReviewScoringService = (pool: Pool, redisCache: Redis) => {
  const reviewScoringRepository = getReviewScoringRepository(pool)

  return {
    calculateRatingOnAdd: async (productId: number, reviewId: number, newRating: number): Promise<boolean> => {
      // this handles the simple case where no other review work is happening on this product
      // if that does not happen (we get new reviews/ they get changed) we have a mechanism in place to recalculate all the reviews
      // (calculateFullRating) until there are no new reviews to process. That is slower though
      try {
        logger.info(`Calculating review rating on add for productId: ${productId} and reviewId: ${reviewId}`)
        const curentAvgReviewRating = await reviewScoringRepository.getAvgReviewRating(productId)
        const totalNumberOfReviews = await reviewScoringRepository.getNumberOfReviews(productId)
        if (curentAvgReviewRating === undefined) {
          logger.error(
            `Error calculating review rating on add for productId: ${productId}: no product found. Possibly product deleted in the mean time.`
          )
          return false
        }
        if (!totalNumberOfReviews) {
          // should have at least 1 review
          logger.error(
            `Error calculating review rating on add for productId: ${productId}: no review data found. Possible review got deleted in the mean time.`
          )
          return false
        }
        const updatedRating = (curentAvgReviewRating * (totalNumberOfReviews - 1) + newRating) / totalNumberOfReviews
        logger.info(
          `Updated rating for productId: ${productId} is ${updatedRating} from ${curentAvgReviewRating} by adding a new review rating ${newRating} with total ${totalNumberOfReviews} reviews`
        )

        await reviewScoringRepository.updateAvgReviewRating(productId, updatedRating)
        await redisCache.del(`product:${productId}`)

        return true
      } catch (ex) {
        const errorMessage = `Error calculating review rating on add for productId: ${productId}: $${(ex as Error).message}`
        logger.error(errorMessage)
        return false
      }
    },

    calculateRatingOnUpdate: async (
      productId: number,
      reviewId: number,
      newRating: number,
      oldRating: number
    ): Promise<boolean> => {
      try {
        logger.info(
          `Calculating review rating on update for productId: ${productId}, reviewId: ${reviewId}, newRating: ${newRating}, oldRating: ${oldRating}`
        )
        const curentAvgReviewRating = await reviewScoringRepository.getAvgReviewRating(productId)
        const totalNumberOfReviews = await reviewScoringRepository.getNumberOfReviews(productId)
        if (curentAvgReviewRating === undefined) {
          logger.error(
            `Error calculating review rating on update for productId: ${productId}: no product found. Possibly product deleted in the mean time.`
          )
          return false
        }
        if (!totalNumberOfReviews) {
          // should have at least 1 review
          logger.error(
            `Error calculating review rating on update for productId: ${productId}: no review data found. Possible review got deleted in the mean time.`
          )
          return false
        }

        const updatedRating =
          (curentAvgReviewRating * totalNumberOfReviews - oldRating + newRating) / totalNumberOfReviews
        logger.info(
          `Updated rating for productId: ${productId} is ${updatedRating} from ${curentAvgReviewRating} by updating review rating from ${oldRating} to ${newRating} with total ${totalNumberOfReviews} reviews`
        )

        const hasUpdated = await reviewScoringRepository.updateAvgReviewRating(productId, updatedRating)
        if (!hasUpdated) {
          logger.error(`Error updating review rating on update for productId: ${productId}`)
          return false
        }

        await redisCache.del(`product:${productId}`)

        return true
      } catch (ex) {
        const errorMessage = `Error calculating review rating on update for productId: ${productId}: $${(ex as Error).message}`
        logger.error(errorMessage)
        return false
      }
    },

    calculateRatingOnDelete: async (productId: number, reviewId: number, oldRating: number): Promise<boolean> => {
      try {
        logger.info(`Calculating review rating on delete for productId: ${productId} and reviewId: ${reviewId}`)
        const curentAvgReviewRating = await reviewScoringRepository.getAvgReviewRating(productId)
        const totalNumberOfReviews = await reviewScoringRepository.getNumberOfReviews(productId)
        if (curentAvgReviewRating === undefined) {
          logger.error(
            `Error calculating review rating on delete for productId: ${productId}: no product found. Possibly product deleted in the mean time.`
          )
          return false
        }
        if (!totalNumberOfReviews) {
          // should have at least 1 review
          logger.error(
            `Error calculating review rating on delete for productId: ${productId}: no review data found. Possible review got deleted in the mean time.`
          )
          return false
        }

        // TODO: fix math here to not divide by 0
        const updatedRating = (curentAvgReviewRating * totalNumberOfReviews - oldRating) / (totalNumberOfReviews - 1)
        logger.info(
          `Updated rating for productId: ${productId} is ${updatedRating} from ${curentAvgReviewRating} by deleting a review rating ${oldRating} with total ${totalNumberOfReviews} reviews`
        )

        const hasUpdated = await reviewScoringRepository.updateAvgReviewRating(productId, updatedRating)
        if (!hasUpdated) {
          logger.error(`Error updating review rating on delete for productId: ${productId}`)
          return false
        }

        await redisCache.del(`product:${productId}`)

        return true
      } catch (ex) {
        const errorMessage = `Error calculating review rating on delete for productId: ${productId}: $${(ex as Error).message}`
        logger.error(errorMessage)
        return false
      }
    },

    calculateFullRating: async (productId: number): Promise<boolean> => {
      try {
        logger.info(`Calculating full review rating for productId: ${productId}`)
        const ratings = await reviewScoringRepository.getAllReviewRatingsForProduct(productId)

        const updatedRating = ratings.reduce((acc, rating) => acc + rating, 0) / ratings.length
        logger.info(`Updated rating for productId: ${productId} is ${updatedRating} from ${ratings.length} reviews`)

        const hasUpdated = await reviewScoringRepository.updateAvgReviewRating(productId, updatedRating)
        if (!hasUpdated) {
          logger.error(`Error updating full review rating for productId: ${productId}`)
          return false
        }

        redisCache.del(`product:${productId}`)

        return hasUpdated
      } catch (ex) {
        const errorMessage = `Error calculating full review rating for productId: ${productId}: $${(ex as Error).message}`
        logger.error(errorMessage)
        return false
      }
    },
  }
}

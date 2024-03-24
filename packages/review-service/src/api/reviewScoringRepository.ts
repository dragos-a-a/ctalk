import { Pool } from 'mysql2/promise'

export const getReviewScoringRepository = (pool: Pool) => {
  return {
    calculateScore: async (): Promise<number> => {
      // TODO: implement
      return 3
    },
  }
}

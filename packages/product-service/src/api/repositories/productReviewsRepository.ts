import { Pool, ResultSetHeader } from 'mysql2/promise'

export const getProductReviewsRepository = (pool: Pool) => {
  return {
    addProductReviewAsync: async (productId: number, reviewId: number): Promise<boolean> => {
      const [result] = await pool.query('INSERT INTO productReviews (productId, reviewId) VALUES (?, ?)', [
        productId,
        reviewId,
      ])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },

    deleteProductReviewAsync: async (reviewId: number): Promise<boolean> => {
      const [result] = await pool.query('DELETE FROM productReviews WHERE reviewId = ?', [reviewId])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },

    deleteManyByProductIdAsync: async (productId: number): Promise<boolean> => {
      const [result] = await pool.query('DELETE FROM productReviews WHERE productId = ?', [productId])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },
  }
}

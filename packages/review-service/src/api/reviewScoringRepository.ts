import { Pool, ResultSetHeader } from 'mysql2/promise'

export const getReviewScoringRepository = (pool: Pool) => {
  return {
    updateAvgReviewRating: async (productId: number, newReviewRating: number): Promise<boolean> => {
      const [result] = await pool.query('UPDATE products SET avgReviewRating = ? WHERE id = ?', [
        newReviewRating,
        productId,
      ])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },

    getAvgReviewRating: async (productId: number): Promise<number | undefined> => {
      const [rows] = await pool.query('SELECT avgReviewRating FROM products WHERE id = ?', [productId])
      if (Array.isArray(rows) && rows.length > 0) {
        return (rows[0] as any).avgReviewRating ?? 0
      }
    },

    getNumberOfReviews: async (productId: number): Promise<number | undefined> => {
      const [rows] = await pool.query('SELECT COUNT(*) as count FROM productReviews WHERE productId = ?', [productId])
      if (Array.isArray(rows) && rows.length > 0) {
        return (rows[0] as any).count
      }
    },

    getAllReviewRatingsForProduct: async (productId: number): Promise<number[]> => {
      const [rows] = await pool.query(
        `SELECT r.rating FROM productReviews pr JOIN reviews r ON pr.reviewId = r.id WHERE pr.productId = ?`,
        [productId]
      )
      if (Array.isArray(rows) && rows.length > 0) {
        return (rows as any).map((row: any) => row.rating)
      }
      return []
    },
  }
}

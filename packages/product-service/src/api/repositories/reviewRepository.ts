import { Pool, ResultSetHeader } from 'mysql2/promise'

import { Review, ReviewCreate, ReviewUpdate } from '../models/reviewModel'

export const getReviewRepository = (pool: Pool) => {
  return {
    findAllAsync: async (): Promise<Review[]> => {
      const [rows] = await pool.query(
        'SELECT r.*, pr.productId FROM reviews r LEFT JOIN productReviews pr ON r.id = pr.reviewId'
      )
      let result: Review[] = []
      if (rows) {
        result = rows as Review[]
      }
      return result
    },

    findByIdAsync: async (id: number): Promise<Review | undefined> => {
      const [rows] = await pool.query(
        'SELECT r.*, pr.productId FROM reviews r LEFT JOIN productReviews pr ON r.id = pr.reviewId WHERE r.id = ?',
        [id]
      )
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as Review
      }
    },

    findByProductIdAsync: async (productId: number): Promise<Review[]> => {
      const [rows] = await pool.query(
        'SELECT r.*, pr.productId FROM reviews r LEFT JOIN productReviews pr ON r.id = pr.reviewId WHERE pr.productId = ?',
        [productId]
      )
      let result: Review[] = []
      if (rows) {
        result = rows as Review[]
      }
      return result
    },

    createAsync: async (review: ReviewCreate): Promise<number | undefined> => {
      const [result] = await pool.query(
        'INSERT INTO reviews (firstName, lastName, reviewText, rating) VALUES (?, ?, ?, ?)',
        [review.firstName, review.lastName, review.reviewText, review.rating]
      )
      if (result) {
        return (result as ResultSetHeader).insertId
      }
    },

    updateAsync: async (id: number, review: ReviewUpdate): Promise<boolean> => {
      const [result] = await pool.query('UPDATE reviews SET reviewText = ?, rating = ? WHERE id = ?', [
        review.reviewText,
        review.rating,
        id,
      ])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },

    deleteByIdAsync: async (id: number): Promise<boolean> => {
      const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [id])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },

    deleteManyByIdsAsync: async (ids: number[]): Promise<boolean> => {
      const [result] = await pool.query('DELETE FROM reviews WHERE id IN (?)', [ids])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },
  }
}

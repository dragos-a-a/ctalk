import { Pool, ResultSetHeader } from 'mysql2/promise'

import { Product, ProductCreate, ProductReviewIdsPopulated } from '../models/productModel'

export const getProductRepository = (pool: Pool) => {
  return {
    findAllWithoutReviewsAsync: async (): Promise<Product[]> => {
      const [rows] = await pool.query('SELECT * FROM products')
      let result: Product[] = []
      if (rows) {
        result = rows as Product[]
      }
      return result
    },

    findByIdWithoutReviewsAsync: async (id: number): Promise<Product | undefined> => {
      const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id])
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as Product
      }
    },

    findByIdIncludingReviewIdsAsync: async (id: number): Promise<ProductReviewIdsPopulated | undefined> => {
      const [rows] = await pool.query(
        'SELECT p.*, pr.reviewId FROM products p LEFT JOIN productReviews pr ON p.id = pr.productId WHERE p.id = ?',
        [id]
      )
      if (Array.isArray(rows) && rows.length > 0) {
        const product = rows[0] as ProductReviewIdsPopulated
        product.reviewIds = rows.map((row: any) => row.reviewId)

        return product
      }
    },

    createAsync: async (product: ProductCreate): Promise<number | undefined> => {
      const [result] = await pool.query('INSERT INTO products (name, description, price) VALUES (?, ?, ?)', [
        product.name,
        product.description,
        product.price,
      ])
      if (result) {
        return (result as ResultSetHeader).insertId
      }
    },

    updateAsync: async (id: number, product: ProductCreate): Promise<boolean> => {
      const [result] = await pool.query('UPDATE products SET name = ?, description = ?, price = ? WHERE id = ?', [
        product.name,
        product.description,
        product.price,
        id,
      ])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },

    deleteByIdAsync: async (id: number): Promise<boolean> => {
      const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id])
      return !!(result && (result as ResultSetHeader).affectedRows)
    },
  }
}

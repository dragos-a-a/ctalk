import { Pool } from 'mysql2/promise'

import { Product } from './models/productModel'

export const getProductRepository = (pool: Pool) => {
  return {
    findAllAsync: async (): Promise<Product[]> => {
      const [rows] = await pool.query('SELECT * FROM products')
      let result: Product[] = []
      if (rows) {
        result = rows as Product[]
      }
      return result
    },

    findByIdAsync: async (id: number): Promise<Product | undefined> => {
      const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id])
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as Product
      }
    },
  }
}

import { Product } from './models/productModel'

export const products: Product[] = [
  {
    id: 1,
    name: 'IPhone 14 PRO',
    description: 'One popular mobile phone',
    price: 1000,
    reviewIds: [1, 2],
    avgReviewRating: 4.5,
  },
  {
    id: 2,
    name: 'Samsung Galaxy S22',
    description: 'Another popular mobile phone',
    price: 900,
    reviewIds: [3, 4],
    avgReviewRating: 4.0,
  },
]

export const productRepository = {
  findAllAsync: async (): Promise<Product[]> => {
    return products
  },

  findByIdAsync: async (id: number): Promise<Product | null> => {
    return products.find((product) => product.id === id) || null
  },
}

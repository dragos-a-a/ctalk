import { StatusCodes } from 'http-status-codes'
import { Mock } from 'vitest'

import { Product } from '../productModel'
import { productRepository } from '../productRepository'
import { productService } from '../productService'

vi.mock('../productRepository')
vi.mock('../../server', () => ({
  ...vi.importActual('../../server'),
  logger: {
    error: vi.fn(),
  },
}))

describe('productService', () => {
  const mockProducts: Product[] = [
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

  const mockFindAll = productRepository.findAllAsync as Mock
  const mockFindById = productRepository.findByIdAsync as Mock

  describe('findAll', () => {
    it('return all products', async () => {
      // Arrange
      mockFindAll.mockReturnValue(mockProducts)

      // Act
      const result = await productService.findAll()

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.OK)
      expect(result.success).toBeTruthy()
      expect(result.message).toContain('Products found')
      expect(result.responseObject).toEqual(mockProducts)
    })

    it('returns a not found error for no products found', async () => {
      // Arrange
      mockFindAll.mockReturnValue(null)

      // Act
      const result = await productService.findAll()

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.NOT_FOUND)
      expect(result.success).toBeFalsy()
      expect(result.message).toContain('No Products found')
      expect(result.responseObject).toBeNull()
    })

    it('handles errors for findAllAsync', async () => {
      // Arrange
      mockFindAll.mockRejectedValue(new Error('Database error'))

      // Act
      const result = await productService.findAll()

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR)
      expect(result.success).toBeFalsy()
      expect(result.message).toContain('Error finding all products')
      expect(result.responseObject).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns a product for a valid ID', async () => {
      // Arrange
      const testId = 1
      const mockProduct = mockProducts.find((product) => product.id === testId)
      mockFindById.mockReturnValue(mockProduct)

      // Act
      const result = await productService.findById(testId)

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.OK)
      expect(result.success).toBeTruthy()
      expect(result.message).toContain('Product found')
      expect(result.responseObject).toEqual(mockProduct)
    })

    it('handles errors for findByIdAsync', async () => {
      // Arrange
      const testId = 1
      mockFindById.mockRejectedValue(new Error('Database error'))

      // Act
      const result = await productService.findById(testId)

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR)
      expect(result.success).toBeFalsy()
      expect(result.message).toContain(`Error finding product with id ${testId}`)
      expect(result.responseObject).toBeNull()
    })

    it('returns a not found error for non-existent ID', async () => {
      // Arrange
      const testId = 1
      mockFindById.mockReturnValue(null)

      // Act
      const result = await productService.findById(testId)

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.NOT_FOUND)
      expect(result.success).toBeFalsy()
      expect(result.message).toContain('Product not found')
      expect(result.responseObject).toBeNull()
    })
  })
})

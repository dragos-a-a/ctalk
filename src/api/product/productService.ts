import { StatusCodes } from 'http-status-codes'

import { Product } from '@/api/product/productModel'
import { productRepository } from '@/api/product/productRepository'
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse'
import { logger } from '@/server'

export const productService = {
  // Retrieves all products from the database
  findAll: async (): Promise<ServiceResponse<Product[] | null>> => {
    try {
      const products = await productRepository.findAllAsync()
      if (!products) {
        return new ServiceResponse(ResponseStatus.Failed, 'No Products found', null, StatusCodes.NOT_FOUND)
      }
      return new ServiceResponse<Product[]>(ResponseStatus.Success, 'Products found', products, StatusCodes.OK)
    } catch (ex) {
      const errorMessage = `Error finding all products: $${(ex as Error).message}`
      logger.error(errorMessage)
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
    }
  },

  // Retrieves a single product by their ID
  findById: async (id: number): Promise<ServiceResponse<Product | null>> => {
    try {
      const product = await productRepository.findByIdAsync(id)
      if (!product) {
        return new ServiceResponse(ResponseStatus.Failed, 'Product not found', null, StatusCodes.NOT_FOUND)
      }
      return new ServiceResponse<Product>(ResponseStatus.Success, 'Product found', product, StatusCodes.OK)
    } catch (ex) {
      const errorMessage = `Error finding product with id ${id}:, ${(ex as Error).message}`
      logger.error(errorMessage)
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
    }
  },
}

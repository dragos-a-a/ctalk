import { ResponseStatus, ServiceResponse } from '@common/generic/models/serviceResponse'
import { StatusCodes } from 'http-status-codes'
import { Pool } from 'mysql2/promise'

import { logger } from '../../server'
import { Product, ProductCreate } from '../models/productModel'
import { getProductRepository } from '../repositories/productRepository'

export const getProductService = (pool: Pool) => {
  const productRepository = getProductRepository(pool)
  return {
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

    create: async (product: ProductCreate): Promise<ServiceResponse<number | null>> => {
      try {
        const newProductId = await productRepository.createAsync(product)
        if (!newProductId) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Product not created',
            null,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }
        return new ServiceResponse<number>(ResponseStatus.Success, 'Product created', newProductId, StatusCodes.CREATED)
      } catch (ex) {
        const errorMessage = `Error creating product: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    update: async (id: number, product: ProductCreate): Promise<ServiceResponse<boolean>> => {
      try {
        const foundItem = await productRepository.findByIdAsync(id)

        if (!foundItem) {
          return new ServiceResponse(ResponseStatus.Failed, 'Product not found', false, StatusCodes.NOT_FOUND)
        }

        const hasUpdated = await productRepository.updateAsync(id, product)
        if (!hasUpdated) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Product not updated',
            false,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }
        return new ServiceResponse<boolean>(ResponseStatus.Success, 'Product updated', hasUpdated, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error updating product with id ${id}: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, false, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },

    delete: async (id: number): Promise<ServiceResponse<boolean>> => {
      try {
        const foundItem = await productRepository.findByIdAsync(id)

        if (!foundItem) {
          return new ServiceResponse(ResponseStatus.Failed, 'Product not found', false, StatusCodes.NOT_FOUND)
        }

        const hasDeleted = await productRepository.deleteByIdAsync(id)
        if (!hasDeleted) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            'Product not deleted',
            false,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        }
        return new ServiceResponse<boolean>(ResponseStatus.Success, 'Product deleted', hasDeleted, StatusCodes.OK)
      } catch (ex) {
        const errorMessage = `Error deleting product with id ${id}: ${(ex as Error).message}`
        logger.error(errorMessage)
        return new ServiceResponse(ResponseStatus.Failed, errorMessage, false, StatusCodes.INTERNAL_SERVER_ERROR)
      }
    },
  }
}
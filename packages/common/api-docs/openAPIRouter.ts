import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import express, { Request, Response, Router } from 'express'
import swaggerUi from 'swagger-ui-express'

import { generateOpenAPIDocument } from './openAPIDocumentGenerator'

export const getOpenAPIRouter = (apiRegistry: OpenAPIRegistry): Router => {
  const router = express.Router()
  const openAPIDocument = generateOpenAPIDocument(apiRegistry)

  router.get('/swagger.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(openAPIDocument)
  })

  router.use('/', swaggerUi.serve, swaggerUi.setup(openAPIDocument))

  return router
}

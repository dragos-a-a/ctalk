import { logger } from './src/server'

const onCloseSignal = () => {
  logger.info('sigint received, shutting down')
  process.exit()
}

process.on('SIGINT', onCloseSignal)
process.on('SIGTERM', onCloseSignal)

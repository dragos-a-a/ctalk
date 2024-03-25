import { logger } from './src/orchestrator'

const onCloseSignal = () => {
  logger.info('sigint received, shutting down')
  process.exit()
}

process.on('SIGINT', onCloseSignal)
process.on('SIGTERM', onCloseSignal)

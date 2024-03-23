import dotenv from 'dotenv'
import { cleanEnv, host, num, port, str } from 'envalid'

dotenv.config()

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  HOST: host(),
  PORT: port(),
  CORS_ORIGIN: str(),
  COMMON_RATE_LIMIT_MAX_REQUESTS: num(),
  COMMON_RATE_LIMIT_WINDOW_MS: num(),
  DB_HOST: str(),
  DB_PORT: port(),
  DB_USER: str(),
  DB_PWD: str(),
  DB_NAME: str(),
  DB_ROOT_PWD: str(),
})

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./packages'],
  splitting: false,
  sourcemap: true,
  clean: true,
})

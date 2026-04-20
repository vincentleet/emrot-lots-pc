import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves project sites under /<repo-name>/.
  base: command === 'build' ? '/em/' : '/',
}))

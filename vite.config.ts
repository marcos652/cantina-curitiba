import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Em produção no GitHub Pages o site fica em /cantina-curitiba/.
// Localmente (dev e preview) usa a raiz.
const base = process.env.GITHUB_ACTIONS ? '/cantina-curitiba/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})

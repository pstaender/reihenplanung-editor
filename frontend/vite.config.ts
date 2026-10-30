import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  base: './',
  plugins: [react(), Icons({ compiler: 'jsx', jsx: 'react', scale: 1.15 })],
})

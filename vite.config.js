import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 } // <-- ¡AQUÍ ESTÁ LA MAGIA! Le decimos a Vite que use el puerto 5173
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // No fallar el build por errores de TypeScript
    // Los errores de tipo se ven en el editor pero no bloquean el deploy
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        warn(warning)
      }
    }
  },
  server: {
    host: true,
  },
})

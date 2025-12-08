
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: If you rename the repository, change the base path below to '/<your-repo-name>/'
export default defineConfig({
  plugins: [react()],
  base: '/Dante-Fan.github.io/',
})

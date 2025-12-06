import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Setting base to './' allows the app to be deployed to any subdirectory
  // (e.g. username.github.io/repo-name/) without hardcoding the repo name.
  base: './',
})
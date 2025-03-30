import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.238.248',  // Change this to your IP
    port: 3000,             // Change port if needed
    https: {
      key: fs.readFileSync('./certs/key.pem'),  // Private key file
      cert: fs.readFileSync('./certs/cert.pem') // Certificate file
    }
  }
})

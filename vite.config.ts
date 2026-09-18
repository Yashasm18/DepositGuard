import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind IPv4 explicitly. Vite's default resolves to IPv6 (::1) on this
    // machine, and Chrome tries 127.0.0.1 first, so the browser gets
    // connection refused while curl, which is happy with IPv6, succeeds.
    // The API below is IPv4 too, so this keeps both on one stack.
    host: '127.0.0.1',
    port: 5173,
    // Fail loudly instead of drifting to 5174, 5175, … when the port is
    // taken. A moving URL is what made this hard to see in the first place.
    strictPort: true,
    // The local DepositGuard API (server/app.py).
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
})

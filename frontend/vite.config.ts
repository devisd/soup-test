import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/video/', // Всегда используем /video/ как базовый путь
  server: {
    host: '0.0.0.0', // Разрешить подключения извне
    port: 5173,
    allowedHosts: ['rifelli.ru', 'localhost', '127.0.0.1', 'hugely-receiving-monster.cloudpub.ru'],
  },
}) 
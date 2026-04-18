import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    hmr: true,// 确保 HMR 开启（默认开启）
    port: 5173,
    host: '0.0.0.0'
  },
    build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 确保这是 false
      }
    }
  }
})

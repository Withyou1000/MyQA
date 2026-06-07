import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

function copyStaticAssets() {
  let outDir = ''

  return {
    name: 'copy-static-assets',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const sourceDir = path.resolve(process.cwd(), 'static')
      const targetDir = path.resolve(process.cwd(), outDir || 'dist/build/app', 'static')

      if (!fs.existsSync(sourceDir)) return

      fs.mkdirSync(path.dirname(targetDir), { recursive: true })
      fs.cpSync(sourceDir, targetDir, { recursive: true, force: true })
    },
  }
}
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
    copyStaticAssets(),
  ],
  server: {
    hmr: true,// 确保 HMR 开启（默认开启）
    port: 8887,
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

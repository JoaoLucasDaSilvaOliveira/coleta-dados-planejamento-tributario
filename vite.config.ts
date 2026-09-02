import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./tests/setup.ts'],
    server: { deps: { inline: ['vuetify'] } },
    exclude: ['node_modules', 'dist', 'tests/e2e/**', 'supabase/**'],
  },
  define: mode === 'test' ? {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://test.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('sb_publishable_test'),
    'import.meta.env.VITE_INTERNAL_AUTH_DOMAIN': JSON.stringify('auth.contabiehl.com.br'),
    'import.meta.env.VITE_PUBLIC_APP_URL': JSON.stringify('http://localhost:5173'),
  } : undefined,
}))

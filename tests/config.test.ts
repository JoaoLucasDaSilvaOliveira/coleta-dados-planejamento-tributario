import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from '../src/lib/config'

describe('loadRuntimeConfig', () => {
  it('rejects a missing public Supabase URL', () => {
    expect(() =>
      loadRuntimeConfig({
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
        VITE_INTERNAL_AUTH_DOMAIN: 'auth.contabiehl.invalid',
        VITE_PUBLIC_APP_URL: 'http://localhost:5173',
      }),
    ).toThrow('VITE_SUPABASE_URL')
  })

  it('rejects reserved test domains for technical Auth emails', () => {
    expect(() =>
      loadRuntimeConfig({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
        VITE_INTERNAL_AUTH_DOMAIN: 'auth.contabiehl.invalid',
        VITE_PUBLIC_APP_URL: 'http://localhost:5173',
      }),
    ).toThrow('VITE_INTERNAL_AUTH_DOMAIN')
  })
})

import { describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  initialized: true,
  user: { id: 'user-id', role: 'USER' },
  isAdmin: false,
  initialize: vi.fn(),
}))

vi.mock('../src/features/auth/auth.store', () => ({
  useAuthStore: () => auth,
}))
vi.stubGlobal('scrollTo', vi.fn())

import { router } from '../src/app/router'

describe('admin-only routes', () => {
  it('marks the audit route as restricted to administrators', () => {
    expect(router.getRoutes().find((route) => route.path === '/auditoria')?.meta.admin).toBe(true)
  })

  it('redirects a regular internal user away from the audit route', async () => {
    await router.push('/auditoria')

    expect(router.currentRoute.value.path).toBe('/empresas')
  })
})

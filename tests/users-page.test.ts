import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  manageUser: vi.fn(),
}))

vi.mock('../src/features/users/users.service', () => mocks)
vi.mock('../src/features/auth/auth.store', () => ({
  useAuthStore: () => ({ user: { id: 'admin-id' } }),
}))
vi.mock('../src/lib/validation', () => ({
  displayNameSchema: { safeParse: () => ({ success: true, data: 'Nome' }) },
  passwordSchema: { safeParse: () => ({ success: true, data: 'senha123' }) },
  usernameSchema: { safeParse: () => ({ success: true, data: 'usuario' }) },
}))
vi.mock('../src/lib/errors', () => ({
  userManagementErrorMessage: () => 'Erro',
}))

import UsersPage from '../src/pages/UsersPage.vue'

const passthroughStub = {
  inheritAttrs: true,
  template: '<div v-bind="$attrs"><slot /><slot name="prepend" /><slot name="append" /></div>',
}
const buttonStub = {
  inheritAttrs: true,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
}

function mountPage() {
  return shallowMount(UsersPage, {
    global: {
      stubs: {
        'v-btn': buttonStub,
        'v-dialog': passthroughStub,
        'v-card': passthroughStub,
        'v-card-title': passthroughStub,
        'v-card-text': passthroughStub,
        'v-card-actions': passthroughStub,
        'v-spacer': passthroughStub,
        'v-alert': passthroughStub,
        'v-progress-linear': passthroughStub,
        'v-text-field': passthroughStub,
        'v-avatar': passthroughStub,
        'v-chip': passthroughStub,
        'v-list': passthroughStub,
        'v-list-item': passthroughStub,
        'v-list-item-title': passthroughStub,
        'v-list-item-subtitle': passthroughStub,
      },
    },
  })
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.listUsers.mockResolvedValue({
      data: [
        {
          id: 'user-id',
          username: 'usuario',
          display_name: 'Usuário de teste',
          role: 'USER',
          status: 'ACTIVE',
        },
      ],
      error: null,
    })
    mocks.manageUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-id',
          username: 'usuario',
          display_name: 'Usuário de teste',
          role: 'USER',
          status: 'DELETED',
        },
      },
      error: null,
    })
  })

  it('removes a deleted user from the operational list without reloading tombstones', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[aria-label="Excluir usuário"]').trigger('click')
    await flushPromises()

    expect(mocks.manageUser).toHaveBeenCalledWith({ action: 'delete', userId: 'user-id' })
    expect(mocks.listUsers).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Usuário de teste')
  })
})

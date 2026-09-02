import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authState = vi.hoisted(() => ({ isAdmin: false, logout: vi.fn() }))
vi.mock('../src/features/auth/auth.store', () => ({
  useAuthStore: () => authState,
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import AppLayout from '../src/app/AppLayout.vue'

const shellStub = {
  inheritAttrs: true,
  template: '<div v-bind="$attrs"><slot /></div>',
}
const listItemStub = {
  props: ['title'],
  template: '<div class="list-item">{{ title }}<slot /></div>',
}

describe('AppLayout access visibility', () => {
  beforeEach(() => {
    authState.isAdmin = false
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
  })

  it('does not show the audit navigation to regular internal users', () => {
    const wrapper = shallowMount(AppLayout, {
      global: {
        stubs: {
          RouterView: shellStub,
          'v-layout': shellStub,
          'v-navigation-drawer': shellStub,
          'v-list': shellStub,
          'v-list-item': listItemStub,
          'v-app-bar': shellStub,
          'v-app-bar-nav-icon': shellStub,
          'v-app-bar-title': shellStub,
          'v-spacer': shellStub,
          'v-btn': shellStub,
          'v-main': shellStub,
          'v-container': shellStub,
          'v-bottom-navigation': shellStub,
          'v-icon': shellStub,
        },
      },
    })

    expect(wrapper.text()).not.toContain('Auditoria')
    expect(wrapper.text()).toContain('Catálogo de despesas')
    expect(wrapper.find('.mobile-bottom-nav').exists()).toBe(true)
    expect(wrapper.find('.mobile-bottom-nav').classes()).toContain('d-md-none')
    expect(wrapper.find('.mobile-bottom-nav').attributes('aria-label')).toBe('Navegação principal')
    expect(wrapper.find('.desktop-sidebar').classes()).toContain('d-none')
    expect(wrapper.findComponent({ name: 'v-app-bar-nav-icon' }).exists()).toBe(false)
  })

  it('shows every administrative destination in the mobile bottom navigation', () => {
    authState.isAdmin = true
    const wrapper = shallowMount(AppLayout, {
      global: {
        stubs: {
          RouterView: shellStub,
          'v-layout': shellStub,
          'v-navigation-drawer': shellStub,
          'v-list': shellStub,
          'v-list-item': listItemStub,
          'v-app-bar': shellStub,
          'v-app-bar-nav-icon': shellStub,
          'v-app-bar-title': shellStub,
          'v-spacer': shellStub,
          'v-btn': shellStub,
          'v-main': shellStub,
          'v-container': shellStub,
          'v-bottom-navigation': shellStub,
          'v-icon': shellStub,
        },
      },
    })

    expect(wrapper.find('.mobile-bottom-nav').text()).toContain('Auditoria')
    expect(wrapper.find('.mobile-bottom-nav').text()).toContain('Usuários internos')
  })

  it('removes the permanent sidebar from the layout on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    const wrapper = shallowMount(AppLayout, {
      global: {
        stubs: {
          RouterView: shellStub,
          'v-layout': shellStub,
          'v-navigation-drawer': shellStub,
          'v-list': shellStub,
          'v-list-item': listItemStub,
          'v-app-bar': shellStub,
          'v-app-bar-nav-icon': shellStub,
          'v-app-bar-title': shellStub,
          'v-spacer': shellStub,
          'v-btn': shellStub,
          'v-main': shellStub,
          'v-container': shellStub,
          'v-bottom-navigation': shellStub,
          'v-icon': shellStub,
        },
      },
    })

    expect(wrapper.find('.desktop-sidebar').exists()).toBe(false)
    expect(wrapper.find('.mobile-bottom-nav').exists()).toBe(true)
  })
})

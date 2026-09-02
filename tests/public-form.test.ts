import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadPublicForm: vi.fn(),
  submitPublicForm: vi.fn(),
}))

vi.mock('../src/features/form-requests/form-requests.service', () => ({
  loadPublicForm: mocks.loadPublicForm,
  submitPublicForm: mocks.submitPublicForm,
  publicTokenFromLocation: () => 'abcdefghijklmnopqrstuvwxyz1234567890123456789',
}))

import PublicFormPage from '../src/pages/PublicFormPage.vue'

const passthroughStub = {
  inheritAttrs: true,
  template: '<div v-bind="$attrs"><slot /><slot name="prepend" /><slot name="append" /></div>',
}
const fieldStub = {
  inheritAttrs: false,
  props: ['id'],
  template: '<input :id="id" />',
}
const buttonStub = {
  inheritAttrs: true,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
}

function setupMocks() {
  mocks.loadPublicForm.mockResolvedValue({
    data: {
      company: { legalName: 'Empresa Teste', nickname: null, cnpjFormatted: '11.222.333/0001-81' },
      expiresAt: '2026-10-01T00:00:00.000Z',
      content: {
        title: 'Coleta',
        introduction: 'Introdução',
        ibsCbsGuidance: 'Orientações',
        taxNotice: 'Aviso',
        successMessage: 'Recebido',
      },
      items: [
        {
          expenseItemId: '00000000-0000-4000-8000-000000000001',
          name: 'Primeira despesa',
          amount: null,
          note: null,
          available: true,
        },
        {
          expenseItemId: '00000000-0000-4000-8000-000000000002',
          name: 'Segunda despesa',
          amount: '10',
          note: null,
          available: true,
        },
      ],
    },
    error: null,
  })
  mocks.submitPublicForm.mockResolvedValue({
    data: { status: 'SUBMITTED', message: 'Recebido', requestId: 'request-id' },
    error: null,
  })
  window.location.hash = '#abcdefghijklmnopqrstuvwxyz1234567890123456789'
}

function mountPage() {
  return shallowMount(PublicFormPage, {
    global: {
      stubs: {
        'v-btn': buttonStub,
        'v-text-field': fieldStub,
        'v-progress-linear': passthroughStub,
        'v-alert': passthroughStub,
        'v-icon': passthroughStub,
        'v-checkbox': passthroughStub,
        'v-chip': passthroughStub,
        'v-divider': passthroughStub,
        'v-card': passthroughStub,
        'v-card-text': passthroughStub,
        'v-card-actions': passthroughStub,
        'v-card-title': passthroughStub,
        'v-card-subtitle': passthroughStub,
        'v-container': passthroughStub,
        'v-dialog': passthroughStub,
      },
    },
    attachTo: document.body,
  })
}

describe('PublicFormPage', () => {
  it('asks for confirmation before sending with incomplete values', async () => {
    setupMocks()
    const wrapper = mountPage()
    await flushPromises()
    ;(wrapper.vm as unknown as { confirmed: boolean }).confirmed = true
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button').find((button) => button.text().includes('Confirmar'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Há valores não preenchidos')
    expect(wrapper.text()).toContain('Enviar mesmo assim')
    expect(wrapper.text()).toContain('Voltar a preencher')
    expect(mocks.submitPublicForm).not.toHaveBeenCalled()
  })

  it('sends when the respondent explicitly confirms incomplete values', async () => {
    setupMocks()
    const wrapper = mountPage()
    await flushPromises()
    ;(wrapper.vm as unknown as { confirmed: boolean }).confirmed = true
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button').find((button) => button.text().includes('Confirmar'))!.trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button').find((button) => button.text().includes('Enviar mesmo assim'))!.trigger('click')
    await flushPromises()

    expect(mocks.submitPublicForm).toHaveBeenCalledTimes(1)
  })

  it('scrolls to and focuses the first incomplete value when returning to fill', async () => {
    setupMocks()
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    const wrapper = mountPage()
    await flushPromises()
    ;(wrapper.vm as unknown as { confirmed: boolean }).confirmed = true
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button').find((button) => button.text().includes('Confirmar'))!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('#amount-00000000-0000-4000-8000-000000000001').exists()).toBe(true)

    await wrapper.findAll('button').find((button) => button.text().includes('Voltar a preencher'))!.trigger('click')
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(document.activeElement?.id).toBe('amount-00000000-0000-4000-8000-000000000001')
  })
})

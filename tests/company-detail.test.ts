import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCompany: vi.fn(),
  listCompanyExpenses: vi.fn(),
  listExpenseItems: vi.fn(),
  saveCompanyExpense: vi.fn(),
  createInternalSubmission: vi.fn(),
  importSubmission: vi.fn(),
  createFormRequest: vi.fn(),
  listCompanyRequests: vi.fn(),
  revokeFormRequest: vi.fn(),
  whatsappShareUrl: vi.fn((url: string) => url),
  listSubmissions: vi.fn(),
}))

vi.mock('../src/features/companies/companies.service', () => ({
  getCompany: mocks.getCompany,
}))
vi.mock('../src/features/expenses/expenses.service', () => ({
  listCompanyExpenses: mocks.listCompanyExpenses,
  listExpenseItems: mocks.listExpenseItems,
  saveCompanyExpense: mocks.saveCompanyExpense,
  createInternalSubmission: mocks.createInternalSubmission,
  importSubmission: mocks.importSubmission,
}))
vi.mock('../src/features/form-requests/form-requests.service', () => ({
  createFormRequest: mocks.createFormRequest,
  listCompanyRequests: mocks.listCompanyRequests,
  revokeFormRequest: mocks.revokeFormRequest,
  whatsappShareUrl: mocks.whatsappShareUrl,
}))
vi.mock('../src/features/audit/audit.service', () => ({
  listSubmissions: mocks.listSubmissions,
}))
vi.mock('../src/features/auth/auth.store', () => ({
  useAuthStore: () => ({ user: { id: 'actor-id' } }),
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { companyId: 'company-id' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

import CompanyDetailPage from '../src/pages/CompanyDetailPage.vue'

const passthroughStub = {
  inheritAttrs: true,
  template: '<div v-bind="$attrs"><slot /><slot name="prepend" /><slot name="append" /></div>',
}
const fieldStub = { inheritAttrs: true, template: '<div v-bind="$attrs"><slot /></div>' }
const localStorageValues = new Map<string, string>()
const localStorageMock = {
  clear: () => localStorageValues.clear(),
  getItem: (key: string) => localStorageValues.get(key) ?? null,
  setItem: (key: string, value: string) => localStorageValues.set(key, value),
  removeItem: (key: string) => localStorageValues.delete(key),
  get length() {
    return localStorageValues.size
  },
}

describe('CompanyDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
  })

  it('refreshes requests without reloading the whole page after creating a link', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockResolvedValue({
      data: [{ id: 'expense-id', name: 'Despesa', sort_order: 1, is_active: true }],
      error: null,
    })
    mocks.listCompanyExpenses.mockResolvedValue({ data: [], error: null })
    mocks.saveCompanyExpense.mockResolvedValue({ data: {}, error: null })
    mocks.listCompanyRequests
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'request-id',
            status: 'PENDING',
            expires_at: '2026-10-01T00:00:00.000Z',
            created_at: '2026-09-02T12:00:00Z',
            submitted_at: null,
          },
        ],
        error: null,
      })
    mocks.listSubmissions.mockResolvedValue({ data: [], error: null })
    mocks.createFormRequest.mockResolvedValue({
      data: {
        publicUrl: 'http://localhost:5173/f#token',
        expiresAt: '2026-10-01T00:00:00.000Z',
        requestId: 'request-id',
      },
      error: null,
    })

    const wrapper = shallowMount(CompanyDetailPage, {
      global: {
        stubs: {
          'v-btn': {
            inheritAttrs: true,
            emits: ['click'],
            template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
          },
          'v-progress-linear': passthroughStub,
          'v-alert': passthroughStub,
          'v-icon': passthroughStub,
          'v-avatar': passthroughStub,
          'v-card-title': passthroughStub,
          'v-card-subtitle': passthroughStub,
          'v-card-item': passthroughStub,
          'v-spacer': passthroughStub,
          'v-card-actions': passthroughStub,
          'v-divider': passthroughStub,
          'v-checkbox': passthroughStub,
          'v-chip': passthroughStub,
          'v-list-item-title': passthroughStub,
          'v-list-item-subtitle': passthroughStub,
          'v-text-field': fieldStub,
          'v-progress-circular': passthroughStub,
          'v-list-item': passthroughStub,
          'v-list': passthroughStub,
          'v-card': passthroughStub,
          'v-card-text': passthroughStub,
          'v-list-subheader': passthroughStub,
        },
      },
    })
    await flushPromises()

    ;(wrapper.vm as unknown as { drafts: Record<string, { selected: boolean }> }).drafts[
      'expense-id'
    ].selected = true
    await wrapper.vm.$nextTick()

    await wrapper.find('.link-generate-button').trigger('click')
    await flushPromises()

    expect(mocks.getCompany).toHaveBeenCalledTimes(1)
    expect(mocks.listCompanyRequests).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Link criado.')
    expect(wrapper.find('[aria-label="Ver link pendente"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Despesas salvas nesta empresa.')
  })

  it('shows progress while generating a new link', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockResolvedValue({
      data: [{ id: 'expense-id', name: 'Despesa', sort_order: 1, is_active: true }],
      error: null,
    })
    mocks.listCompanyExpenses.mockResolvedValue({ data: [], error: null })
    mocks.listCompanyRequests.mockResolvedValue({ data: [], error: null })
    mocks.listSubmissions.mockResolvedValue({ data: [], error: null })
    mocks.saveCompanyExpense.mockResolvedValue({ data: {}, error: null })
    let resolveCreateFormRequest!: (value: unknown) => void
    mocks.createFormRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveCreateFormRequest = resolve
      }),
    )

    const wrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()
    ;(wrapper.vm as unknown as { drafts: Record<string, { selected: boolean }> }).drafts[
      'expense-id'
    ].selected = true
    await wrapper.vm.$nextTick()

    const clickPromise = wrapper.find('.link-generate-button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.link-generate-button').attributes('loading')).toBeDefined()
    expect(wrapper.find('.link-generate-button').attributes('disabled')).toBeDefined()

    resolveCreateFormRequest({
      data: {
        publicUrl: 'http://localhost:5173/f#token',
        expiresAt: '2026-10-01T00:00:00.000Z',
        requestId: 'request-id',
      },
      error: null,
    })
    await clickPromise
    await flushPromises()
  })

  it('explains how to handle a pending request after a page refresh', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockResolvedValue({ data: [], error: null })
    mocks.listCompanyExpenses.mockResolvedValue({ data: [], error: null })
    mocks.listCompanyRequests.mockResolvedValue({
      data: [
        {
          id: 'request-id',
          status: 'PENDING',
          expires_at: '2026-10-01T00:00:00.000Z',
          created_at: '2026-09-02T12:00:00Z',
          submitted_at: null,
        },
      ],
      error: null,
    })
    mocks.listSubmissions.mockResolvedValue({ data: [], error: null })

    const wrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()

    expect(wrapper.find('[data-testid="pending-link-recovery"]').attributes('subtitle')).toContain(
      'A URL deste link não pode ser recuperada após recarregar a página.',
    )
    expect(wrapper.find('[aria-label="Gerar novo link para solicitação pendente"]').exists()).toBe(
      true,
    )
  })

  it('hides inactive items without a non-zero current value', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockResolvedValue({
      data: [
        { id: 'active-id', name: 'Despesa ativa', sort_order: 1, is_active: true },
        { id: 'inactive-empty-id', name: 'Despesa inativa vazia', sort_order: 2, is_active: false },
        { id: 'inactive-zero-id', name: 'Despesa inativa zero', sort_order: 3, is_active: false },
        { id: 'inactive-valued-id', name: 'Despesa inativa com valor', sort_order: 4, is_active: false },
      ],
      error: null,
    })
    mocks.listCompanyExpenses.mockResolvedValue({
      data: [
        { expense_item_id: 'inactive-zero-id', is_selected: false, current_amount: 0, current_note: null },
        { expense_item_id: 'inactive-valued-id', is_selected: false, current_amount: 10, current_note: null },
      ],
      error: null,
    })
    mocks.listCompanyRequests.mockResolvedValue({ data: [], error: null })
    mocks.listSubmissions.mockResolvedValue({ data: [], error: null })

    const wrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()

    expect(wrapper.text()).toContain('Despesa ativa')
    expect(wrapper.text()).toContain('Despesa inativa com valor')
    expect(wrapper.text()).not.toContain('Despesa inativa vazia')
    expect(wrapper.text()).not.toContain('Despesa inativa zero')
  })

  it('keeps a previously valued inactive item available so clearing it can be saved', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockResolvedValue({
      data: [{ id: 'inactive-id', name: 'Despesa arquivada', sort_order: 1, is_active: false }],
      error: null,
    })
    mocks.listCompanyExpenses.mockResolvedValue({
      data: [{ expense_item_id: 'inactive-id', is_selected: false, current_amount: 10, current_note: null }],
      error: null,
    })
    mocks.saveCompanyExpense.mockResolvedValue({ data: {}, error: null })
    mocks.listCompanyRequests.mockResolvedValue({ data: [], error: null })
    mocks.listSubmissions.mockResolvedValue({ data: [], error: null })

    const wrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()
    ;(wrapper.vm as unknown as { drafts: Record<string, { amount: string }> }).drafts[
      'inactive-id'
    ].amount = ''
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Despesa arquivada')
    await wrapper.find('[label="Média mensal"]').trigger('blur')
    await flushPromises()

    expect(mocks.saveCompanyExpense).toHaveBeenCalledWith(
      'company-id',
      'inactive-id',
      { isSelected: false, amount: null, note: null },
      'actor-id',
    )
  })

  it('registers the current company values as an internal submission', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockResolvedValue({
      data: [{ id: 'expense-id', name: 'Despesa', sort_order: 1, is_active: true }],
      error: null,
    })
    mocks.listCompanyExpenses.mockResolvedValue({ data: [], error: null })
    mocks.saveCompanyExpense.mockResolvedValue({ data: {}, error: null })
    mocks.listCompanyRequests.mockResolvedValue({ data: [], error: null })
    mocks.listSubmissions.mockResolvedValue({ data: [], error: null })
    mocks.createInternalSubmission.mockResolvedValue({ data: { submissionId: 'submission-id' }, error: null })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()
    ;(wrapper.vm as unknown as { drafts: Record<string, { selected: boolean }> }).drafts['expense-id'].selected = true
    await wrapper.vm.$nextTick()

    const internalSubmitButton = wrapper.find('.internal-submit-actions .internal-submit-button')
    expect(internalSubmitButton.exists()).toBe(true)
    expect(internalSubmitButton.classes()).toContain('rounded-pill')

    await wrapper.findAll('button').find((button) => button.text() === 'Registrar envio interno')!.trigger('click')
    await flushPromises()

    expect(mocks.saveCompanyExpense).toHaveBeenCalledWith(
      'company-id',
      'expense-id',
      { isSelected: true, amount: null, note: null },
      'actor-id',
    )
    expect(mocks.createInternalSubmission).toHaveBeenCalledWith('company-id', [
      { expenseItemId: 'expense-id', amount: null, note: null },
    ])
    expect(mocks.listSubmissions).toHaveBeenCalledTimes(2)
  })

  it('keeps unfinished edits locally without exposing an explicit save control', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockResolvedValue({
      data: [{ id: 'expense-id', name: 'Material de escritório', sort_order: 1, is_active: true }],
      error: null,
    })
    mocks.listCompanyExpenses.mockResolvedValue({ data: [], error: null })
    mocks.listCompanyRequests.mockResolvedValue({ data: [], error: null })
    mocks.listSubmissions.mockResolvedValue({ data: [], error: null })
    mocks.saveCompanyExpense.mockResolvedValue({
      data: { updated_at: '2026-09-02T19:00:00.000Z' },
      error: null,
    })

    const wrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()
    ;(wrapper.vm as unknown as { drafts: Record<string, { amount: string }> }).drafts[
      'expense-id'
    ].amount = '1'
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(mocks.saveCompanyExpense).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)

    const restoredWrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()
    expect(
      (restoredWrapper.vm as unknown as { drafts: Record<string, { amount: string }> }).drafts[
        'expense-id'
      ].amount,
    ).toBe('1')
    expect(restoredWrapper.find('.save-company-expenses-button').exists()).toBe(false)
  })

  it('imports a historical submission without navigating away', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockResolvedValue({ data: [], error: null })
    mocks.listCompanyExpenses.mockResolvedValue({ data: [], error: null })
    mocks.listCompanyRequests.mockResolvedValue({ data: [], error: null })
    mocks.listSubmissions.mockResolvedValue({
      data: [{ id: 'submission-id', submitted_at: '2026-09-02T12:00:00Z', source: 'PUBLIC_LINK', created_by: null }],
      error: null,
    })
    mocks.importSubmission.mockResolvedValue({ data: { status: 'IMPORTED' }, error: null })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()

    await wrapper.get('[aria-label="Importar valores do envio"]').trigger('click')
    await flushPromises()

    expect(mocks.importSubmission).toHaveBeenCalledWith('submission-id')
  })

  it('shows a recoverable error when loading the company detail fails', async () => {
    mocks.getCompany.mockResolvedValue({
      data: { id: 'company-id', legal_name: 'Empresa Teste', nickname: null, cnpj: '11222333000181' },
      error: null,
    })
    mocks.listExpenseItems.mockRejectedValue(new Error('network failure'))
    mocks.listCompanyExpenses.mockResolvedValue({ data: [], error: null })
    mocks.listCompanyRequests.mockResolvedValue({ data: [], error: null })
    mocks.listSubmissions.mockResolvedValue({ data: [], error: null })

    const wrapper = shallowMount(CompanyDetailPage, { global: { stubs: pageStubs() } })
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar os dados da empresa.')
    expect(wrapper.text()).not.toContain('Despesas da empresa')
  })
})

function pageStubs() {
  return {
    'v-btn': {
      inheritAttrs: true,
      emits: ['click'],
      template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    'v-progress-linear': passthroughStub,
    'v-alert': passthroughStub,
    'v-icon': passthroughStub,
    'v-avatar': passthroughStub,
    'v-card-title': passthroughStub,
    'v-card-subtitle': passthroughStub,
    'v-card-item': passthroughStub,
    'v-spacer': passthroughStub,
    'v-card-actions': passthroughStub,
    'v-divider': passthroughStub,
    'v-checkbox': passthroughStub,
    'v-chip': passthroughStub,
    'v-list-item-title': passthroughStub,
    'v-list-item-subtitle': passthroughStub,
    'v-text-field': fieldStub,
    'v-progress-circular': passthroughStub,
    'v-list-item': passthroughStub,
    'v-list': passthroughStub,
    'v-card': passthroughStub,
    'v-card-text': passthroughStub,
    'v-list-subheader': passthroughStub,
  }
}

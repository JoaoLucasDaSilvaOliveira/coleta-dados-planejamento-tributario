import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listExpenseItems: vi.fn(),
  createExpenseItem: vi.fn(),
  updateExpenseItem: vi.fn(),
  inspectExpenseItem: vi.fn(),
  deleteExpenseItem: vi.fn(),
}))

vi.mock('../src/features/expenses/expenses.service', () => mocks)
vi.mock('../src/features/auth/auth.store', () => ({
  useAuthStore: () => ({ user: { id: 'actor-id' } }),
}))

import ExpensesPage from '../src/pages/ExpensesPage.vue'

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
  return shallowMount(ExpensesPage, {
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
        'v-text-field': passthroughStub,
        'v-progress-linear': passthroughStub,
        'v-switch': passthroughStub,
        'v-avatar': passthroughStub,
        'v-icon': passthroughStub,
        'v-chip': passthroughStub,
        'v-list': passthroughStub,
        'v-list-item': passthroughStub,
        'v-list-item-title': passthroughStub,
        'v-list-item-subtitle': passthroughStub,
      },
    },
  })
}

function setupMocks(canDelete: boolean) {
  mocks.listExpenseItems.mockResolvedValue({
    data: [
      {
        id: 'expense-id',
        name: 'Material de escritório',
        sort_order: 1,
        is_active: true,
        deactivated_at: null,
      },
    ],
    error: null,
  })
  mocks.inspectExpenseItem.mockResolvedValue({
    data: { canDelete, referenceCount: canDelete ? 0 : 1 },
    error: null,
  })
  mocks.deleteExpenseItem.mockResolvedValue({
    data: { status: canDelete ? 'DELETED' : 'DEACTIVATED' },
    error: null,
  })
}

function setupReorderMocks() {
  mocks.listExpenseItems.mockResolvedValue({
    data: [
      {
        id: 'first-id',
        name: 'Primeiro item',
        sort_order: 1,
        is_active: true,
        deactivated_at: null,
      },
      {
        id: 'second-id',
        name: 'Segundo item',
        sort_order: 2,
        is_active: true,
        deactivated_at: null,
      },
    ],
    error: null,
  })
  mocks.updateExpenseItem.mockResolvedValue({ data: {}, error: null })
}

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirms and physically deletes an unused item without reloading the list', async () => {
    setupMocks(true)
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[aria-label="Excluir item"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('será excluído de fato')

    await wrapper.findAll('button').find((button) => button.text().includes('Excluir definitivamente'))!.trigger('click')
    await flushPromises()

    expect(mocks.deleteExpenseItem).toHaveBeenCalledWith('expense-id', 'actor-id', 'DELETED')
    expect(mocks.listExpenseItems).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Material de escritório')
  })

  it('confirms logical inactivation when an item has references', async () => {
    setupMocks(false)
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[aria-label="Excluir item"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('será inativado')

    await wrapper.findAll('button').find((button) => button.text().includes('Inativar item'))!.trigger('click')
    await flushPromises()

    expect(mocks.deleteExpenseItem).toHaveBeenCalledWith('expense-id', 'actor-id', 'DEACTIVATED')
    expect((wrapper.vm as unknown as { items: Array<{ is_active: boolean }> }).items[0].is_active).toBe(false)
  })

  it('does not mutate the item when the confirmation is cancelled', async () => {
    setupMocks(true)
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[aria-label="Excluir item"]').trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('Cancelar'))!.trigger('click')

    expect(mocks.deleteExpenseItem).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Material de escritório')
  })

  it('reorders items locally without reloading the catalog', async () => {
    setupReorderMocks()
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[aria-label="Mover para baixo"]').trigger('click')
    await flushPromises()

    const items = (wrapper.vm as unknown as { items: Array<{ id: string; sort_order: number }> }).items
    expect(items.map((item) => item.id)).toEqual(['second-id', 'first-id'])
    expect(items.map((item) => item.sort_order)).toEqual([1, 2])
    expect(mocks.listExpenseItems).toHaveBeenCalledTimes(1)
    expect(mocks.updateExpenseItem).toHaveBeenNthCalledWith(1, 'first-id', { sort_order: 2 }, 'actor-id')
    expect(mocks.updateExpenseItem).toHaveBeenNthCalledWith(2, 'second-id', { sort_order: 1 }, 'actor-id')
  })
})

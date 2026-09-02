import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSubmission: vi.fn(),
  listExpenseItems: vi.fn(),
  createSubmissionRevision: vi.fn(),
  importSubmission: vi.fn(),
}))

vi.mock('../src/features/audit/audit.service', () => ({ getSubmission: mocks.getSubmission }))
vi.mock('../src/features/expenses/expenses.service', () => ({
  listExpenseItems: mocks.listExpenseItems,
  createSubmissionRevision: mocks.createSubmissionRevision,
  importSubmission: mocks.importSubmission,
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { submissionId: 'submission-id' } }),
}))

import SubmissionDetailPage from '../src/pages/SubmissionDetailPage.vue'

const passthroughStub = {
  inheritAttrs: true,
  template: '<div v-bind="$attrs"><slot /><slot name="prepend" /><slot name="append" /></div>',
}
const buttonStub = {
  inheritAttrs: true,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
}
const fieldStub = {
  inheritAttrs: false,
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input :id="$attrs.id" :aria-label="$attrs[\'aria-label\']" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}

function mountPage() {
  return shallowMount(SubmissionDetailPage, {
    global: {
      stubs: {
        'v-btn': buttonStub,
        'v-progress-linear': passthroughStub,
        'v-alert': passthroughStub,
        'v-card': passthroughStub,
        'v-card-title': passthroughStub,
        'v-card-subtitle': passthroughStub,
        'v-card-text': passthroughStub,
        'v-card-actions': passthroughStub,
        'v-divider': passthroughStub,
        'v-list': passthroughStub,
        'v-list-item': passthroughStub,
        'v-list-item-title': passthroughStub,
        'v-list-item-subtitle': passthroughStub,
        'v-text-field': fieldStub,
        'v-chip': passthroughStub,
        'v-icon': passthroughStub,
        'v-spacer': passthroughStub,
      },
    },
  })
}

function setupSubmission(revisions: unknown[] = [], amount: string | number = '10.00') {
  mocks.getSubmission.mockResolvedValue({
    data: {
      id: 'submission-id',
      submitted_at: '2026-09-02T12:00:00Z',
      source: 'PUBLIC_LINK',
      created_by: null,
      submission_items: [{ expense_item_id: 'expense-id', amount, note: 'Original' }],
      submission_revisions: revisions,
    },
    error: null,
  })
  mocks.listExpenseItems.mockResolvedValue({
    data: [{ id: 'expense-id', name: 'Material de escritório' }],
    error: null,
  })
}

describe('SubmissionDetailPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves corrections as a revision and keeps the original submission', async () => {
    setupSubmission()
    mocks.createSubmissionRevision.mockResolvedValue({ data: { revisionId: 'revision-id' }, error: null })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('button[aria-label="Editar valores"]').trigger('click')
    await wrapper.get('input[aria-label="Valor de Material de escritório"]').setValue('25,50')
    await wrapper.findAll('button').find((button) => button.text() === 'Salvar alterações')!.trigger('click')
    await flushPromises()

    expect(mocks.createSubmissionRevision).toHaveBeenCalledWith('submission-id', [
      { expenseItemId: 'expense-id', amount: '25.50', note: 'Original' },
    ])
    expect(wrapper.text()).toContain('Envio original preservado')
  })

  it('normalizes numeric amounts before saving a correction', async () => {
    setupSubmission([], 10)
    mocks.createSubmissionRevision.mockResolvedValue({ data: { revisionId: 'revision-id' }, error: null })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('button[aria-label="Editar valores"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Salvar alterações')!.trigger('click')
    await flushPromises()

    expect(mocks.createSubmissionRevision).toHaveBeenCalledWith('submission-id', [
      { expenseItemId: 'expense-id', amount: '10', note: 'Original' },
    ])
  })

  it('discards a correction without creating a revision', async () => {
    setupSubmission()
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('button[aria-label="Editar valores"]').trigger('click')
    await wrapper.get('input[aria-label="Valor de Material de escritório"]').setValue('25,50')
    await wrapper.findAll('button').find((button) => button.text() === 'Descartar')!.trigger('click')

    expect(mocks.createSubmissionRevision).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('10,00')
  })

  it('imports the latest revision into the company expenses', async () => {
    setupSubmission([
      {
        id: 'revision-id',
        revision_number: 1,
        created_by: 'actor-id',
        created_at: '2026-09-02T13:00:00Z',
        submission_revision_items: [{ expense_item_id: 'expense-id', amount: '25.50', note: 'Corrigido' }],
      },
    ])
    mocks.importSubmission.mockResolvedValue({ data: { status: 'IMPORTED' }, error: null })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('button[aria-label="Usar estes valores"]').trigger('click')
    await flushPromises()

    expect(mocks.importSubmission).toHaveBeenCalledWith('submission-id', 'revision-id')
  })
})

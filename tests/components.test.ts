import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageHeading from '../src/components/PageHeading.vue'
import StateMessage from '../src/components/StateMessage.vue'

describe('shared feedback components', () => {
  it('renders a heading, supporting text and action slot', () => {
    const wrapper = shallowMount(PageHeading, {
      props: { title: 'Empresas', subtitle: 'Cadastros ativos' },
      slots: { default: '<button>Nova empresa</button>' },
    })

    expect(wrapper.find('h1').text()).toBe('Empresas')
    expect(wrapper.find('p').text()).toBe('Cadastros ativos')
    expect(wrapper.text()).toContain('Nova empresa')
    expect(wrapper.find('.page-heading__actions').exists()).toBe(true)
  })

  it('renders an empty/error state with optional description', () => {
    const wrapper = shallowMount(StateMessage, {
      props: { title: 'Nenhum registro', text: 'Tente novamente mais tarde.' },
      global: { stubs: { 'v-icon': true } },
    })

    expect(wrapper.text()).toContain('Nenhum registro')
    expect(wrapper.text()).toContain('Tente novamente mais tarde.')
  })
})

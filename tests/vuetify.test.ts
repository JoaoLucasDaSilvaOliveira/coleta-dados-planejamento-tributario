import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { vuetify } from '../src/app/vuetify'

describe('Vuetify application setup', () => {
  it('registers the form and action components used by the screens', () => {
    const app = createApp({ template: '<div />' }).use(vuetify)

    expect(app.component('VTextField')).toBeDefined()
    expect(app.component('VBtn')).toBeDefined()
  })
})

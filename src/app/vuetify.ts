import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import * as components from 'vuetify/components'

export const vuetify = createVuetify({
  components,
  locale: { locale: 'pt-BR' },
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: {
    defaultTheme: 'contabiehl',
    themes: {
      contabiehl: {
        dark: false,
        colors: {
          primary: '#14532d',
          secondary: '#b45309',
          surface: '#fffdf8',
          background: '#f7f6f1',
          error: '#b91c1c',
        },
      },
    },
  },
})

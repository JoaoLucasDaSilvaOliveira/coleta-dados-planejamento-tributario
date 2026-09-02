import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './styles.css'
import App from './App.vue'
import { router } from './app/router'
import { vuetify } from './app/vuetify'

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')

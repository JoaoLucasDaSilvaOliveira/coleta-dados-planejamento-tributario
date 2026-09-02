import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { runtimeConfig } from '@/lib/config'

type Profile = {
  id: string
  username: string
  display_name: string
  role: 'ADMIN' | 'USER'
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED'
}

function technicalEmail(username: string) {
  return `${username.trim().toLowerCase()}@${runtimeConfig.VITE_INTERNAL_AUTH_DOMAIN}`
}

function legacyTechnicalEmail(username: string) {
  return `${username.trim().toLowerCase()}@auth.contabiehl.invalid`
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Profile | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function loadProfile(authUserId: string) {
    const { data, error: profileError } = await supabase
      .from('app_users')
      .select('id, username, display_name, role, status')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (profileError || !data || data.status !== 'ACTIVE') {
      user.value = null
      return
    }
    user.value = data as Profile
  }

  async function initialize() {
    if (initialized.value) return
    const { data } = await supabase.auth.getSession()
    if (data.session?.user.id) await loadProfile(data.session.user.id)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id) void loadProfile(session.user.id)
      else user.value = null
    })
    initialized.value = true
  }

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    const emails = [technicalEmail(username)]
    const legacyEmail = legacyTechnicalEmail(username)
    if (legacyEmail !== emails[0]) emails.push(legacyEmail)
    let result = await supabase.auth.signInWithPassword({ email: emails[0], password })
    if (result.error && emails[1])
      result = await supabase.auth.signInWithPassword({ email: emails[1], password })
    if (result.error) error.value = 'Não foi possível entrar. Confira seu nome de usuário e senha.'
    else if (result.data.user) await loadProfile(result.data.user.id)
    loading.value = false
    return !result.error && !!user.value
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
  }
  async function changePassword(password: string) {
    const result = await supabase.auth.updateUser({ password })
    return result.error
  }
  return {
    user,
    initialized,
    loading,
    error,
    isAdmin,
    initialize,
    login,
    logout,
    changePassword,
    technicalEmail,
  }
})

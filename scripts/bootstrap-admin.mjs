import { createClient } from '@supabase/supabase-js'

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INTERNAL_AUTH_DOMAIN',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'ADMIN_DISPLAY_NAME',
]
for (const name of required)
  if (!process.env[name]) throw new Error(`Variável obrigatória ausente: ${name}`)
const username = process.env.ADMIN_USERNAME.trim().toLowerCase()
if (!/^[a-z0-9._-]{3,40}$/.test(username) || process.env.ADMIN_PASSWORD.length < 6)
  throw new Error('Credenciais administrativas inválidas.')
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const existing = await admin
  .from('app_users')
  .select('id, auth_user_id, username, display_name, role, status')
  .eq('role', 'ADMIN')
  .neq('status', 'DELETED')
if (existing.error) throw new Error('Não foi possível verificar o administrador.')
if (existing.data.length > 1)
  throw new Error('Mais de um administrador principal encontrado; correção manual necessária.')
if (existing.data.length === 1) {
  const current = existing.data[0]
  if (current.username !== username || current.status !== 'ACTIVE' || !current.auth_user_id)
    throw new Error('Administrador existente diverge da configuração; nenhuma alteração foi feita.')
  console.log('Administrador principal já configurado.')
  process.exit(0)
}
const email = `${username}@${process.env.INTERNAL_AUTH_DOMAIN}`
const created = await admin.auth.admin.createUser({
  email,
  password: process.env.ADMIN_PASSWORD,
  email_confirm: true,
})
if (created.error || !created.data.user)
  throw new Error('Não foi possível criar a identidade administrativa.')
const profile = await admin
  .from('app_users')
  .insert({
    auth_user_id: created.data.user.id,
    username,
    display_name: process.env.ADMIN_DISPLAY_NAME.trim(),
    role: 'ADMIN',
    status: 'ACTIVE',
  })
  .select('id')
  .single()
if (profile.error) {
  await admin.auth.admin.deleteUser(created.data.user.id)
  throw new Error('Não foi possível criar o perfil administrativo; a identidade foi compensada.')
}
console.log(
  'Administrador principal criado. Troque a senha pela tela de perfil após o primeiro acesso.',
)

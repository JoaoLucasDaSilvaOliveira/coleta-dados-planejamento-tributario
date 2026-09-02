import { z } from 'zod'

const configSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_INTERNAL_AUTH_DOMAIN: z
    .string()
    .regex(/^[a-z0-9.-]+$/)
    .refine((value) => !value.endsWith('.invalid') && !value.endsWith('.test'), {
      message: 'domínio reservado não pode ser usado pelo Supabase Auth',
    }),
  VITE_PUBLIC_APP_URL: z.string().url(),
})

export type RuntimeConfig = z.infer<typeof configSchema>

export function loadRuntimeConfig(env: Record<string, unknown>): RuntimeConfig {
  const result = configSchema.safeParse(env)
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Configuração inválida: ${fields}`)
  }
  return result.data
}

export const runtimeConfig = loadRuntimeConfig(import.meta.env)

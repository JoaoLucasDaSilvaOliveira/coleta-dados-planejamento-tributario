import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'

if (!existsSync('supabase')) throw new Error('Diretório Supabase ausente.')
try {
  const output = execFileSync(
    'npx',
    [
      '--yes',
      'supabase@2.116.0',
      'gen',
      'types',
      'typescript',
      '--project-id',
      process.env.SUPABASE_PROJECT_REF ?? 'etwpvadzakisurbzsrph',
      '--schema',
      'public',
    ],
    { encoding: 'utf8' },
  )
  writeFileSync('src/types/database.generated.ts', output)
  console.log('Tipos gerados em src/types/database.generated.ts')
} catch {
  console.error(
    'Supabase CLI ausente ou sem autenticação de gerenciamento. O tipo versionado em src/types/database.ts continua sendo a interface local.',
  )
}

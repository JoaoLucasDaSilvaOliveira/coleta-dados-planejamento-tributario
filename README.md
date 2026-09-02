# Coleta de despesas — Contabiehl

SPA mobile-first para coleta interna de despesas do planejamento tributário de 2027. A interface é Vue 3/Vuetify/Tailwind e o backend é Supabase (PostgreSQL, Auth, RLS e Edge Functions).

## Execução local

Requer Node.js 24 LTS, npm e, para as validações completas, Docker, Deno e a Supabase CLI compatível.

```bash
npm ci
cp .env.example .env.local
# ajuste a URL, chave publishable e URL pública no .env.local
npm run dev
```

Para recriar o banco local, use `supabase start` e `supabase db reset`. O seed é idempotente e contém os 23 itens e o conteúdo orientativo documentados. O tipo local está em `src/types/database.ts`; com a CLI instalada, `npm run generate:types` gera os tipos oficiais.

## Verificações

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:functions
npm run test:db
npm run build
```

As suítes E2E usam um servidor Vite e não precisam de credenciais para testar as telas públicas, mas exigem os browsers instalados (`npx playwright install chromium webkit`). `test:functions` baixa Deno 2.9.6 via `npx`. `test:db` inicia/usa o banco local do Supabase e exige Docker.

## Supabase

As migrations estão em `supabase/migrations`, o seed em `supabase/seed.sql` e as funções em `supabase/functions`. Para publicar com a CLI, configure o projeto correto, aplique as migrations e publique as cinco funções. Defina como secrets server-side `INTERNAL_AUTH_DOMAIN`, `ALLOWED_ORIGINS` e `PUBLIC_APP_URL`; `SUPABASE_SERVICE_ROLE_KEY` é fornecida pelo ambiente de funções e nunca deve ser adicionada ao Vite.

Com a CLI autenticada, a configuração server-side pode ser aplicada sem colocar valores no repositório: `supabase secrets set INTERNAL_AUTH_DOMAIN=auth.contabiehl.com.br ALLOWED_ORIGINS=https://app.exemplo.com PUBLIC_APP_URL=https://app.exemplo.com`.

Bootstrap autorizado:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... INTERNAL_AUTH_DOMAIN=auth.contabiehl.com.br \
ADMIN_USERNAME=admin ADMIN_PASSWORD='senha-local-com-6-ou-mais' ADMIN_DISPLAY_NAME='Administrador' \
npm run bootstrap
```

O projeto MCP atualmente configurado é `etwpvadzakisurbzsrph`. Nenhum deploy Vercel foi realizado. Configure as variáveis públicas no projeto Vercel, rewrite SPA, headers de `public/_headers` e confirme a elegibilidade comercial do plano antes de publicar.

O conteúdo tributário inicial deve ser validado pelo responsável contábil antes de disponibilizar links. O software não calcula créditos nem altera essas orientações.

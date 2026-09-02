# QA Catalog and Auth Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir exclusão física segura de itens de catálogo sem referências e corrigir a criação de usuários internos no Supabase Auth.

**Architecture:** A exclusão será decidida em uma função transacional server-side que verifica todas as relações antes de apagar ou inativar o item. A gestão de catálogo será exposta por uma Edge Function autenticada para manter a decisão fora do navegador. O domínio técnico de Auth será reservado e válido para o validador de e-mail do provedor, mantendo o login por nome de usuário.

**Tech Stack:** Vue 3, TypeScript estrito, Vitest, Supabase PostgreSQL, Supabase Edge Functions.

**Spec:** `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, QA aprovado nesta conversa.

## Global Constraints

- Histórico, relações e IDs estáveis nunca serão apagados em cascata.
- Item referenciado será inativado; item sem qualquer referência poderá ser apagado fisicamente somente após confirmação explícita.
- O domínio técnico e as credenciais administrativas nunca serão expostos ao frontend além das variáveis públicas já previstas.
- Toda chamada de Edge Function validará o usuário interno ativo e registrará somente identificadores de correlação.

### Task 1: Domain fix for internal users

**Files:**
- Modify: `.env.local`, `.env.example`, `README.md`, `docs/ARCHITECTURE.md`, `docs/OPERATIONS.md`
- Modify: `src/features/auth/auth.store.ts`, `supabase/functions/manage-user/index.ts`
- Test: `tests/config.test.ts`, `supabase/functions/tests/security_test.ts`

- [ ] Add a regression test for the normalized technical domain.
- [ ] Run the test and confirm it fails with the old `.invalid` domain.
- [ ] Use `auth.contabiehl.test` consistently and validate the server-side domain before Auth calls.
- [ ] Map invalid provider configuration to a safe actionable error while preserving secret-free logs.
- [ ] Run unit, function, lint, typecheck and build checks.
- [ ] Deploy `manage-user` and verify the remote function is active.

### Task 2: Safe catalog deletion

**Files:**
- Create: `supabase/functions/manage-expense-item/index.ts`
- Modify: `supabase/migrations/20260902000700_catalog_delete.sql`, `supabase/functions/deno.json`
- Modify: `src/features/expenses/expenses.service.ts`, `src/pages/ExpensesPage.vue`
- Test: `tests/expenses-page.test.ts`, `supabase/functions/tests/manage_expense_item_test.ts`, `supabase/tests/database/001_security.sql`

- [ ] Add failing component and function tests for physical delete, logical inactivation, cancellation and server revalidation.
- [ ] Run those tests and confirm the current archive-only behavior fails them.
- [ ] Add a transaction that locks the item, counts references in all three relation tables, and returns `DELETED` or `DEACTIVATED`.
- [ ] Add authenticated Edge Function handling and a confirmation-aware UI with local list updates and rollback on error.
- [ ] Run all local checks and the database/security checks available in the environment.
- [ ] Apply the migration and deploy the new function remotely; verify advisors and function status.

## Checkpoints

- Checkpoint 1: user creation contract and Auth domain are consistent locally and remotely.
- Checkpoint 2: catalog delete/inactivate behavior is covered, secure, and does not reload the list after action.

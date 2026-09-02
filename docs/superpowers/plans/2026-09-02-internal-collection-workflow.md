# Internal Collection Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add internal submissions, immutable submission revisions, historical import, and correct filtering of inactive company expenses.

**Architecture:** Extend the existing Supabase history model with nullable `form_request_id`, an explicit source, and immutable revision tables. Three authenticated Edge Function operations call security-controlled SQL transactions. Vue services expose these operations to the Company detail and Submission detail screens.

**Tech Stack:** Vue 3 Composition API, TypeScript strict, Vuetify, Pinia, Zod, Supabase PostgreSQL/RLS/Edge Functions, Vitest, Deno tests.

**Spec:** `docs/superpowers/specs/2026-09-02-internal-collection-workflow-design.md`

## Global Constraints

- Preserve the original submission and all revision rows as immutable history.
- Use stable `expense_item_id` UUIDs for all relationships.
- Keep monetary values as PostgreSQL `numeric(14,2)` and canonical decimal strings at API boundaries.
- Only authenticated active internal users may call internal operations; RLS must include negative checks.
- Do not expose service-role keys, passwords, raw tokens, or tax-content changes.
- Keep all visible interface text in Brazilian Portuguese and mobile-first.

---

### Task 1: Database model and transactions

**Files:**
- Create: `supabase/migrations/20260902000900_internal_submission_revisions.sql`
- Modify: `src/types/database.ts`
- Modify: `supabase/tests/database/001_security.sql`
- Test: `supabase/functions/tests/internal_submission_test.ts`

**Interfaces:**
- Produces SQL functions `create_internal_submission_transaction(uuid, uuid, jsonb)`, `create_submission_revision_transaction(uuid, uuid, jsonb)`, and `import_submission_transaction(uuid, uuid, uuid)`.

- [ ] Write failing pure transaction payload/action tests.
- [ ] Run `npm run test:functions` and verify the new test fails because the helper/functions are absent.
- [ ] Add nullable source/author fields, revision tables, immutable triggers, grants, RLS and the three transaction functions.
- [ ] Add TypeScript database function/table definitions and security assertions for anonymous/authenticated denial and service-role execution.
- [ ] Run Deno tests and apply the migration remotely with Supabase MCP.
- [ ] Check the remote policy/function definitions and checkpoint the database work.

### Task 2: Internal Edge Function and services

**Files:**
- Create: `supabase/functions/internal-submission/index.ts`
- Modify: `supabase/config.toml`
- Modify: `src/features/expenses/expenses.service.ts`
- Modify: `src/features/audit/audit.service.ts`
- Modify: `src/features/companies/companies.service.ts` only if DTO reuse is required.

**Interfaces:**
- Edge request: `{ action: 'create'|'revise'|'import'; companyId?: string; submissionId?: string; revisionId?: string; items?: Array<{ expenseItemId: string; amount: string|null; note: string|null }> }`.
- Service functions: `createInternalSubmission`, `createSubmissionRevision`, `importSubmission`.

- [ ] Add failing Edge/service contract tests for invalid input and each operation.
- [ ] Run focused tests and verify RED.
- [ ] Implement strict Zod validation, active actor authentication, safe errors, and RPC dispatch.
- [ ] Add service methods with domain DTOs and no component-level Supabase queries.
- [ ] Run function tests, lint and typecheck; deploy the new function with JWT verification.
- [ ] Checkpoint the function remotely.

### Task 3: Company collection and import UI

**Files:**
- Modify: `src/pages/CompanyDetailPage.vue`
- Modify: `tests/company-detail.test.ts`

**Interfaces:**
- `collectionItems` includes active items and inactive items only when parsed current amount is nonzero.
- `createInternalSubmission` and `importSubmission` update local UI state and show action-local errors.

- [ ] Add failing component tests for inactive null/zero filtering, internal submission and historical import.
- [ ] Run the focused component tests and verify RED.
- [ ] Implement computed filtering, internal submit confirmation/action, and import buttons.
- [ ] Keep inactive rows with nonzero values readable and preserve stable IDs.
- [ ] Run focused tests and perform the mobile layout sanity check.

### Task 4: Submission detail revisions

**Files:**
- Modify: `src/pages/SubmissionDetailPage.vue`
- Modify: `src/features/audit/audit.service.ts`
- Create or modify: `tests/submission-detail.test.ts`

**Interfaces:**
- Detail DTO includes original items and revisions; effective items are latest revision items or original items.
- Save calls `createSubmissionRevision`; import calls `importSubmission`; discard restores the effective snapshot.

- [ ] Add failing tests for edit/save revision, discard, and import latest revision.
- [ ] Run focused tests and verify RED.
- [ ] Implement the responsive detail editor and revision timeline with field-level errors.
- [ ] Run focused tests and checkpoint the history UI.

### Task 5: Documentation and full verification

**Files:**
- Modify: `docs/REQUIREMENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Create: `docs/adr/0007-coleta-interna-e-revisoes-imutaveis.md`

- [ ] Document internal submissions, import semantics, revision immutability, and inactive filtering.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:functions`, and `npm run build`.
- [ ] Run `npm run test:db`; if Docker/Postgres is unavailable, record the exact reproducible block.
- [ ] Run E2E if Playwright browsers are available; otherwise record the install command and block.
- [ ] Run Supabase advisors and final secret search.
- [ ] Confirm migration list, RLS, grants, and no raw tokens/secrets in bundle or logs.

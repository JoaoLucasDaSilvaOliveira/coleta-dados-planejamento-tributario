# Arquitetura de referência

## 1. Visão geral

A solução é uma SPA estática Vue que acessa o Supabase por HTTPS. Não existe servidor de aplicação permanente.

```text
Navegador
  ├─ SPA Vue/Vuetify/Tailwind
  ├─ Supabase Auth ─────────────── login/sessão
  ├─ Supabase Data API + RLS ───── CRUD interno não privilegiado
  └─ Supabase Edge Functions
       ├─ manage-user ──────────── operações administrativas
       ├─ create-form-request ──── token e fotografia da solicitação
       ├─ public-form ──────────── leitura/envio por token
       └─ internal-submission ──── envio interno, revisão e importação
                                      │
                                  PostgreSQL
```

O frontend usa somente a URL do projeto e a chave publishable. Edge Functions guardam segredos e usam um cliente administrativo somente após validar o chamador. O formulário público não acessa diretamente tabelas pela Data API.

## 2. Organização sugerida

```text
src/
  app/                 bootstrap, router, providers e layout
  components/          componentes compartilhados sem regra de negócio
  features/
    auth/
    companies/
    expenses/
    form-content/
    form-requests/
    users/
    audit/
  lib/                 Supabase, locale, erros e validações comuns
  pages/               composição das rotas
  types/               tipos gerados do banco e DTOs públicos
supabase/
  functions/
    _shared/
    manage-user/
    create-form-request/
    public-form/
    internal-submission/
  migrations/
  seed.sql
  tests/               pgTAP/RLS
tests/e2e/
```

Cada feature expõe serviços/composables tipados. Componentes consomem esses serviços e não conhecem nomes de tabelas. Gere os tipos do Supabase após migrations e valide os DTOs recebidos pelas Edge Functions com Zod.

## 3. Rotas da aplicação

| Rota                   | Acesso        | Conteúdo                                                                                               |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `/login`               | Público       | Login interno por usuário e senha.                                                                     |
| `/`                    | Interno       | Redireciona para `/empresas`.                                                                          |
| `/empresas`            | Interno       | Busca, listagem e cadastro.                                                                            |
| `/empresas/:companyId` | Interno       | Dados, despesas, solicitação vigente e histórico.                                                      |
| `/empresas/:companyId/envios/:submissionId` | Interno | Detalhe, revisão e importação de um Envio. |
| `/despesas`            | Interno       | Catálogo ativo/inativo e ordenação.                                                                    |
| `/conteudo-formulario` | Interno       | Edição do Conteúdo orientativo.                                                                        |
| `/auditoria`           | Administrador | Consulta paginada dos eventos.                                                                         |
| `/usuarios`            | Administrador | Gestão de Usuários internos.                                                                           |
| `/perfil`              | Interno       | Nome exibido e alteração da própria senha.                                                             |
| `/f#<token>`           | Público       | Carregamento e confirmação da Solicitação; o token fica no fragmento e não é enviado ao host estático. |
| `/:pathMatch(.*)*`     | Público       | Página não encontrada.                                                                                 |

Guards aguardam a restauração da sessão antes de decidir. Além do papel no cliente, o banco/função sempre revalida usuário ativo e permissão. A rota pública deve emitir `Referrer-Policy: no-referrer` e metadados `noindex,nofollow`. O Link usa fragmento (`/f#<token>`), que não é transmitido à Vercel em requisições HTTP; a SPA lê o fragmento e envia o token somente no corpo das chamadas à Edge Function.

## 4. Modelo de dados

Usar UUIDs gerados no banco, `timestamptz` em UTC, `created_at`/`updated_at` quando aplicável e extensão `citext` para comparações insensíveis a caixa. Valores monetários usam `numeric(14,2)`.

### 4.1 Tipos enumerados

- `app_user_role`: `ADMIN`, `USER`.
- `app_user_status`: `ACTIVE`, `INACTIVE`, `DELETED`.
- `form_request_status`: `PENDING`, `SUBMITTED`, `EXPIRED`, `REVOKED`.
- `audit_actor_type`: `INTERNAL_USER`, `RESPONDENT`, `SYSTEM`.

### 4.2 `app_users`

| Campo                                    | Tipo/restrição                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `id`                                     | UUID, PK independente da identidade Auth.                                     |
| `auth_user_id`                           | UUID único, FK `auth.users`, anulável somente após exclusão da identidade.    |
| `username`                               | `citext`, único, formato definido em RN-002. Não é reutilizado após exclusão. |
| `display_name`                           | texto 2–100.                                                                  |
| `role`                                   | `app_user_role`; exatamente um registro não excluído pode ser `ADMIN`.        |
| `status`                                 | `app_user_status`.                                                            |
| `created_by`                             | FK para `app_users`, nulo apenas no bootstrap.                                |
| `created_at`, `updated_at`, `deleted_at` | auditoria temporal.                                                           |

O UUID da aplicação preserva autoria quando a identidade Auth é removida. `DELETED` implica `auth_user_id = null` e `deleted_at` preenchido. Nome e ID históricos permanecem; a senha nunca existe nesta tabela.

### 4.3 `companies`

| Campo                      | Tipo/restrição                         |
| -------------------------- | -------------------------------------- |
| `id`                       | UUID, PK.                              |
| `legal_name`               | texto 2–160.                           |
| `nickname`                 | texto anulável 1–100.                  |
| `cnpj`                     | `varchar(14)`, único, somente dígitos. |
| `created_by`, `updated_by` | FK para `app_users`.                   |
| `created_at`, `updated_at` | timestamps.                            |

Não implementar exclusão de Empresa até existir política aprovada para histórico e retenção.

### 4.4 `expense_items`

| Campo                                        | Tipo/restrição                                      |
| -------------------------------------------- | --------------------------------------------------- |
| `id`                                         | UUID, PK estável.                                   |
| `name`                                       | `citext` 2–160; único entre itens ativos após trim. |
| `sort_order`                                 | inteiro não negativo, indexado.                     |
| `is_active`                                  | booleano; `false` representa exclusão lógica.       |
| `created_by`, `updated_by`                   | FK para `app_users`.                                |
| `created_at`, `updated_at`, `deactivated_at` | timestamps.                                         |

Desativação nunca apaga relações. Reativação deve verificar conflito de nome ativo.

### 4.5 `company_expenses`

| Campo                           | Tipo/restrição                                          |
| ------------------------------- | ------------------------------------------------------- |
| `company_id`, `expense_item_id` | PK composta e FKs sem cascade de exclusão.              |
| `is_selected`                   | preferência atual da Empresa.                           |
| `current_amount`                | `numeric(14,2)` anulável, entre 0 e o limite de RN-009. |
| `current_note`                  | texto anulável, máximo 1.000.                           |
| `updated_by`                    | FK anulável; nulo quando a origem é Respondente.        |
| `updated_from_submission_id`    | FK anulável para o Envio que definiu a vigência.        |
| `created_at`, `updated_at`      | timestamps.                                             |

Desmarcar altera somente `is_selected`; valor e observação permanecem para eventual reativação e histórico operacional.

### 4.6 `form_content`

Tabela singleton com `id = true`, `title`, `introduction`, `ibs_cbs_guidance`, `tax_notice`, `success_message`, `updated_by`, `updated_at`. Todos os textos são texto simples, possuem limite documentado de 10.000 caracteres cada e são escapados na renderização.

### 4.7 `form_requests`

| Campo                                      | Tipo/restrição                                                        |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `id`                                       | UUID, PK.                                                             |
| `company_id`                               | FK para Empresa.                                                      |
| `token_digest`                             | digest SHA-256 codificado em hexadecimal, único; nunca o token bruto. |
| `status`                                   | `form_request_status`.                                                |
| `expires_at`                               | criação + 30 dias.                                                    |
| `created_by`                               | FK para `app_users`.                                                  |
| `created_at`, `submitted_at`, `revoked_at` | timestamps consistentes com o status.                                 |

Índice parcial único permite no máximo uma Solicitação `PENDING` por Empresa. Expiração pode ser derivada no acesso e materializada para `EXPIRED` na mesma transação; não depende de cron.

### 4.8 `form_request_items`

| Campo                                | Tipo/restrição                           |
| ------------------------------------ | ---------------------------------------- |
| `form_request_id`, `expense_item_id` | PK composta e FKs.                       |
| `initial_amount`                     | fotografia anulável de `current_amount`. |
| `initial_note`                       | fotografia anulável de `current_note`.   |
| `initial_updated_at`                 | versão de `company_expenses` exibida na criação. |
| `sort_order`                         | ordem no instante da geração.            |

Não copiar o nome do item: ele é resolvido por `expense_item_id`, conforme RN-014. A associação não muda depois da criação.

### 4.9 `form_submissions` e `submission_items`

`form_submissions` contém `id`, `form_request_id` único e anulável, `company_id`, `submitted_at`, `source` (`PUBLIC_LINK` ou `INTERNAL`), `created_by` anulável e uma versão do Conteúdo orientativo apresentado (JSONB). Envios públicos exigem Solicitação e não possuem `created_by`; Envios internos exigem Usuário interno e não possuem Solicitação. A fotografia do conteúdo prova o que foi exibido sem impedir revisões futuras.

`submission_items` contém PK composta (`submission_id`, `expense_item_id`), `amount` anulável e `note` anulável. O conjunto inclui somente itens aceitos no instante do Envio. `submission_revisions` possui número sequencial por Envio, autor e data; `submission_revision_items` guarda a fotografia corrigida. Triggers bloqueiam `UPDATE` e `DELETE` nas quatro tabelas para papéis de aplicação. O original continua sendo a fonte de autoria e a revisão mais recente é a visão efetiva para consulta/importação.

### 4.10 `audit_events`

Tabela append-only com `id`, `actor_type`, `actor_app_user_id` anulável, `action`, `entity_type`, `entity_id`, `changes` JSONB, `correlation_id` e `created_at`. Nunca gravar senha, token bruto ou material de sessão. Mudanças financeiras podem registrar antes/depois porque fazem parte da trilha interna, mas não devem ir a logs técnicos externos.

## 5. Autenticação por nome de usuário

Supabase Auth usa e-mail/senha internamente. A aplicação usa um endereço técnico determinístico e não exibido: `<username-normalizado>@auth.contabiehl.com.br`. `VITE_INTERNAL_AUTH_DOMAIN` e o segredo/configuração equivalente das funções devem possuir o mesmo valor. A política de senha do projeto Supabase deve estar configurada com `password_min_length = 6`, alinhada às validações do frontend, bootstrap e Edge Functions.

- O login normaliza o usuário, deriva o endereço técnico e chama `signInWithPassword`.
- A criação usa `auth.admin.createUser` com e-mail confirmado, sem disparo de e-mail.
- Renomear atualiza de forma atômica a identidade Auth e `app_users`; em falha, nenhuma mudança deve ficar aparente.
- Redefinição usa `auth.admin.updateUserById` dentro de função administrativa.
- Alteração da própria senha usa a API autenticada, depois de reautenticação quando exigida.
- Desativar marca o perfil e desabilita/bane a identidade Auth. As políticas consultam `status`, bloqueando também JWT ainda válido.
- Excluir remove a identidade Auth e conserva `app_users` como tombstone histórico.

O domínio técnico é usado somente como identificador interno, com e-mail confirmado pela função administrativa; o produto não dispara e-mail nem oferece recuperação por e-mail. Durante a migração, o login aceita a identidade legada no domínio `.invalid`, mas novas identidades usam `auth.contabiehl.com.br`.

## 6. Autorização e RLS

Criar funções auxiliares `current_app_user_id()` e `is_primary_admin()` como `security definer`, com `search_path` fixo e execução concedida apenas a `authenticated`. Elas vinculam `auth.uid()` a um `app_users` ativo e não excluído.

- Revogar privilégios padrão de `anon` e `authenticated` em todas as tabelas.
- `anon` não recebe acesso direto a nenhuma tabela ou RPC de negócio.
- Usuário ativo recebe `SELECT/INSERT/UPDATE` compatível com RFs em Empresas, catálogo, associações e conteúdo; não recebe `DELETE` de dados históricos.
- `app_users`: usuários ativos podem ler campos não sensíveis necessários à autoria; somente Edge Function administrativa escreve.
- Solicitações: leitura interna; criação/revogação somente pela função para proteger o token e a transação.
- Envios: somente leitura interna; auditoria: leitura exclusiva do Administrador principal, inserção apenas por funções/triggers controlados.
- Administrador não é inferido de metadado editável do usuário; a fonte é `app_users.role`.

Cada grant/policy deve ter testes de permissão positiva e negativa para `anon`, usuário ativo, inativo e administrador.

## 7. Contratos das Edge Functions

Todas as respostas usam JSON, `Content-Type: application/json`, `requestId` para correlação e erros sem stack. Validar origem/CORS conforme ambientes configurados. Limitar corpo a 64 KiB.

### 7.1 `manage-user`

Requer JWT de Administrador principal e perfil ativo.

```ts
type ManageUserRequest =
  | { action: 'create'; username: string; displayName: string; password: string }
  | { action: 'rename'; userId: string; username: string; displayName: string }
  | { action: 'reset-password'; userId: string; password: string }
  | { action: 'activate' | 'deactivate' | 'delete'; userId: string }

type ManageUserResponse = {
  user: {
    id: string
    username: string
    displayName: string
    status: 'ACTIVE' | 'INACTIVE' | 'DELETED'
  }
  requestId: string
}
```

Retornos: `400` entrada inválida, `401` sem sessão, `403` não administrador/autoproteção, `404` alvo inexistente, `409` usuário duplicado/estado conflitante e `500` falha segura. A função deve compensar criação/renomeação se Auth e tabela não puderem ser atualizados coerentemente.

### 7.2 `create-form-request`

Requer qualquer Usuário interno ativo.

```ts
type CreateFormRequestInput = { companyId: string }
type CreateFormRequestOutput = {
  requestId: string
  publicUrl: string
  expiresAt: string
  requestIdForLogs: string
}
```

Em uma transação: validar Empresa e seleção, revogar pendentes, gerar fotografia e persistir digest. Gere 32 bytes criptograficamente aleatórios, codifique em base64url sem padding e devolva o bruto somente em `publicUrl`, no formato `${PUBLIC_APP_URL}/f#<token>`. Se a URL for perdida, crie outra Solicitação.

### 7.3 `public-form`

Não exige sessão. Usa sempre `POST` para evitar o token em query string de infraestrutura.

```ts
type PublicFormInput =
  | { action: 'load'; token: string }
  | {
      action: 'submit'
      token: string
      items: Array<{
        expenseItemId: string
        amount: string | null
        note: string | null
        baseUpdatedAt: string | null
      }>
      confirmed: true
    }

type PublicFormView = {
  company: { legalName: string; nickname: string | null; cnpjFormatted: string }
  expiresAt: string
  content: {
    title: string
    introduction: string
    ibsCbsGuidance: string
    taxNotice: string
  }
  items: Array<{
    expenseItemId: string
    name: string
    amount: string | null
    note: string | null
    baseUpdatedAt: string | null
    available: boolean
  }>
}

type PublicFormResult = { status: 'SUBMITTED'; message: string; requestId: string }
```

O valor monetário trafega como string decimal canônica para não perder precisão. A função calcula SHA-256 do token, usa comparação/indexação pelo digest, valida estado/expiração e delega o Envio a uma função SQL transacional não exposta aos papéis de API. Respostas públicas de token inválido, expirado, revogado ou usado usam status funcional genérico e nunca incluem dados da Empresa. Aplicar limitação de taxa por infraestrutura quando disponível, além de tamanho máximo e um campo honeypot invisível como defesa de baixo atrito.

O `load` consulta o estado atual de `company_expenses` e retorna `baseUpdatedAt`. No `submit`, a transação só atualiza uma despesa se a versão ainda coincidir; uma edição posterior da contabilidade permanece vigente mesmo que o formulário tenha sido aberto antes dela.

### 7.4 `internal-submission`

Requer JWT de Usuário interno ativo e aceita três operações:

```ts
type InternalSubmissionInput =
  | { action: 'create'; companyId: string; items: Array<SubmissionItem> }
  | { action: 'revise'; submissionId: string; items: Array<SubmissionItem> }
  | { action: 'import'; submissionId: string; revisionId?: string | null }
```

`create` cria um Envio `INTERNAL` e atualiza as Despesas da empresa na mesma transação. `revise` cria uma revisão append-only sem alterar o original nem a vigência. `import` aplica ao estado vigente os itens do original ou da revisão escolhida. A função valida IDs e delega as três operações a RPCs SQL não executáveis por `anon` ou `authenticated`.

## 8. Fluxos críticos

### Geração

1. Usuário escolhe gerar Link na ficha.
2. Função autentica o perfil e bloqueia a Empresa durante a operação.
3. Revoga pendente anterior, lê itens ativos selecionados e cria a fotografia.
4. Salva digest e retorna URL uma única vez.
5. Frontend copia ou abre compartilhamento/WhatsApp.

### Envio

1. SPA extrai token do fragmento da URL e envia `load` no corpo.
2. Função retorna somente a visão autorizada pela Solicitação.
3. Respondente revisa, confirma e envia.
4. Transação bloqueia a Solicitação e revalida `PENDING`/expiração.
5. Filtra itens desativados, cria histórico, atualiza vigência e marca `SUBMITTED`.
6. Nova tentativa encontra estado terminal e não altera dados.

### Revisão e importação interna

1. O Usuário interno abre um Envio pela ficha da Empresa.
2. Pode importar os valores efetivos ou editar e salvar uma nova revisão.
3. A revisão é imutável e passa a ser a visão efetiva do detalhe.
4. A importação atualiza apenas `company_expenses`, preservando todas as fotografias históricas.

### Item removido

- Respostas históricas continuam ligadas ao ID e exibem o nome atual com selo “Inativo”.
- Uma Solicitação pendente mostra o item como indisponível e não envia seu valor.
- Novas Solicitações não incluem o item até eventual reativação e seleção.

## 9. Interface e responsividade

- Celular: barra superior e navegação compacta; listagens viram cartões; ações primárias ficam alcançáveis sem hover.
- Desktop: menu lateral, tabelas paginadas e ficha com abas/seções.
- Campos de moeda aceitam digitação brasileira, mas convertem para string decimal canônica na fronteira.
- Checkboxes mantêm associação explícita com o nome; seleção em massa informa quantos itens serão afetados.
- Desativação, revogação e exclusão de usuário pedem confirmação descrevendo a consequência.
- Não usar cores como único indicador de status; acompanhar por texto/ícone com nome acessível.
- O formulário público é linear, mostra progresso apenas se dividido em seções e mantém o botão de confirmação após a lista.

## 10. Configuração

Frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_INTERNAL_AUTH_DOMAIN=auth.contabiehl.com.br
VITE_PUBLIC_APP_URL
```

Edge Functions/bootstrap:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
INTERNAL_AUTH_DOMAIN
ALLOWED_ORIGINS
PUBLIC_APP_URL
ADMIN_USERNAME       # somente no bootstrap
ADMIN_PASSWORD       # somente no bootstrap
ADMIN_DISPLAY_NAME   # somente no bootstrap
```

O script de bootstrap lê os três valores administrativos no processo local/CI autorizado e não os envia à Vercel. `.env.example` contém somente nomes e valores fictícios.

## 11. Decisões deliberadamente adiadas

- Retenção/exclusão de Empresas e Envios.
- Múltiplos administradores e promoção de papel.
- Recuperação autônoma de senha por e-mail.
- Proteção adicional do Link por OTP ou CNPJ parcial.
- Backup externo e plano de recuperação pago.
- Login/área do Respondente e versionamento por competência.

Qualquer inclusão exige revisar requisitos, ameaças, modelo de dados e testes antes da implementação.

# Orientações para agentes

Este repositório contém o sistema interno de coleta de despesas para o planejamento tributário de 2027 da Contabiehl. Antes de alterar código ou documentação, leia nesta ordem:

1. [`CONTEXT.md`](./CONTEXT.md) — linguagem canônica do domínio.
2. [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) — requisitos, regras de negócio e critérios de aceitação.
3. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — arquitetura, dados, interfaces e segurança.
4. [`docs/adr/`](./docs/adr/) — decisões que não devem ser revertidas silenciosamente.
5. [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) — ordem de execução.
6. [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) e [`docs/OPERATIONS.md`](./docs/OPERATIONS.md).

Neste momento o repositório contém somente o planejamento. Não interprete a ausência de código como autorização para mudar requisitos.

## Produto e escopo

- A aplicação é uma SPA mobile-first para usuários internos cadastrarem empresas, selecionarem despesas e enviarem um link de preenchimento a um Respondente.
- A interface e as mensagens são em português do Brasil. Identificadores, tipos, nomes de arquivos e commits técnicos devem usar inglês.
- Não implementar nesta versão: acesso permanente do Respondente, exportação, anexos, cálculo de crédito tributário, múltiplos catálogos por atividade ou integração com a API do WhatsApp.
- “Compartilhar no WhatsApp” significa somente abrir o compartilhamento com uma mensagem e URL pré-preenchidas.
- O conteúdo tributário é orientação editável do escritório, não lógica de cálculo. Não invente, corrija ou amplie regras fiscais sem aprovação do responsável contábil.

## Stack obrigatória

- Node.js 24 LTS e npm, com `package-lock.json` versionado.
- Vue 3, TypeScript em modo estrito, Vite e Single File Components com Composition API e `<script setup>`.
- Vue Router para rotas e guards; Pinia para estado compartilhado.
- Vuetify para componentes e acessibilidade; Tailwind CSS para layout e utilitários. Desative o preflight/reset do Tailwind se ele interferir com o Vuetify.
- Zod para validação de entradas nas fronteiras da aplicação.
- Supabase para PostgreSQL, Auth, Data API e Edge Functions.
- Vitest e Vue Test Utils para testes unitários/de componentes; Playwright para testes ponta a ponta.
- Vercel como destino do frontend estático, observada a ressalva comercial em `docs/OPERATIONS.md`.

Use versões estáveis compatíveis no momento da inicialização, fixe-as no lockfile e não faça upgrades amplos junto com mudanças funcionais.

## Regras de implementação

- Centralize acesso ao Supabase e converta respostas externas em tipos do domínio; componentes não devem montar consultas ad hoc.
- Use IDs estáveis nas relações. Nunca relacione registros pelo nome exibido da despesa ou pelo CNPJ formatado.
- Valores monetários são decimais no banco e nunca `float`; conversões de exibição usam `pt-BR` e BRL.
- Datas persistidas usam UTC; apresentação e prazos de negócio usam `America/Sao_Paulo` quando necessário.
- Toda alteração de esquema deve ser uma migration reproduzível. Dados iniciais também devem ser versionados.
- Habilite RLS, ajuste grants e teste permissões em toda tabela exposta. Não aceite uma política permissiva sem um teste negativo correspondente.
- A chave pública/publishable pode ficar no frontend; `service_role`, segredos de token e credenciais administrativas nunca podem entrar no bundle, logs ou Git.
- Operações privilegiadas pertencem a Edge Functions autenticadas. O envio público deve validar o bearer token e concluir em uma transação atômica.
- Exclusões de itens de despesa são lógicas. Histórico de envios é imutável.
- O administrador principal não pode ser desativado ou excluído pela aplicação.
- Trate carregamento, ausência de dados, erros recuperáveis e estados expirado/revogado/utilizado explicitamente na UI.
- Preserve acessibilidade por teclado, labels, foco, contraste e mensagens associadas aos campos.

## Contratos e alterações de decisão

- `docs/REQUIREMENTS.md` prevalece sobre o roteiro de implementação.
- `docs/ARCHITECTURE.md` define interfaces e invariantes técnicas; ADRs explicam por que as decisões estruturais existem.
- Se código e documentação divergirem, pare, determine se houve uma decisão aprovada e atualize ambos na mesma mudança.
- Não edite um ADR aceito para esconder uma mudança. Crie um ADR posterior que o substitua e atualize seu status.
- Mantenha `CONTEXT.md` apenas como glossário. Requisitos e implementação não pertencem a ele.
- Uma mudança de escopo, papel, política de acesso, semântica de histórico ou ciclo de vida de link exige atualização dos requisitos e testes.

## Qualidade e encerramento

Quando o projeto for inicializado, mantenha estes scripts:

```text
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Antes de concluir uma entrega:

1. Execute lint, typecheck, testes relevantes e build.
2. Teste tanto autorização permitida quanto negada.
3. Confira que migrations funcionam em banco limpo e que nenhum segredo foi versionado.
4. Atualize os documentos afetados e registre pendências reais, sem declarar como pronto algo não validado.

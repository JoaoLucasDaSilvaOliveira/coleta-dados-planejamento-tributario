# Plano de implementação

Este roteiro é executável por etapas. Não avance quando a condição de conclusão da etapa atual não estiver atendida. Requisitos citados referem-se a `docs/REQUIREMENTS.md`.

## Etapa 1 — Fundação do repositório

**Entregáveis**

- Inicializar Vue 3 + Vite + TypeScript estrito com Node.js 24 LTS e npm.
- Adicionar Vue Router, Pinia, Vuetify, Tailwind, Zod, Supabase JS, ESLint, Prettier, Vitest, Vue Test Utils e Playwright.
- Configurar aliases, layouts, tema visual básico, locale `pt-BR`, página 404 e scripts definidos em `AGENTS.md`.
- Configurar Tailwind sem reset conflitante e gerar `_headers`/metadados para segurança do Link público.
- Criar `.env.example`, sem credenciais reais, e validar variáveis no bootstrap da aplicação.

**Condição de conclusão**

Aplicação mínima abre em 360 px e desktop; lint, typecheck, teste de exemplo e build passam em máquina limpa.

## Etapa 2 — Supabase e banco reproduzível

**Entregáveis**

- Inicializar diretório Supabase e migrations para enums, tabelas, índices, constraints e triggers descritos na arquitetura.
- Criar funções SQL auxiliares de identidade/autorização com `search_path` fixo.
- Revogar grants padrão, habilitar RLS e declarar políticas mínimas.
- Criar triggers de `updated_at`, auditoria e imutabilidade do histórico.
- Criar seed idempotente dos 23 Itens de despesa e Conteúdo orientativo.
- Gerar tipos TypeScript do schema.

**Condição de conclusão**

`supabase db reset` recria tudo sem intervenção, seeds não duplicam dados e a matriz inicial de testes RLS passa.

## Etapa 3 — Bootstrap, login e usuários

**Entregáveis**

- Script idempotente de bootstrap que cria ou valida o Administrador principal a partir do ambiente.
- Cliente Supabase central, store de sessão, restauração de sessão, login por usuário técnico, logout e guards.
- Página de perfil e troca da própria senha.
- Edge Function `manage-user`, com autenticação administrativa, validações, compensação e auditoria.
- Tela administrativa responsiva para criar, editar, redefinir senha, ativar, desativar e excluir terceiros.
- Bloqueio imediato de perfil inativo nas políticas e funções.

**Condição de conclusão**

RF-001 a RF-009 e CA-07 passam; usuário comum não consegue executar operação administrativa pela UI nem por chamada direta.

## Etapa 4 — Empresas

**Entregáveis**

- Utilitários testados de normalização, dígitos verificadores e formatação de CNPJ.
- Serviço/store para listar, buscar, cadastrar e editar Empresas.
- Listagem adaptativa (cartões/tabela), formulário com validação e ficha da Empresa.
- Estados de carregamento, vazio, duplicidade, indisponibilidade e erro recuperável.
- Auditoria de criação/alteração.

**Condição de conclusão**

RF-010 a RF-014, RN-001, RN-005 e CA-01 passam em viewport móvel e desktop.

## Etapa 5 — Catálogo e despesas da Empresa

**Entregáveis**

- Tela do Catálogo com inclusão, renomeação, ordenação, desativação, filtro de inativos e reativação.
- Widget reutilizável de seleção por Empresa com checkbox, seleção em massa e edição contextual do catálogo.
- Edição de valor BRL e observação, preservando dados ao desmarcar.
- Seção histórica para itens inativos já relacionados.
- Confirmações, feedback e auditoria das alterações.

**Condição de conclusão**

RF-020 a RF-029, RN-006 a RN-010 e CA-02 passam. Nenhuma operação apaga item referenciado.

## Etapa 6 — Solicitações e compartilhamento

**Entregáveis**

- Função SQL transacional para revogar pendente anterior e criar fotografia.
- Edge Function `create-form-request` com token aleatório, digest e retorno único da URL.
- Seção de solicitações na ficha, mostrando status, validade e autoria.
- Ações de copiar, Web Share API com fallback e WhatsApp por URL com mensagem preenchida.
- Tratamento explícito de URL perdida: gerar uma nova, nunca revelar token persistido.

**Condição de conclusão**

RF-030 a RF-033, RN-011 a RN-014 e cenário de revogação de CA-06 passam.

## Etapa 7 — Formulário público e transação de Envio

**Entregáveis**

- Função SQL interna que bloqueia/revalida Solicitação, cria Envio/itens, atualiza vigência e consome Link atomicamente.
- Edge Function `public-form` com operações `load` e `submit`, validação Zod, limites, CORS e respostas neutras.
- Página pública mobile-first com conferência da Empresa, conteúdo, valores, observações, confirmação e sucesso.
- Estados inválido, expirado, revogado, utilizado, indisponível e falha de rede.
- Item desativado depois da geração exibido como indisponível e rejeitado no payload.

**Condição de conclusão**

RF-034 a RF-043, RN-015 a RN-020 e CA-03 a CA-06 passam, incluindo duas confirmações concorrentes.

## Etapa 8 — Histórico, conteúdo e auditoria

**Entregáveis**

- Histórico paginado da Empresa e detalhe de Envio com original e revisões imutáveis.
- Registro de Envios internos, importação do histórico para o estado vigente e edição por nova revisão.
- Tela de Conteúdo orientativo com campos de texto simples, preview seguro e validações.
- Tela paginada de auditoria com filtros por período, entidade, ação e ator.
- Fotografar Conteúdo orientativo em cada Envio.

**Condição de conclusão**

RF-050 a RF-057 passam; renomeação/desativação mantém histórico legível, conteúdo não executa HTML e concorrência não sobrescreve a última edição da contabilidade.

## Etapa 9 — Robustez e experiência

**Entregáveis**

- Revisão de navegação por teclado, foco, labels, contraste, leitores de tela e telas de 360–1440 px.
- Paginação, carregamento sob demanda e prevenção de múltiplos cliques.
- Identificadores de correlação e logs técnicos sem dados sensíveis.
- Revisão das mensagens para português claro e distinção entre indisponibilidade e credenciais inválidas.
- Headers de segurança e confirmação de que tokens não vazam por analytics/referrer.

**Condição de conclusão**

RNF-001 a RNF-014 e CA-08 estão cobertos por evidência automatizada ou checklist manual registrado.

## Etapa 10 — Implantação e entrega

**Entregáveis**

- Pipeline executando lint, typecheck, testes e build.
- Projeto Supabase configurado, migrations/funções publicadas e bootstrap executado por canal seguro.
- Projeto Vercel com variáveis públicas, rewrite SPA, HTTPS e domínio final.
- Smoke test de produção para login, CRUD, geração e Envio.
- Revisão contábil do Conteúdo orientativo documentada antes de disponibilizar Links.
- Runbook operacional conferido e ressalva de licenciamento Vercel resolvida pelo responsável.

**Condição de conclusão**

Todos os critérios de `docs/TEST_PLAN.md` passam, não existem segredos no Git/bundle e o responsável recebe URL, procedimento de acesso e recuperação operacional.

## Definição de pronto por mudança

Uma mudança só está pronta quando:

- requisito e regra associados estão identificados;
- fluxo feliz e falhas relevantes estão testados;
- autorização foi testada no servidor, não apenas escondida na UI;
- migrations e tipos gerados estão sincronizados;
- acessibilidade e responsividade da área alterada foram verificadas;
- lint, typecheck, testes afetados e build passam;
- documentação e ADRs continuam coerentes.

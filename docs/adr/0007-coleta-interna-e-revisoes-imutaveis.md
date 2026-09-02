---
status: accepted
---

# ADR-0007: Coleta interna e revisões imutáveis

## Contexto

Usuários internos precisam registrar valores sem depender de um Link público, corrigir um Envio e reutilizar um Envio anterior para preencher o estado vigente. A alteração direta de `form_submissions` ou `submission_items` quebraria a decisão de histórico imutável do ADR-0004.

## Decisão

Envios internos serão gravados com `source = INTERNAL`, `created_by` preenchido e sem `form_request_id`. Correções serão novas linhas em `submission_revisions` e `submission_revision_items`, cada uma com autor, data e número sequencial. O original e todas as revisões serão append-only; a revisão mais recente será a visão efetiva do detalhe. Importar um Envio ou revisão atualizará somente `company_expenses` e registrará auditoria.

O formulário público consultará o estado atual de `company_expenses` a cada carregamento e enviará a versão (`updated_at`) exibida. A transação pública não substituirá uma edição da contabilidade feita depois desse carregamento.

## Consequências

- A ficha da Empresa oferece registro interno e importação sem alterar fotografias anteriores.
- O detalhe do Envio mostra o original, a revisão efetiva e a linha do tempo de revisões.
- O banco precisa de três RPCs protegidas e de RLS de leitura para as tabelas de revisão.
- Um Envio recebido com payload antigo ainda é preservado para auditoria, mas não sobrescreve o estado vigente que foi alterado posteriormente.

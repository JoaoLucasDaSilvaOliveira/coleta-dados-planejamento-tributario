# ADR-0006: Auditoria restrita ao Administrador principal

- Status: accepted
- Data: 2026-09-02

## Contexto

A auditoria contém a sequência de ações sensíveis do escritório e pode expor identificadores e alterações operacionais que não são necessários para o trabalho diário de um Usuário interno.

## Decisão

Somente o Administrador principal pode acessar a tela `/auditoria` e consultar `audit_events`. A navegação não exibe o item para Usuários internos comuns, a rota aplica guard administrativo e a policy RLS usa `app_private.is_primary_admin()`.

## Consequências

- A restrição não depende apenas da interface: consultas diretas pela Data API também são negadas a Usuários internos comuns.
- Os eventos continuam append-only e disponíveis para o Administrador principal.
- A matriz de permissões e os testes de segurança devem manter um caso permitido e um caso negado.

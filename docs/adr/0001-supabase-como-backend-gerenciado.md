---
status: accepted
---

# Supabase como backend gerenciado

O sistema usará Supabase para PostgreSQL, autenticação, autorização por RLS e Edge Functions, mantendo o frontend como SPA sem servidor próprio. A alternativa de acessar um banco diretamente pelo navegador não protege operações administrativas; separar Auth, banco e backend em provedores distintos aumentaria custo e operação para um sistema interno pequeno.

## Consequências

A aplicação fica acoplada ao Auth, Data API e runtime de funções do Supabase, e operações privilegiadas devem passar por Edge Functions. O plano gratuito pode pausar e não oferece as mesmas garantias de backup/SLA de um plano pago, riscos aceitos para a primeira versão e registrados no runbook.


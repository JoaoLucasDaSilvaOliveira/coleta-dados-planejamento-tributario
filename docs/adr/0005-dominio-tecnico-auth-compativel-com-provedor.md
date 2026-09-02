# ADR-0005: Domínio técnico do Auth compatível com o provedor

- Status: accepted
- Data: 2026-09-02

## Contexto

O produto autentica usuários internos por nome de usuário, derivando um endereço técnico determinístico para o Supabase Auth. A primeira implementação usava o domínio reservado `.invalid`, sem envio de e-mail. A versão atual do provedor rejeita esse domínio ao validar endereços, fazendo a criação de usuários terminar em `safe_failure`.

## Decisão

Usar `auth.contabiehl.com.br` como domínio técnico padrão em `VITE_INTERNAL_AUTH_DOMAIN` e no secret `INTERNAL_AUTH_DOMAIN` das Edge Functions. A função confirma a identidade no momento da criação e não envia e-mail ao usuário.

Durante a migração, o frontend tenta também o domínio legado `.invalid` somente no login. Essa compatibilidade temporária preserva o acesso de administradores já criados; novas contas e renomeações usam o domínio padrão válido.

## Consequências

- Frontend e Edge Functions devem manter o mesmo domínio padrão.
- O domínio precisa continuar sob controle do escritório e configurado conforme a política de Auth do projeto.
- O domínio legado não deve ser usado para novas contas.
- Trocar novamente o domínio exige migração coordenada das identidades Auth e atualização deste ADR.

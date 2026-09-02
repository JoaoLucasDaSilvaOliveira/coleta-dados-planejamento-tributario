# Operação e implantação

## 1. Ambientes

Manter, quando possível, projetos Supabase separados para desenvolvimento e produção. Preview da Vercel nunca deve apontar automaticamente para produção. Cada ambiente possui URL, chave publishable, secrets e origem permitida próprios.

O frontend é estático. Dados, autenticação e funções ficam no Supabase.

## 2. Pré-requisitos

- Node.js 24 LTS e npm.
- Supabase CLI compatível com o projeto.
- Conta/projeto Supabase e acesso autorizado ao painel.
- Repositório Git conectado à Vercel.
- Domínio final ou subdomínio `vercel.app` definido.

Nunca compartilhar `SUPABASE_SERVICE_ROLE_KEY` por WhatsApp, issue, commit ou variável pública da Vercel.

## 3. Configuração local

Depois que o projeto for implementado:

1. Copiar `.env.example` para um arquivo local ignorado pelo Git.
2. Iniciar Supabase local e executar reset/migrations/seed.
3. Gerar/atualizar tipos do banco pelo script versionado.
4. Instalar dependências com `npm ci` e iniciar com `npm run dev`.
5. Servir Edge Functions com os secrets locais fictícios.
6. Executar o bootstrap com uma senha local que não será usada em produção.

Na configuração de Auth do projeto Supabase, definir a senha mínima como 6 caracteres para manter o mesmo contrato da aplicação. Essa política é independente das variáveis do frontend e deve ser conferida também no ambiente hospedado.

O README de implementação deverá fornecer comandos exatos; este documento define o procedimento e as garantias.

## 4. Bootstrap do Administrador

O comando deve ler `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME`, `INTERNAL_AUTH_DOMAIN`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do processo autorizado.

Comportamento idempotente:

- Se não existe Administrador, cria a identidade Auth confirmada e `app_users` em papel `ADMIN`.
- Se existe o mesmo Administrador ativo, valida o estado e termina sem alterar senha.
- Se existe divergência, mais de um Administrador ou criação parcial, termina com erro e instruções de correção; não escolhe um registro silenciosamente.
- Não imprime senha, token de sessão ou chave privilegiada.
- Variáveis administrativas são removidas do ambiente/pipeline após o bootstrap.

Depois do primeiro login, o responsável deve trocar a senha pela tela de perfil e armazená-la em gerenciador de senhas.

## 5. Publicação do Supabase

1. Conferir o projeto/ambiente alvo.
2. Aplicar migrations versionadas em ordem.
3. Executar testes de banco contra ambiente descartável antes de produção.
4. Configurar `INTERNAL_AUTH_DOMAIN=auth.contabiehl.com.br`, `ALLOWED_ORIGINS` e `PUBLIC_APP_URL` como secrets/configuração das funções.
5. Publicar `manage-user`, `manage-expense-item`, `create-form-request`, `public-form` e `internal-submission`.
6. Confirmar que verificação de JWT está habilitada nas funções internas e que `public-form` faz sua própria validação de token.
7. Executar seed idempotente somente onde apropriado.
8. Executar bootstrap do Administrador por estação/runner confiável.
9. Fazer smoke test e revisar logs sem dados sensíveis.

## 6. Publicação da Vercel

Configurar build Vite e saída `dist`, rewrite de todas as rotas da SPA para `index.html`, HTTPS, headers de segurança e estas variáveis públicas:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_INTERNAL_AUTH_DOMAIN
VITE_PUBLIC_APP_URL
```

Não configurar `SUPABASE_SERVICE_ROLE_KEY`, credenciais do Administrador ou secrets das Edge Functions na aplicação Vite. Toda variável com prefixo `VITE_` é considerada pública.

Após publicar:

- cadastrar a origem exata na configuração CORS das funções;
- validar login/logout e bloqueio da rota administrativa;
- gerar um Link de teste, abri-lo em janela anônima e concluir Envio;
- confirmar consumo único, auditoria e ausência de token em logs/referrer;
- excluir somente os dados de teste identificados, nunca históricos reais.

## 7. Limitações dos planos escolhidos

### Supabase gratuito

O plano Free tem cotas e pode pausar projeto após período de inatividade; também não fornece as mesmas garantias de backup/SLA dos planos pagos. Antes de uso contínuo, o responsável deve:

- acompanhar avisos e consumo no painel;
- saber restaurar manualmente um projeto pausado;
- avaliar plano pago ou backup externo antes de armazenar dados cuja perda seja inaceitável;
- revisar periodicamente os termos e limites oficiais: <https://supabase.com/pricing>.

Não implementar tráfego artificial para impedir pausa.

### Vercel gratuita

O destino solicitado é a Vercel, mas o plano Hobby é oficialmente destinado a uso pessoal/não comercial. Antes da publicação empresarial, o responsável deve confirmar elegibilidade diretamente com a Vercel ou contratar o plano adequado. A configuração técnica permanece portátil para hospedagem estática alternativa.

Referências operacionais:

- <https://vercel.com/docs/limits/fair-use-guidelines>
- <https://vercel.com/legal/terms>

Essa pendência não deve ser ocultada ou declarada resolvida pelo agente implementador.

## 8. Rotinas operacionais

### Redefinir usuário

O Administrador usa a interface, entrega a senha temporária por canal apropriado e orienta troca imediata. Nunca consulta senha existente, pois ela não é recuperável.

### Revogar Link

Gerar nova Solicitação revoga a pendente. Se não houver nova coleta, disponibilizar ação explícita de revogar na ficha, com confirmação e auditoria.

### Rotacionar segredo

Rotacionar pelo painel Supabase, atualizar somente consumers server-side, republicar funções e executar smoke test. Se houver suspeita de vazamento, invalidar imediatamente; não aguardar janela de manutenção.

### Projeto Supabase pausado

Restaurar pelo painel, aguardar saúde do banco/funções e executar smoke test antes de reenviar Links. Informar usuários sobre indisponibilidade; não atribuir o erro a credenciais.

### Incidente com Link

Revogar a Solicitação ou gerar outra, verificar auditoria e orientar a Empresa a ignorar a URL anterior. Como o token bruto não é persistido, ele não pode ser recuperado pelo suporte.

## 9. Backup e retenção

A versão 1 não define exclusão de Empresa/Envio. Até uma política formal:

- não criar botões ou scripts destrutivos para esses dados;
- fazer export/backup administrativo somente por mecanismo seguro e autorizado do provedor;
- documentar local, data, responsável, criptografia e teste de restauração de qualquer backup externo;
- evitar que dumps com CNPJ e valores entrem no repositório ou em máquinas não autorizadas.

## 10. Checklist de release

- [ ] Requisitos/ADRs afetados revisados.
- [ ] Lint, typecheck, testes e build aprovados.
- [ ] Migrations testadas em banco limpo e ambiente descartável.
- [ ] Segredos ausentes do Git e bundle.
- [ ] Conteúdo tributário aprovado pelo responsável contábil.
- [ ] CORS, URL pública e domínio técnico de login consistentes.
- [ ] Bootstrap/admin e gerenciador de senhas confirmados.
- [ ] Smoke test interno e público concluído.
- [ ] Limites do Supabase monitorados.
- [ ] Elegibilidade/plano da Vercel confirmados pelo responsável.
- [ ] Procedimento de rollback definido para frontend, migrations e funções.

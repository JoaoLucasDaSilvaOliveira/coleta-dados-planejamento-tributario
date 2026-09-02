# Fluxo de coleta interna e revisões de envio

## Objetivo

Permitir que a equipe preencha e registre uma coleta diretamente na ficha da Empresa, importe valores de um Envio histórico para o estado vigente e corrija um Envio por meio de revisões imutáveis.

## Decisões

1. Um Envio já existente nunca será atualizado nem excluído. Uma edição salva cria uma revisão numerada vinculada ao Envio original.
2. A versão efetiva para leitura e importação é a revisão mais recente, quando existir; sem revisão, é o Envio original.
3. Um Envio interno não possui Link. Ele será identificado por `source = INTERNAL`, terá `created_by` preenchido e não terá `form_request_id`.
4. Importar um Envio altera somente o estado vigente em `company_expenses`, por ID estável, sem criar uma cópia no histórico.
5. Na coleta da Empresa, todos os itens ativos aparecem. Itens inativos aparecem somente quando `current_amount` é diferente de zero; valores nulos, vazios ou `0,00` não tornam o item visível.

## Modelo de dados

`form_submissions.form_request_id` torna-se anulável e `form_submissions.source` recebe `PUBLIC_LINK` ou `INTERNAL`. `created_by` identifica o Usuário interno que registrou uma coleta interna.

`submission_revisions` guarda a revisão imutável (número, Envio, autor e data). `submission_revision_items` guarda os valores por `expense_item_id`. Triggers bloqueiam alterações e exclusões nas duas tabelas.

## Operações transacionais

- `create_internal_submission_transaction(company, actor, payload)`: valida ator, Empresa e itens; fotografa o Conteúdo orientativo; cria Envio interno; atualiza a vigência na mesma transação; audita.
- `create_submission_revision_transaction(submission, actor, payload)`: bloqueia o Envio, valida itens, cria a próxima revisão e audita sem alterar o original nem a vigência.
- `import_submission_transaction(submission, revision, actor)`: bloqueia a Empresa, escolhe a revisão solicitada ou a mais recente e atualiza valores vigentes por ID, auditando a operação.

Todas as operações privilegiadas serão chamadas por Edge Function autenticada. Usuários internos podem operar o fluxo, mas não recebem `INSERT/UPDATE/DELETE` direto em histórico ou revisões.

## Interface

- `CompanyDetailPage`: filtra os itens inativos conforme a regra de valor, exibe “Registrar envio interno” e oferece “Importar valores” em cada Envio.
- `SubmissionDetailPage`: exibe a versão efetiva, permite editar rascunho, salvar como nova revisão ou descartar; mostra a linha do tempo de revisões e permite importar a versão efetiva.
- Mensagens de erro ficam próximas à ação que falhou.

## Validação

Testar filtragem nula/zero/diferente de zero, criação interna, revisão e descarte, importação da versão mais recente, RLS negado/permitido, imutabilidade do original e concorrência das transações.

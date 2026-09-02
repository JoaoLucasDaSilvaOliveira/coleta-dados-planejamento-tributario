# Coleta de despesas tributárias

Este contexto descreve a linguagem usada para solicitar e manter médias mensais de despesas empresariais que serão analisadas pelo escritório no planejamento tributário de 2027.

## Participantes

**Empresa**:
Pessoa jurídica cadastrada pelo escritório e à qual pertencem a seleção e os valores de despesas.
_Evitar_: Cliente, conta

**Usuário interno**:
Pessoa autorizada pelo escritório a administrar empresas, despesas, solicitações e conteúdo orientativo.
_Evitar_: Usuário, operador, funcionário

**Administrador principal**:
Usuário interno responsável também pelo ciclo de vida das credenciais dos demais usuários internos.
_Evitar_: Superusuário, root

**Respondente**:
Pessoa que recebe uma solicitação e informa despesas em nome de uma Empresa, sem possuir acesso permanente ao sistema.
_Evitar_: Cliente, usuário externo

## Despesas

**Catálogo de despesas**:
Conjunto compartilhado de itens que podem ser considerados para qualquer Empresa.
_Evitar_: Lista da empresa, formulário padrão

**Item de despesa**:
Tipo de aquisição ou gasto identificável no Catálogo de despesas, independentemente do nome que estiver exibindo no momento.
_Evitar_: Campo, pergunta

**Despesa da empresa**:
Associação entre uma Empresa e um Item de despesa que registra se o item é pertinente àquela Empresa.
_Evitar_: Item global, resposta

**Média mensal vigente**:
Valor mensal mais recente considerado válido para uma Despesa da empresa.
_Evitar_: Parcela, lançamento, competência

## Solicitação e resposta

**Solicitação de preenchimento**:
Pedido pontual criado pelo escritório para que um Respondente revise um conjunto de despesas de uma Empresa.
_Evitar_: Formulário, campanha

**Link de preenchimento**:
Credencial temporária e de uso único que dá acesso exclusivamente a uma Solicitação de preenchimento.
_Evitar_: Login do cliente, convite permanente

**Envio**:
Registro definitivo dos valores e observações confirmados pelo Respondente em uma Solicitação de preenchimento.
_Evitar_: Rascunho, estado atual

**Histórico de envios**:
Conjunto imutável dos Envios já recebidos para uma Empresa.
_Evitar_: Valores vigentes, log técnico

**Conteúdo orientativo**:
Texto mantido pelo escritório para contextualizar o Respondente sobre a coleta e as regras tributárias relevantes.
_Evitar_: Parecer automático, cálculo tributário

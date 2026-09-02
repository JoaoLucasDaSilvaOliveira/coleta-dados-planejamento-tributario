# Requisitos do sistema

## 1. Objetivo e atores

O sistema substitui a troca manual de tabelas pelo WhatsApp por um fluxo rastreável: o escritório cadastra a Empresa, escolhe os Itens de despesa pertinentes, gera um Link de preenchimento e consulta o Envio recebido. O sistema apoia a coleta; ele não calcula nem recomenda regime tributário.

| Papel                   | Capacidades gerais                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Visitante               | Acessar login e páginas públicas de erro.                                             |
| Respondente             | Consultar e enviar somente a Solicitação representada por um Link válido.             |
| Usuário interno         | Administrar todas as Empresas, despesas, solicitações, envios e Conteúdo orientativo. |
| Administrador principal | Todas as capacidades internas e a gestão dos demais Usuários internos.                |

Não existe segregação de Empresas por Usuário interno nesta versão.

## 2. Requisitos funcionais

### 2.1 Autenticação e usuários

- **RF-001 — Login interno:** permitir entrada por nome de usuário e senha, com mensagem genérica para credenciais inválidas.
- **RF-002 — Sessão:** restaurar a sessão ao recarregar, proteger rotas internas e encerrar a sessão por ação explícita ou invalidação da credencial.
- **RF-003 — Senha própria:** permitir que um Usuário interno autenticado altere a própria senha após confirmar a senha atual ou possuir uma sessão recente válida.
- **RF-004 — Bootstrap:** criar exatamente um Administrador principal por procedimento idempotente de implantação, lendo usuário e senha de variáveis de ambiente.
- **RF-005 — Criar usuário:** permitir ao Administrador principal criar um Usuário interno com nome de exibição, nome de usuário único e senha inicial.
- **RF-006 — Administrar usuário:** permitir ao Administrador principal renomear, redefinir senha, ativar, desativar e excluir outro Usuário interno.
- **RF-007 — Proteção do administrador:** impedir que o Administrador principal remova, desative, exclua ou rebaixe a si próprio.
- **RF-008 — Usuário inativo:** impedir novas sessões e acesso a dados por usuário desativado, inclusive enquanto um token anterior ainda não expirou.
- **RF-009 — Histórico de autoria:** preservar a identificação histórica das ações quando uma credencial de usuário for excluída.

### 2.2 Empresas

- **RF-010 — Listar empresas:** exibir todas as Empresas com busca por razão social, apelido ou CNPJ e ordenação consistente.
- **RF-011 — Cadastrar empresa:** exigir razão social e CNPJ; aceitar apelido opcional.
- **RF-012 — Editar empresa:** permitir alteração de razão social, apelido e CNPJ respeitando validações e unicidade.
- **RF-013 — Consultar empresa:** concentrar dados cadastrais, despesas vigentes e histórico de solicitações/envios na ficha da Empresa.
- **RF-014 — Estado vazio:** explicar como cadastrar a primeira Empresa quando nenhuma existir.

### 2.3 Catálogo e seleção de despesas

- **RF-020 — Catálogo global:** apresentar um único Catálogo de despesas compartilhado por todas as Empresas, sem divisão por atividade econômica.
- **RF-021 — Criar item:** permitir a qualquer Usuário interno adicionar Item de despesa com nome não vazio.
- **RF-022 — Editar item:** permitir renomear e reordenar Item de despesa; a nova apresentação deve valer em todos os contextos.
- **RF-023 — Remover item:** apresentar a ação como exclusão, mas desativar logicamente o item e removê-lo das novas seleções.
- **RF-024 — Restaurar item:** permitir consultar itens inativos e reativá-los.
- **RF-025 — Seleção da empresa:** exibir itens ativos como checkboxes na ficha da Empresa e persistir a seleção individual.
- **RF-026 — Seleção em massa:** oferecer ações “Selecionar todos” e “Desmarcar todos”, pedindo confirmação quando a ação remover seleções com valores existentes.
- **RF-027 — Editar pelo contexto:** permitir criar e renomear itens globais enquanto o Usuário interno configura a Empresa, deixando explícito que a mudança afeta o Catálogo global.
- **RF-028 — Valores internos:** permitir editar o valor médio mensal e a observação de cada despesa selecionada na ficha da Empresa.
- **RF-029 — Histórico de item inativo:** continuar exibindo itens desativados em valores e Envios históricos, identificados como inativos e sem tratá-los como erro.

### 2.4 Solicitações e formulário público

- **RF-030 — Gerar solicitação:** permitir gerar uma Solicitação somente quando a Empresa possuir ao menos um Item de despesa ativo selecionado.
- **RF-031 — Dados iniciais:** incluir na Solicitação os itens selecionados e os valores/observações vigentes no instante da geração.
- **RF-032 — Novo link:** revogar automaticamente toda Solicitação pendente anterior da mesma Empresa ao gerar uma nova.
- **RF-033 — Compartilhar:** disponibilizar copiar URL, compartilhamento nativo quando suportado e abertura do WhatsApp com mensagem editável e URL preenchida.
- **RF-034 — Conferência:** mostrar razão social, apelido quando existir e CNPJ formatado ao Respondente, sem permitir sua edição.
- **RF-035 — Preenchimento:** para cada item elegível, aceitar valor médio mensal em BRL e observação opcional.
- **RF-036 — Confirmação:** mostrar o Conteúdo orientativo vigente, validar os dados e exigir confirmação explícita antes do Envio.
- **RF-037 — Envio único:** aceitar um único Envio por Link e apresentar uma conclusão sem disponibilizar acesso posterior.
- **RF-038 — Atualizar vigência:** após Envio válido, tornar seus valores e observações o estado vigente dos itens incluídos da Empresa.
- **RF-039 — Preservar envio:** armazenar o Envio original, seus itens e eventuais revisões como histórico imutável, separado do estado vigente.
- **RF-040 — Repetir coleta:** permitir gerar uma nova Solicitação depois de um Envio; ela deve começar com os valores vigentes já preenchidos.
- **RF-041 — Status do link:** distinguir internamente pendente, enviado, expirado e revogado; para o público, exibir mensagens neutras sem dados adicionais da Empresa.
- **RF-042 — Item desativado pendente:** se um item for desativado após a geração, não permitir novo valor para ele; manter o item e o valor inicial apenas como informação histórica da Solicitação.
- **RF-043 — Envio atômico:** consumir o Link, criar o histórico e atualizar valores vigentes em uma única transação.

### 2.5 Histórico e conteúdo

- **RF-050 — Histórico da empresa:** listar solicitações por data, status, criador, expiração e data de Envio.
- **RF-051 — Detalhar envio:** exibir todos os itens, valores e observações recebidos, inclusive itens atualmente inativos.
- **RF-052 — Auditoria:** registrar ações internas sensíveis: gestão de usuários, alteração de Empresa, Catálogo, seleção/valor, Conteúdo orientativo e geração/revogação de Link.
- **RF-053 — Editar conteúdo:** permitir a qualquer Usuário interno editar título, introdução, orientações IBS/CBS, aviso fiscal e mensagem final.
- **RF-054 — Conteúdo seguro:** aceitar texto simples com quebras de linha; não interpretar HTML fornecido pelo usuário.
- **RF-055 — Envio interno:** permitir ao Usuário interno registrar, na ficha da Empresa, os valores atuais como um novo Envio de origem interna, sem Link público.
- **RF-056 — Importar histórico:** permitir escolher um Envio ou sua revisão mais recente para preencher o estado vigente de Despesas da empresa, sem alterar o histórico.
- **RF-057 — Revisar envio:** permitir corrigir um Envio no detalhe, gravando uma nova revisão imutável e mantendo o original preservado para auditoria; o valor efetivo do histórico é o da revisão mais recente.

## 3. Regras de negócio

- **RN-001:** CNPJ é persistido com 14 dígitos, deve passar na validação dos dígitos verificadores e ser único entre Empresas.
- **RN-002:** nome de usuário é comparado sem diferença entre maiúsculas/minúsculas, normalizado para minúsculas e restrito a `a-z`, `0-9`, ponto, hífen e sublinhado, entre 3 e 40 caracteres.
- **RN-003:** senha criada ou redefinida deve possuir no mínimo 6 caracteres. Não registrar ou retornar a senha depois da operação.
- **RN-004:** somente o Administrador principal pode administrar credenciais de terceiros; novos usuários sempre têm papel de Usuário interno.
- **RN-005:** razão social tem 2–160 caracteres; apelido, quando presente, 1–100 caracteres.
- **RN-006:** nome de Item de despesa tem 2–160 caracteres e não pode duplicar, ignorando caixa e espaços externos, outro item ativo.
- **RN-007:** exclusão de Item de despesa é lógica. O identificador nunca é reutilizado e referências históricas nunca são apagadas em cascata.
- **RN-008:** uma Despesa da empresa desmarcada preserva seu último valor e observação, mas não integra novas Solicitações; ao ser marcada novamente, recupera esses dados.
- **RN-009:** valor pode ficar em branco ou ser zero; quando preenchido, deve estar entre R$ 0,00 e R$ 999.999.999.999,99, com no máximo duas casas decimais.
- **RN-010:** observação por item é opcional e limitada a 1.000 caracteres.
- **RN-011:** uma Solicitação expira exatamente 30 dias após a criação. A validação ocorre no servidor.
- **RN-012:** o token bruto só existe na URL devolvida na criação; o banco guarda somente digest criptográfico e nunca permite recuperá-lo depois.
- **RN-013:** gerar um novo Link revoga solicitações pendentes da Empresa, mas não altera Envios anteriores.
- **RN-014:** o conjunto de itens e os dados iniciais da Solicitação formam uma fotografia. O nome apresentado é resolvido pelo ID atual para que renomeações se propaguem.
- **RN-015:** item desativado depois da geração é exibido como indisponível e não é aceito na confirmação pública.
- **RN-016:** o Envio público não aceita itens que não façam parte da Solicitação e não altera despesas omitidas ou indisponíveis.
- **RN-017:** depois de enviado, expirado ou revogado, um Link não volta ao estado pendente; deve ser gerado outro.
- **RN-018:** edições internas posteriores à geração não podem ser sobrescritas por uma resposta pública que tenha sido carregada antes delas; a atualização pública usa controle otimista pela versão exibida.
- **RN-019:** datas de validade são calculadas a partir de instantes UTC; exibição usa o fuso local configurado.
- **RN-020:** não coletar IP, user-agent ou identidade pessoal do Respondente nesta versão.
- **RN-021:** um Envio interno exige Usuário interno ativo, não possui Solicitação nem token público e atualiza o estado vigente na mesma transação em que cria seu histórico.
- **RN-022:** revisões nunca alteram nem excluem o Envio original ou revisões anteriores; importar uma revisão altera somente o estado vigente.
- **RN-023:** na ficha da Empresa, Item de despesa inativo só aparece quando seu valor vigente é diferente de zero; itens ativos seguem visíveis independentemente do valor.

## 4. Matriz de permissões

| Recurso/ação         | Visitante |           Respondente com Link válido |               Usuário interno |               Administrador principal |
| -------------------- | --------: | ------------------------------------: | ----------------------------: | ------------------------------------: |
| Login                |       Sim |                                   Sim |                           Sim |                                   Sim |
| Empresas e valores   |       Não | Apenas conferência da sua Solicitação |                          CRUD |                                  CRUD |
| Catálogo e seleção   |       Não |       Apenas itens da sua Solicitação |                   CRUD lógico |                           CRUD lógico |
| Histórico            |       Não |                                   Não |                       Leitura |                               Leitura |
| Conteúdo orientativo |       Não |           Leitura do conteúdo público |               Leitura/escrita |                       Leitura/escrita |
| Gerar/revogar Link   |       Não |                                   Não |                           Sim |                                   Sim |
| Enviar Solicitação   |       Não |                               Uma vez |         Não pela área interna |                 Não pela área interna |
| Registrar Envio interno |    Não |                                  Não |                                Sim |                                  Sim |
| Editar/importar histórico | Não |                              Não |                                Sim |                                  Sim |
| Usuários internos    |       Não |                                   Não | Apenas o próprio perfil/senha | Gestão completa, exceto autoproteções |
| Auditoria            |       Não |                                   Não |                  Não permitido |                               Leitura |

## 5. Requisitos não funcionais

- **RNF-001 — Segurança:** aplicar menor privilégio, RLS e grants explícitos; negar acesso por padrão e manter operações privilegiadas fora do navegador.
- **RNF-002 — Sigilo:** nunca persistir senha em tabela própria, token público bruto ou segredo em código/log; mensagens de autenticação não revelam existência de usuário.
- **RNF-003 — Integridade:** garantir unicidade e invariantes também no banco, não apenas na interface; o consumo de Link é transacional e seguro contra concorrência.
- **RNF-004 — Privacidade:** coletar somente os dados definidos; não adicionar analytics, cookies não essenciais ou rastreamento do Respondente.
- **RNF-005 — Localização:** interface em `pt-BR`, moeda BRL, CNPJ formatado e datas legíveis no fuso `America/Sao_Paulo`.
- **RNF-006 — Responsividade:** todos os fluxos funcionam sem rolagem horizontal a partir de 360 px e aproveitam telas desktop de até pelo menos 1440 px.
- **RNF-007 — Acessibilidade:** navegação por teclado, foco visível, labels programáticos, erros associados, contraste compatível com WCAG 2.2 AA e ausência de informação transmitida apenas por cor.
- **RNF-008 — Compatibilidade:** suportar as duas versões estáveis mais recentes de Chrome, Edge, Firefox e Safari na data da entrega.
- **RNF-009 — Desempenho:** paginação/limite nas listagens; evitar buscar histórico detalhado antes de solicitado; apresentar feedback visual em operações acima de 300 ms.
- **RNF-010 — Resiliência:** erros de rede não podem produzir confirmação falsa nem envio duplicado; permitir tentar novamente quando o servidor confirmar que o Link continua pendente.
- **RNF-011 — Observabilidade:** registrar falhas de Edge Functions com identificador de correlação, sem valores financeiros, tokens ou senhas; ações de negócio sensíveis vão para auditoria.
- **RNF-012 — Manutenibilidade:** TypeScript estrito, migrations reproduzíveis, interfaces documentadas e testes dos fluxos e regras críticos.
- **RNF-013 — Implantação:** build do frontend é estático e configurável por ambiente; banco e funções podem ser recriados a partir do repositório, exceto segredos.
- **RNF-014 — Disponibilidade:** não prometer SLA no plano gratuito; a interface deve distinguir indisponibilidade temporária de credencial inválida.

## 6. Catálogo inicial

Criar, nesta ordem:

1. Material de embalagem
2. Material de limpeza usado na loja
3. Material de escritório
4. Computadores, impressoras e equipamentos da empresa
5. Móveis e equipamentos para a loja
6. Sistema/ERP/software contratado
7. Conta de água da empresa
8. Serviços de TI
9. Marketing/publicidade
10. Serviços de manutenção da loja
11. Segurança/vigilância
12. Energia elétrica da loja
13. Internet/telefone empresarial
14. Aluguel do imóvel comercial
15. Serviços jurídicos
16. Serviços de limpeza terceirizados
17. Frete de mercadorias
18. Serviços de transportadora
19. Combustível utilizado na atividade
20. Uniformes dos funcionários
21. EPI
22. Vale-transporte
23. Vale-refeição/alimentação

## 7. Conteúdo orientativo inicial

O seed deve manter este conteúdo editável, permitindo revisão editorial antes da publicação:

**Título:** Informações para análise do planejamento tributário 2027

**Introdução:**

> Para que possamos analisar de forma mais aproximada qual modelo seria recomendável para sua empresa, precisamos dos valores médios mensais das despesas selecionadas. Valores anteriores a janeiro de 2027 não geram créditos para esta análise.

**Orientações IBS/CBS:**

> A regra central está no art. 47 da LC 214: o crédito corresponde, em geral, ao IBS/CBS da aquisição, e a operação precisa estar documentada por documento fiscal eletrônico idôneo.
>
> Não se trata de pegar todas as despesas da empresa e aplicar a alíquota. Os documentos fiscais devem estar no CNPJ da empresa e com destaque do IBS e da CBS.
>
> Salários e pró-labore não geram crédito porque não há IBS/CBS sobre a folha. Despesas pessoais dos sócios, casa, carro e despesas particulares também não geram, salvo situações específicas em que o bem ou serviço seja utilizado preponderantemente na atividade econômica, conforme os critérios legais.
>
> Aluguel depende da tributação do locador e da operação. Plano de saúde e alimentação de funcionários dependem das situações e regras aplicáveis.

**Aviso fiscal:**

> As informações serão analisadas pelo escritório e não representam, isoladamente, confirmação de crédito tributário. A documentação fiscal e as regras aplicáveis a cada operação deverão ser verificadas.

**Mensagem final:**

> Informações recebidas com sucesso. O escritório dará continuidade à análise.

O responsável contábil deve validar o texto antes do uso em produção. O software não deve transformar essas afirmações em regras automáticas.

## 8. Critérios de aceitação dos fluxos

### CA-01 — Empresa e seleção

Dado um Usuário interno autenticado, quando ele cadastrar uma Empresa com CNPJ válido e marcar três itens, então a ficha deve manter os três selecionados após recarregar. CNPJ inválido ou duplicado deve ser rejeitado sem salvar parcialmente.

### CA-02 — Evolução do catálogo

Dado um item presente em um Envio antigo, quando o item for renomeado, então o novo nome aparece no histórico. Quando for desativado, ele deixa de ser selecionável, permanece visível no histórico e é marcado como inativo.

### CA-03 — Primeiro Envio

Dada uma Empresa com itens selecionados, quando o usuário gerar e compartilhar o Link e o Respondente confirmar dados válidos dentro de 30 dias, então o Link é consumido, o Envio é preservado e os valores tornam-se vigentes.

### CA-04 — Nova coleta

Dado um Envio anterior, quando for gerado novo Link, então os valores e observações vigentes aparecem preenchidos; confirmar o novo Envio cria outro histórico sem alterar o anterior.

### CA-05 — Uso único e concorrência

Dadas duas confirmações simultâneas para o mesmo Link, somente uma transação deve ser aceita. A outra recebe estado “já utilizado” e não cria nem atualiza registros.

### CA-06 — Revogação e expiração

Dado um Link pendente, gerar outro o revoga imediatamente. Um Link revogado ou com mais de 30 dias não revela dados da Empresa e não aceita Envio.

### CA-07 — Permissões

Dado um Usuário interno comum, acessar gestão de usuários pela rota, Data API ou função deve ser negado. O Administrador principal consegue gerir terceiros, mas não excluir ou desativar a si próprio.

### CA-08 — Mobile e acessibilidade

Em 360 px, o login, cadastro, seleção, compartilhamento e formulário público devem funcionar sem rolagem horizontal. Todos os campos e ações essenciais devem ser utilizáveis por teclado e possuir nome acessível.

### CA-09 — Fluxo interno e concorrência

Dado um Usuário interno, quando ele registrar valores na ficha da Empresa, então um Envio interno aparece no Histórico e pode ser importado posteriormente. Ao editar um Envio, o original permanece inalterado e a correção aparece como revisão. Um Item inativo sem valor vigente diferente de zero não aparece na coleta da Empresa. Se a contabilidade alterar um valor depois de o formulário público ser carregado, uma confirmação pública antiga não sobrescreve essa última alteração.

## 9. Fora do escopo da versão 1

- Conta, autenticação, área permanente ou recuperação do Envio pelo Respondente.
- Exportação CSV/Excel ou geração de PDF.
- Upload, OCR ou armazenamento de documentos fiscais.
- Cálculo, simulação ou recomendação automática de regime/crédito tributário.
- Catálogos diferentes para comércio, serviços ou indústria.
- Competências mensais, séries temporais ou intervalos de referência; existe apenas a média vigente e o Histórico de envios.
- Envio automático por API oficial do WhatsApp, e-mail ou SMS.
- Fluxo de aprovação, comentários internos, notificações e múltiplos níveis administrativos.
- Exclusão de Empresas e de histórico; essa política deverá ser decidida antes de ser adicionada.
- Importação de planilhas ou integração com ERP.

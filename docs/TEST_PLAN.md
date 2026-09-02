# Plano de testes

## 1. Estratégia

A segurança não pode depender apenas de E2E. Distribuir a cobertura:

- **Unitário:** validações, normalizações, moeda, stores e estados derivados.
- **Componente:** formulários, listas, confirmação e acessibilidade básica.
- **Banco/pgTAP:** constraints, transações, RLS, grants, triggers e concorrência.
- **Edge Functions:** autenticação, validação, contratos, compensação e respostas seguras.
- **E2E/Playwright:** fluxos completos nos papéis e viewports suportados.
- **Manual:** revisão visual, leitor de tela, produção e procedimentos operacionais.

Não perseguir percentual isolado de cobertura. Toda regra de negócio e todo limite de autorização devem ter teste direto, incluindo negação.

## 2. Dados e utilitários

### CNPJ

- Aceitar CNPJ válido digitado com ou sem máscara e persistir 14 dígitos.
- Rejeitar quantidade incorreta, caracteres indevidos, dígitos repetidos e verificadores inválidos.
- Rejeitar duplicado mesmo quando a máscara difere.

### Usuário e senha

- Normalizar trim/caixa e aceitar apenas caracteres de RN-002.
- Tratar `joao` e `JOAO` como o mesmo usuário.
- Rejeitar senhas abaixo de 6 caracteres sem incluir a senha em snapshot/log.
- Derivar o mesmo endereço técnico no navegador, bootstrap e Edge Function.

### Moeda e observação

- Converter `1.234,56` para `1234.56` e formatar retorno como `R$ 1.234,56`.
- Aceitar vazio e zero; rejeitar negativo, mais de duas casas e valor acima do limite.
- Não usar ponto flutuante em comparação/payload persistente.
- Validar observação vazia, limite exato e excedente de 1.000 caracteres.

## 3. Banco de dados

### Constraints e ciclo de vida

- Impedir dois CNPJs iguais, dois usuários iguais e dois itens ativos com mesmo nome normalizado.
- Impedir segundo Administrador não excluído.
- Impedir mais de uma Solicitação pendente por Empresa.
- Impedir `UPDATE`/`DELETE` em Envios e itens enviados.
- Preservar relações ao desativar Item e excluir identidade Auth.
- Desmarcar/reselecionar despesa preserva valor e observação.

### Matriz RLS/grants

Para cada tabela/operação relevante, testar:

| Identidade      | Leitura interna |  Escrita de negócio | Gestão de usuários | Histórico/auditoria | Acesso público direto |
| --------------- | --------------: | ------------------: | -----------------: | ------------------: | --------------------: |
| `anon`          |            Nega |                Nega |               Nega |                Nega |                  Nega |
| Auth sem perfil |            Nega |                Nega |               Nega |                Nega |                  Nega |
| Usuário inativo |            Nega |                Nega |               Nega |                Nega |                  Nega |
| Usuário ativo   |         Permite | Conforme requisitos |               Nega |             Leitura |                  Nega |
| Administrador   |         Permite |             Permite | Somente via função |             Leitura |                  Nega |

Também testar chamadas diretas a RPCs internas: `PUBLIC`, `anon` e `authenticated` não devem executá-las fora das interfaces previstas.

### Transação pública

- Link válido cria exatamente um Envio e atualiza somente itens elegíveis.
- Payload com item extra, repetido ou pertencente a outra Solicitação falha sem escrita parcial.
- Item desativado é ignorado/rejeitado segundo contrato e não atualiza vigência.
- Falha provocada no meio da transação não consome Link nem deixa histórico parcial.
- Duas transações simultâneas: uma confirma; outra recebe estado terminal; existe um Envio.
- Instante igual/posterior a `expires_at` não confirma.

## 4. Edge Functions

### `manage-user`

- Sem JWT, JWT comum, usuário inativo e Administrador válido.
- Criar usuário, conflito de nome e falha do Auth com compensação.
- Renomear atualiza Auth e perfil coerentemente.
- Redefinir senha não retorna nem registra senha.
- Desativar bloqueia sessão ainda vigente.
- Impedir qualquer ação destrutiva do Administrador contra si.
- Excluir remove identidade e preserva tombstone/autoria.

### `create-form-request`

- Negar anônimo/inativo e Empresa inexistente.
- Negar Empresa sem itens ativos selecionados.
- Criar 32 bytes aleatórios, persistir somente digest e retornar `/f#<token>`, sem expor o token no path ou query string.
- Nova criação revoga pendente anterior.
- Fotografar itens/valores/observações/ordem corretamente.
- Nunca oferecer endpoint para recuperar URL/token antigo.

### `public-form`

- CORS permitido/negado, método inválido, corpo ausente, maior que 64 KiB e JSON inválido.
- Token aleatório, malformado, desconhecido, expirado, revogado e utilizado retornam resposta neutra.
- `load` válido retorna somente dados daquela Solicitação.
- `submit` exige `confirmed: true` e valida todos os campos.
- Logs contêm correlação, mas não token, CNPJ, valores ou observações.

### `internal-submission`

- JWT ausente, usuário inativo e payload inválido são negados; Usuário interno ativo é aceito.
- Criar Envio interno atualiza a vigência e cria somente uma fotografia histórica.
- Revisar cria `submission_revisions`/itens append-only sem alterar o original; salvar e descartar são distintos.
- Importar original ou revisão atualiza a vigência sem alterar qualquer histórico.
- IDs fora da Empresa/Envio, duplicados, itens inativos sem valor e valores inválidos falham atomicamente.

## 5. Componentes e acessibilidade

- Campos apresentam label, descrição e erro associados.
- Modal de confirmação prende foco, fecha por ação previsível e devolve foco ao acionador.
- Checkboxes são operáveis por teclado e seleção em massa anuncia quantidade.
- Item inativo não depende apenas de cor.
- Formulário monetário preserva entrada válida durante digitação e anuncia erro no blur/envio.
- HTML inserido no Conteúdo orientativo aparece como texto, não como elemento executável.
- Botões desabilitados informam o motivo quando ele não for evidente.

## 6. Cenários E2E

Executar ao menos em Chromium com viewports 360×800 e 1440×900; executar suíte essencial também em Firefox e WebKit.

1. Bootstrap/login do Administrador, criação de usuário e login dele.
2. Usuário comum bloqueado na rota e chamada de gestão de usuários.
3. Cadastro de Empresa, validação de CNPJ e busca por razão/apelido/CNPJ.
4. Seleção individual e em massa, valor/observação, recarregamento e persistência.
5. Renomear item; conferir propagação. Desativar; conferir histórico e ausência em nova seleção.
6. Gerar Link, copiar/compartilhar e carregar formulário público sem sessão.
7. Preencher, confirmar, ver sucesso e falhar ao reutilizar o Link.
8. Gerar nova Solicitação e conferir valores anteriores preenchidos.
9. Gerar dois Links sucessivos e confirmar que apenas o último funciona.
10. Forçar validade vencida e conferir mensagem sem dados da Empresa.
11. Editar conteúdo, visualizar texto escapado e conferir fotografia no Envio.
12. Desativar usuário com sessão aberta e confirmar bloqueio na próxima chamada.
13. Registrar um Envio interno, editar criando revisão, descartar edição e importar a revisão mais recente.
14. Carregar formulário público, editar a mesma despesa na contabilidade, recarregar e confirmar que o valor atualizado aparece; submeter payload antigo e confirmar que a edição posterior permanece vigente.

## 7. Checks não funcionais

- Sem rolagem horizontal nos fluxos de CA-08.
- Navegação completa por teclado e foco visível.
- Auditoria de dependências e nenhuma vulnerabilidade crítica conhecida sem justificativa.
- Buscar no bundle e artefatos por nomes de segredos/valores de teste privilegiados.
- Verificar `Referrer-Policy`, `X-Content-Type-Options`, `Content-Security-Policy` compatível e `noindex` na rota pública.
- Simular offline/timeout antes e depois do clique em enviar; nunca mostrar sucesso sem confirmação do servidor.
- Listagens paginam e detalhes históricos carregam sob demanda.

## 8. Gate de entrega

Bloquear publicação quando qualquer item ocorrer:

- lint, typecheck, unitários, banco, funções, E2E essencial ou build falha;
- migration não recria banco limpo;
- uma política de acesso não possui teste negativo;
- token bruto, senha ou `service_role` aparece em Git, bundle ou logs;
- revisão contábil do texto ainda não foi registrada;
- smoke test no ambiente-alvo não conclui login, geração e Envio.

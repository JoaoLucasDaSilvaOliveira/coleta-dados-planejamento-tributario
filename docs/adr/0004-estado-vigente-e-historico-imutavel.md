---
status: accepted
---

# Estado vigente separado do histórico imutável

Os valores mais recentes ficarão em Despesas da empresa para consulta e pré-preenchimento, enquanto cada Envio será preservado como fotografia imutável. Essa separação oferece uma ficha simples para o trabalho diário sem perder rastreabilidade quando o Respondente ou um Usuário interno atualizar valores posteriormente.

## Consequências

O Envio atualiza o estado vigente na mesma transação em que cria o histórico. Correções internas não alteram Envios anteriores, e a auditoria registra a sequência quando uma edição feita após a geração do Link for substituída por uma resposta válida.

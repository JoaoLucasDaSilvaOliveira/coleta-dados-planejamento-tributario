---
status: accepted
---

# Catálogo global com IDs estáveis

Haverá um Catálogo de despesas único e editável, enquanto cada Empresa manterá sua própria seleção por ID. Itens serão desativados, não apagados, e renomeações serão resolvidas pelo ID atual; isso permite evolução global sem esconder ou quebrar valores e Envios já registrados.

## Considered Options

Uma cópia integral do catálogo por Empresa permitiria nomes divergentes e tornaria correções globais imprevisíveis. Remoção física simplificaria consultas correntes, mas destruiria a semântica do histórico.

## Consequências

Consultas e interfaces precisam tratar itens inativos como estado normal. IDs não podem ser reutilizados, e qualquer exclusão física futura exigirá política explícita de retenção.


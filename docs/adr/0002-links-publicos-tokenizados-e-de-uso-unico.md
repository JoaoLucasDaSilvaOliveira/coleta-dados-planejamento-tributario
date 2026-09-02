---
status: accepted
---

# Links públicos tokenizados e de uso único

O Respondente não terá conta: cada Solicitação será acessada por um bearer token aleatório, válido por 30 dias e consumido em um único Envio. O banco guardará somente o digest do token, uma nova Solicitação revogará a pendente anterior e a confirmação será atômica, equilibrando baixa fricção no WhatsApp com exposição limitada caso a URL vaze.

## Considered Options

Login do Respondente foi adiado porque ampliaria cadastro, suporte e recuperação de senha; um link global reutilizável foi rejeitado por não identificar a Empresa com segurança nem impedir envios indevidos.

## Consequências

Quem possuir a URL enquanto ela estiver válida poderá responder em nome da Empresa. URLs perdidas não são recuperadas: é necessário gerar outra, e uma proteção futura por OTP exigirá nova decisão.


insert into public.expense_items (name, sort_order)
select source.name, source.sort_order
from (values
  ('Material de embalagem', 1),
  ('Material de limpeza usado na loja', 2),
  ('Material de escritório', 3),
  ('Computadores, impressoras e equipamentos da empresa', 4),
  ('Móveis e equipamentos para a loja', 5),
  ('Sistema/ERP/software contratado', 6),
  ('Conta de água da empresa', 7),
  ('Serviços de TI', 8),
  ('Marketing/publicidade', 9),
  ('Serviços de manutenção da loja', 10),
  ('Segurança/vigilância', 11),
  ('Energia elétrica da loja', 12),
  ('Internet/telefone empresarial', 13),
  ('Aluguel do imóvel comercial', 14),
  ('Serviços jurídicos', 15),
  ('Serviços de limpeza terceirizados', 16),
  ('Frete de mercadorias', 17),
  ('Serviços de transportadora', 18),
  ('Combustível utilizado na atividade', 19),
  ('Uniformes dos funcionários', 20),
  ('EPI', 21),
  ('Vale-transporte', 22),
  ('Vale-refeição/alimentação', 23)
) as source(name, sort_order)
where not exists (select 1 from public.expense_items existing where lower(btrim(existing.name::text)) = lower(btrim(source.name)));

insert into public.form_content (id, title, introduction, ibs_cbs_guidance, tax_notice, success_message)
values (
  true,
  'Informações para análise do planejamento tributário 2027',
  'Para que possamos analisar de forma mais aproximada qual modelo seria recomendável para sua empresa, precisamos dos valores médios mensais das despesas selecionadas. Valores anteriores a janeiro de 2027 não geram créditos para esta análise.',
  E'A regra central está no art. 47 da LC 214: o crédito corresponde, em geral, ao IBS/CBS da aquisição, e a operação precisa estar documentada por documento fiscal eletrônico idôneo.\n\nNão se trata de pegar todas as despesas da empresa e aplicar a alíquota. Os documentos fiscais devem estar no CNPJ da empresa e com destaque do IBS e da CBS.\n\nSalários e pró-labore não geram crédito porque não há IBS/CBS sobre a folha. Despesas pessoais dos sócios, casa, carro e despesas particulares também não geram, salvo situações específicas em que o bem ou serviço seja utilizado preponderantemente na atividade econômica, conforme os critérios legais.\n\nAluguel depende da tributação do locador e da operação. Plano de saúde e alimentação de funcionários dependem das situações e regras aplicáveis.',
  'As informações serão analisadas pelo escritório e não representam, isoladamente, confirmação de crédito tributário. A documentação fiscal e as regras aplicáveis a cada operação deverão ser verificadas.',
  'Informações recebidas com sucesso. O escritório dará continuidade à análise.'
)
on conflict (id) do nothing;

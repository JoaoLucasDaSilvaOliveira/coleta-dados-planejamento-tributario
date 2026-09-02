revoke all on function public.create_form_request_transaction(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.submit_form_transaction(text, jsonb) from public, anon, authenticated;
revoke all on function public.revoke_form_request_transaction(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_form_request_transaction(uuid, text, uuid) to service_role;
grant execute on function public.submit_form_transaction(text, jsonb) to service_role;
grant execute on function public.revoke_form_request_transaction(uuid, uuid) to service_role;

-- pg_net faz requisicoes HTTP a partir do banco: so o cron (postgres) precisa. Clientes nao.
-- ATENCAO: sem efeito na pratica. O schema net e as funcoes sao do supabase_admin, que concede
-- USAGE/EXECUTE a PUBLIC; o papel postgres nao pode revogar concessoes de outro grantor.
-- Risco residual baixo: o schema net nao e exposto pela API (PostgREST/GraphQL so expoem public).
-- Nao criar funcao em public que chame net.* com parametro vindo do cliente.
revoke usage on schema net from anon, authenticated;
revoke execute on all functions in schema net from anon, authenticated;
alter default privileges in schema net revoke execute on functions from anon, authenticated;

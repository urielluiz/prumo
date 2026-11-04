-- Minimizacao de dados: lembretes e timers ja enviados nao ficam guardados.
select cron.schedule('prumo-cleanup', '17 4 * * *', $$
  delete from public.prumo_reminders where sent and fire_at < now() - interval '2 days';
  delete from public.prumo_timers where sent and ends_at < now() - interval '1 day';
$$);

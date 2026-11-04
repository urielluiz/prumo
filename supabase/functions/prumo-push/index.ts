import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// So envia para servicos de push conhecidos (o banco ja recusa outros; aqui e a segunda camada contra SSRF).
const PUSH_HOST = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
function pushOk(endpoint: string): boolean {
  try { const u = new URL(endpoint); return u.protocol === "https:" && !u.port && !u.username && PUSH_HOST.test(u.hostname); } catch { return false; }
}
// Comparacao em tempo constante para o segredo do cron.
function same(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}
const cut = (s: unknown, n: number) => String(s ?? "").slice(0, n);

// Chamada a cada 10 s pelo pg_cron, apenas quando existe timer ou lembrete vencido.
Deno.serve(async (req: Request) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cfg, error: ce } = await sb.from("prumo_private").select("key,value");
  if (ce || !cfg) return new Response("config", { status: 500 });
  const c: Record<string, string> = Object.fromEntries(cfg.map((r: any) => [r.key, r.value]));
  if (!c.cron_secret || !same(req.headers.get("x-cron-secret") ?? "", c.cron_secret)) return new Response("forbidden", { status: 403 });
  webpush.setVapidDetails("https://urielluiz.github.io/prumo", c.vapid_public, c.vapid_private);

  let sent = 0, failed = 0, skipped = 0;
  async function push(userId: string, payload: Record<string, string>, ttl: number) {
    const { data: subs } = await sb.from("prumo_push_subs").select("endpoint,p256dh,auth").eq("user_id", userId).limit(10);
    for (const s of subs ?? []) {
      if (!pushOk(s.endpoint)) { skipped++; continue; }
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: ttl, urgency: "high", timeout: 10000 });
        sent++;
      } catch (e: any) {
        failed++;
        if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("prumo_push_subs").delete().eq("endpoint", s.endpoint);
        else console.log("push error", e?.statusCode);
      }
    }
  }
  const url = (u: unknown) => (u === "./?retro=1" || u === "./?fechar=1" ? u : "./");

  // 1) timers vencidos (folga de 4 s para o app cancelar primeiro)
  const cutoff = new Date(Date.now() - 4000).toISOString();
  const { data: due, error } = await sb.from("prumo_timers").update({ sent: true }).eq("sent", false).lte("ends_at", cutoff).select();
  if (error) return new Response("db", { status: 500 });
  for (const t of due ?? []) await push(t.user_id, { title: cut(t.title, 200), body: cut(t.body, 1000), tag: "prumo-timer", url: "./" }, 300);

  // 2) resumo do dia e retro da semana: ignora os que venceram ha mais de 2 h
  const { data: rem } = await sb.from("prumo_reminders").update({ sent: true }).eq("sent", false).lte("fire_at", new Date().toISOString()).select();
  for (const r of rem ?? []) {
    if (Date.now() - Date.parse(r.fire_at) > 2 * 3600 * 1000) { skipped++; continue; }
    await push(r.user_id, { title: cut(r.title, 200), body: cut(r.body, 1000), tag: r.kind === "wrap" ? "prumo-wrap" : r.kind === "close" ? "prumo-close" : "prumo-day", url: url(r.url) }, 3600);
  }
  return new Response(JSON.stringify({ timers: due?.length ?? 0, reminders: rem?.length ?? 0, sent, failed, skipped }), { headers: { "Content-Type": "application/json" } });
});

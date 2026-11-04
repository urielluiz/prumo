import { createClient } from "npm:@supabase/supabase-js@2";

// Exclui a conta de quem chama: foto no Storage e o usuario (as tabelas prumo_* caem junto por ON DELETE CASCADE).
// Exige login com senha (ou codigo) nos ultimos 5 minutos, conferido pelo amr do token, que nao muda no refresh,
// e o segundo fator (aal2) quando a conta usa verificacao em duas etapas.
const ORIGINS = new Set(["https://urielluiz.github.io"]);
const FRESH_SECONDS = 300;

function cors(origin: string | null): Record<string, string> {
  if (!origin || !ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}
function claims(jwt: string): Record<string, unknown> | null {
  try {
    const p = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(p + "=".repeat((4 - p.length % 4) % 4)));
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  const out = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: h });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return out(405, { error: "method" });
  if (!h["Access-Control-Allow-Origin"]) return out(403, { error: "origin" });

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return out(401, { error: "auth" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u, error: ue } = await admin.auth.getUser(jwt); // valida o token no servidor de autenticacao
  if (ue || !u?.user) return out(401, { error: "auth" });

  const amr = (claims(jwt)?.amr ?? []) as Array<{ method?: string; timestamp?: number }>;
  const now = Date.now() / 1000;
  const fresh = Array.isArray(amr) && amr.some((m) => (m.method === "password" || m.method === "otp") && typeof m.timestamp === "number" && now - m.timestamp < FRESH_SECONDS);
  if (!fresh) return out(403, { error: "reauth" });
  // conta com verificacao em duas etapas: o token precisa ter passado pelo codigo (aal2)
  const mfa = (u.user.factors ?? []).some((f) => f.status === "verified");
  if (mfa && claims(jwt)?.aal !== "aal2") return out(403, { error: "mfa" });

  const id = u.user.id;
  const { data: files, error: le } = await admin.storage.from("avatars").list(id);
  if (le) return out(500, { error: "storage" });
  if (files && files.length) {
    const { error: re } = await admin.storage.from("avatars").remove(files.map((f) => id + "/" + f.name));
    if (re) return out(500, { error: "storage" });
  }
  const { error: de } = await admin.auth.admin.deleteUser(id);
  if (de) return out(500, { error: "delete" });
  return out(200, { ok: true });
});

// delete-account: remove the caller's files and auth user (tables cascade from auth.users).
// Requires { confirm: "DELETE" } and an aal2 session when MFA is enrolled.
import { createClient } from 'npm:@supabase/supabase-js@2.46.1';
import { corsHeaders, env, json, jwtClaims } from '../_shared/http.ts';

const BUCKETS = ['receipts', 'documents', 'wallpapers'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { ok: false, error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(req, { ok: false, error: 'unauthorized' }, 401);

  const url = env('SUPABASE_URL');
  const userClient = createClient(url, env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return json(req, { ok: false, error: 'unauthorized' }, 401);
  const user = data.user;

  const body = await req.json().catch(() => null);
  if (body?.confirm !== 'DELETE') return json(req, { ok: false, error: 'bad_request' }, 400);

  const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  const verified = (user.factors ?? []).some((f) => f.status === 'verified');
  if (verified && jwtClaims(authHeader).aal !== 'aal2') return json(req, { ok: false, error: 'mfa_required' }, 403);

  for (const bucket of BUCKETS) {
    for (;;) {
      const { data: objects, error: listErr } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
      if (listErr) return json(req, { ok: false, error: 'storage_error' }, 500);
      if (!objects || objects.length === 0) break;
      const { error: rmErr } = await admin.storage.from(bucket).remove(objects.map((o) => `${user.id}/${o.name}`));
      if (rmErr) return json(req, { ok: false, error: 'storage_error' }, 500);
      if (objects.length < 1000) break;
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json(req, { ok: false, error: 'delete_failed' }, 500);
  return json(req, { ok: true });
});

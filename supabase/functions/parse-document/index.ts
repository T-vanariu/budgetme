// parse-document: read one of the caller's own receipts / quotations with a vision model.
// Flow and limits: blueprint §7.2–7.4. Errors are typed so the UI can fall back to manual entry.
import { createClient } from 'npm:@supabase/supabase-js@2.46.1';
import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';
import { z } from 'npm:zod@3.23.8';
import { corsHeaders, env, json } from '../_shared/http.ts';
import {
  costMicros,
  outputSchema,
  startOfUtcDay,
  startOfUtcMonth,
  systemPrompt,
  validateModelOutput,
  type DocKind,
} from './extract.ts';

type ErrorCode =
  | 'not_found'
  | 'cap_reached'
  | 'daily_limit'
  | 'timeout'
  | 'invalid_output'
  | 'low_confidence'
  | 'refused'
  | 'provider_error';

// Models that accept the server-side refusal fallback (`fallbacks: "default"`).
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

const Body = z.object({ receiptId: z.string().uuid() });

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
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(req, { ok: false, error: 'unauthorized' }, 401);
  const userId = userData.user.id;

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return json(req, { ok: false, error: 'bad_request' }, 400);

  // Load through the user's client: RLS (owner + MFA) decides whether they may touch this row.
  const { data: receipt } = await userClient
    .from('receipts')
    .select('id, user_id, bucket_id, storage_path, kind, mime, status')
    .eq('id', body.data.receiptId)
    .maybeSingle();
  if (!receipt || receipt.user_id !== userId) return json(req, { ok: false, error: 'not_found' satisfies ErrorCode }, 404);

  const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const fail = async (error: ErrorCode, extra: Record<string, unknown> = {}) => {
    await admin.from('receipts').update({ status: 'failed', error }).eq('id', receipt.id);
    return json(req, { ok: false, error, ...extra });
  };

  // Inner guards: per-user daily scans, app-wide monthly US$ cap.
  const now = new Date();
  const dailyLimit = Number(env('SCAN_DAILY_LIMIT', '30'));
  const { count: todayCount } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfUtcDay(now));
  if ((todayCount ?? 0) >= dailyLimit) return fail('daily_limit');

  const capMicros = Number(env('AI_MONTHLY_CAP_USD', '5')) * 1_000_000;
  const { data: monthRows, error: monthErr } = await admin
    .from('ai_usage')
    .select('cost_usd_micros')
    .gte('created_at', startOfUtcMonth(now));
  if (monthErr) return fail('provider_error');
  const spent = (monthRows ?? []).reduce((a, r) => a + Number(r.cost_usd_micros), 0);
  if (spent >= capMicros) return fail('cap_reached');

  await admin.from('receipts').update({ status: 'parsing', error: null }).eq('id', receipt.id);

  const file = await admin.storage.from(receipt.bucket_id).download(receipt.storage_path);
  if (file.error || !file.data) return fail('not_found');
  const data = encodeBase64(new Uint8Array(await file.data.arrayBuffer()));

  const { data: cats } = await userClient.from('categories').select('name').eq('is_hidden', false).order('name');
  const categoryNames = (cats ?? []).map((c) => c.name as string);

  const model = env('AI_MODEL', 'claude-opus-5-5');
  const client = new Anthropic({
    apiKey: env('AI_API_KEY'),
    timeout: Number(env('AI_TIMEOUT_MS', '20000')),
    maxRetries: 1,
  });

  const fileBlock =
    receipt.mime === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : { type: 'image', source: { type: 'base64', media_type: receipt.mime, data } };

  const params: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    system: systemPrompt(receipt.kind as DocKind),
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: outputSchema(categoryNames) },
    },
    messages: [
      {
        role: 'user',
        content: [fileBlock, { type: 'text', text: `Allowed categories: ${categoryNames.join(', ')}. Return the JSON only.` }],
      },
    ],
  };
  if (FALLBACK_MODELS.has(model)) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  let response: Anthropic.Beta.BetaMessage;
  try {
    // Params include fields newer than this SDK's types (fallbacks), so the call is untyped.
    // deno-lint-ignore no-explicit-any
    response = await (client.beta.messages as any).create(params);
  } catch (e) {
    if (e instanceof Anthropic.APIConnectionTimeoutError) return fail('timeout');
    console.error('provider error', e instanceof Anthropic.APIError ? e.status : 'network');
    return fail('provider_error');
  }

  // Record spend for every completed call, whatever the outcome.
  const inTok = response.usage?.input_tokens ?? 0;
  const outTok = response.usage?.output_tokens ?? 0;
  await admin.from('ai_usage').insert({
    user_id: userId,
    receipt_id: receipt.id,
    model: response.model ?? model,
    input_tokens: inTok,
    output_tokens: outTok,
    cost_usd_micros: costMicros(
      inTok,
      outTok,
      Number(env('AI_PRICE_INPUT_PER_MTOK', '4')),
      Number(env('AI_PRICE_OUTPUT_PER_MTOK', '20')),
    ),
  });

  if (response.stop_reason === 'refusal') return fail('refused');
  if (response.stop_reason === 'max_tokens') return fail('invalid_output');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') return fail('invalid_output');

  const result = validateModelOutput(text.text, categoryNames);
  if (!result.ok) return fail('invalid_output');

  const floor = Number(env('CONFIDENCE_FLOOR', '0.6'));
  if (result.parsed.confidence < floor) {
    await admin.from('receipts').update({ status: 'failed', error: 'low_confidence', parsed: result.parsed }).eq('id', receipt.id);
    return json(req, { ok: false, error: 'low_confidence' satisfies ErrorCode, parsed: result.parsed });
  }

  await admin.from('receipts').update({ status: 'parsed', parsed: result.parsed, error: null }).eq('id', receipt.id);
  return json(req, { ok: true, parsed: result.parsed });
});

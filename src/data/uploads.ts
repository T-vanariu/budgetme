import { useQuery } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/auth';
import { RECEIPT_MAX_PX, SIGNED_URL_TTL } from '@/config/limits';
import { reencodeImage } from '@/lib/files';
import type { DocKind, ParsedDocument } from '@/types/domain';

export interface UploadedDoc {
  receiptId: string;
  previewUrl: string;
  isPdf: boolean;
}

/** Upload a receipt / quotation into the caller's private folder and create its `receipts` row. */
export async function uploadDocument(file: File, kind: DocKind, userId: string): Promise<UploadedDoc> {
  const isPdf = file.type === 'application/pdf';
  const body: Blob = isPdf ? file : await reencodeImage(file, RECEIPT_MAX_PX, 'image/jpeg', 0.85);
  const ext = isPdf ? 'pdf' : 'jpg';
  const bucket = kind === 'receipt' ? 'receipts' : 'documents';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const up = await supabase.storage.from(bucket).upload(path, body, { contentType: body.type || file.type, upsert: false });
  if (up.error) throw up.error;

  const { data, error } = await supabase
    .from('receipts')
    .insert({ bucket_id: bucket, storage_path: path, kind, mime: body.type || file.type, bytes: body.size })
    .select('id')
    .single();
  if (error) {
    await supabase.storage.from(bucket).remove([path]);
    throw error;
  }
  return { receiptId: data.id as string, previewUrl: URL.createObjectURL(body), isPdf };
}

export type ParseError =
  | 'not_found' | 'cap_reached' | 'daily_limit' | 'timeout' | 'invalid_output'
  | 'low_confidence' | 'refused' | 'provider_error' | 'unavailable';

export type ParseResult = { ok: true; parsed: ParsedDocument } | { ok: false; error: ParseError; parsed?: ParsedDocument };

export async function parseDocument(receiptId: string): Promise<ParseResult> {
  const { data, error } = await supabase.functions.invoke('parse-document', { body: { receiptId } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (body?.error) return { ok: false, error: body.error as ParseError };
    }
    return { ok: false, error: 'unavailable' };
  }
  return data as ParseResult;
}

export const PARSE_MESSAGES: Record<ParseError, string> = {
  cap_reached: 'Receipt reading is paused for this month, type it in instead.',
  daily_limit: "You've reached today's receipt scans. Type it in instead.",
  low_confidence: "We couldn't read that clearly. Check the details and type them in.",
  invalid_output: "We couldn't read that receipt. Type it in instead.",
  timeout: 'Reading took too long. Type it in instead.',
  refused: "We couldn't read that document. Type it in instead.",
  not_found: 'That upload is missing. Try again or type it in.',
  provider_error: 'Receipt reading is unavailable right now. Type it in instead.',
  unavailable: 'Receipt reading is unavailable right now. Type it in instead.',
};

/** Short-lived signed URL for a private object. Cached below the TTL; cleared on sign-out. */
export function useSignedUrl(bucket: string, path: string | null | undefined) {
  const { dataReady } = useAuth();
  return useQuery({
    queryKey: ['signed-url', bucket, path],
    enabled: dataReady && Boolean(path),
    staleTime: (SIGNED_URL_TTL - 60) * 1000,
    gcTime: (SIGNED_URL_TTL - 60) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, SIGNED_URL_TTL);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

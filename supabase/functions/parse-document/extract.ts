// Pure parts of parse-document: output schema, validation, kina→toea, cost. Unit-tested in extract_test.ts.
import { z } from 'npm:zod@3.23.8';

export type DocKind = 'receipt' | 'quotation' | 'invoice';

/** JSON schema sent to the model (structured outputs). Amounts are kina with 2 decimals. */
export function outputSchema(categoryNames: string[]) {
  const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
  return {
    type: 'object',
    additionalProperties: false,
    required: ['docType', 'merchant', 'date', 'currency', 'total', 'lineItems', 'validUntil', 'suggestedCategory', 'confidence'],
    properties: {
      docType: { type: 'string', enum: ['receipt', 'quotation', 'invoice'] },
      merchant: nullableString,
      date: { ...nullableString, description: 'Document date as YYYY-MM-DD' },
      currency: { type: 'string', description: 'ISO currency code shown on the document, PGK for kina' },
      total: { type: 'number', description: 'Grand total in kina, 2 decimals' },
      lineItems: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'qty', 'amount'],
          properties: {
            description: { type: 'string' },
            qty: { type: 'number' },
            amount: { type: 'number', description: 'Line total in kina' },
          },
        },
      },
      validUntil: { ...nullableString, description: 'Quotation expiry as YYYY-MM-DD, else null' },
      suggestedCategory: { type: 'string', enum: categoryNames },
      confidence: { type: 'number', description: '0 to 1: how sure you are the total and date are right' },
    },
  };
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const kina = z.number().finite().nonnegative().max(1_000_000_000);

const RawDoc = z.object({
  docType: z.enum(['receipt', 'quotation', 'invoice']),
  merchant: z.string().max(200).nullable(),
  date: isoDate.nullable().catch(null),
  currency: z.string().max(8),
  total: kina,
  lineItems: z.array(z.object({ description: z.string().max(300), qty: z.number().finite(), amount: kina })).max(200),
  validUntil: isoDate.nullable().catch(null),
  suggestedCategory: z.string(),
  confidence: z.number().min(0).max(1),
});

export interface ParsedDocument {
  docType: DocKind;
  merchant: string | null;
  date: string | null;
  currency: 'PGK';
  total: number; // toea
  lineItems: { description: string; qty: number; amount: number }[];
  validUntil: string | null;
  suggestedCategory: string;
  confidence: number;
}

export const toToea = (k: number) => Math.round(k * 100);

export type ValidateResult =
  | { ok: true; parsed: ParsedDocument }
  | { ok: false; error: 'invalid_output' };

/** Validate the model's JSON text and convert kina to toea. Non-PGK documents get confidence 0. */
export function validateModelOutput(text: string, categoryNames: string[]): ValidateResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid_output' };
  }
  const r = RawDoc.safeParse(raw);
  if (!r.success) return { ok: false, error: 'invalid_output' };
  const d = r.data;
  const pgk = d.currency.trim().toUpperCase() === 'PGK' || d.currency.trim().toUpperCase() === 'K';
  const total = toToea(d.total);
  return {
    ok: true,
    parsed: {
      docType: d.docType,
      merchant: d.merchant?.trim().slice(0, 80) || null,
      date: d.date,
      currency: 'PGK',
      total,
      lineItems: d.lineItems.map((li) => ({ description: li.description.trim(), qty: li.qty, amount: toToea(li.amount) })),
      validUntil: d.validUntil,
      suggestedCategory: categoryNames.includes(d.suggestedCategory) ? d.suggestedCategory : categoryNames[0] ?? '',
      confidence: pgk && total > 0 ? d.confidence : 0,
    },
  };
}

/** US$ micros from token usage. Prices are US$ per million tokens, so 1 token costs `price` micros. */
export function costMicros(inputTokens: number, outputTokens: number, priceInPerMTok: number, priceOutPerMTok: number): number {
  return Math.ceil(inputTokens * priceInPerMTok + outputTokens * priceOutPerMTok);
}

export function startOfUtcMonth(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
export function startOfUtcDay(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function systemPrompt(kind: DocKind): string {
  return [
    'You read photos and PDFs of documents from Papua New Guinea for a personal budgeting app.',
    `The user says this is a ${kind}. Extract the fields in the JSON schema.`,
    'Amounts are in kina (PGK, often written "K"). Report them as numbers with 2 decimals, no currency symbols or commas.',
    'total is the grand total actually payable, including GST. For quotations, validUntil is the expiry date if shown.',
    'Dates are YYYY-MM-DD. PNG documents usually write dates day first (12/10/26 is 12 October 2026).',
    "Pick suggestedCategory from the allowed list as the best fit for what was bought.",
    'Set confidence low (below 0.5) if the image is blurry, cut off, not a receipt, or the total is unclear. Never guess a total.',
  ].join('\n');
}

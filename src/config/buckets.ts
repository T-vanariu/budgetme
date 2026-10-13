import type { Bucket } from '@/types/domain';

export const BUCKET_VAR: Record<Bucket, string> = { need: 'var(--needs)', want: 'var(--wants)', savings: 'var(--save)' };
export const BUCKET_BG: Record<Bucket, string> = { need: 'bg-needs', want: 'bg-wants', savings: 'bg-save' };

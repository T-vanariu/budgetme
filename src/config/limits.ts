import { toea } from '@/types/domain';

/** <<MAX_SINGLE_AMOUNT>>: K 100,000 per entry. Adjust here. */
export const MAX_SINGLE_AMOUNT = toea(100_000 * 100);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const PASSWORD_MIN = 12;
export const PAGE_SIZE = 50;
/** <<SIGNED_URL_TTL>> seconds */
export const SIGNED_URL_TTL = 600;
export const UNDO_WINDOW_MS = 6000;
export const WALLPAPER_MAX_PX = 2560;
export const RECEIPT_MAX_PX = 2000;
/** <<CONFIDENCE_FLOOR>>: below this a parse opens manual entry instead of review. */
export const CONFIDENCE_FLOOR = 0.6;

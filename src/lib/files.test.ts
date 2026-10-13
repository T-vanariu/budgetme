import { validateUpload } from './files';

const file = (name: string, type: string, size: number) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('validateUpload', () => {
  it('accepts images and, for receipts, PDFs', () => {
    expect(validateUpload(file('a.jpg', 'image/jpeg', 1000), { allowPdf: false })).toBeNull();
    expect(validateUpload(file('a.pdf', 'application/pdf', 1000), { allowPdf: true })).toBeNull();
  });
  it('rejects PDFs for wallpapers', () => {
    expect(validateUpload(file('a.pdf', 'application/pdf', 1000), { allowPdf: false })).toBe('Choose a photo (JPG, PNG or WebP).');
  });
  it('rejects other types with a specific message', () => {
    expect(validateUpload(file('a.txt', 'text/plain', 10), { allowPdf: true })).toBe('Choose a photo (JPG, PNG or WebP) or a PDF.');
    expect(validateUpload(file('a.heic', 'image/heic', 10), { allowPdf: true })).toMatch(/HEIC/);
  });
  it('rejects files over 10 MB, naming the size', () => {
    expect(validateUpload(file('big.jpg', 'image/jpeg', 12.5 * 1024 * 1024), { allowPdf: true })).toBe('That file is 12.5 MB. The limit is 10 MB.');
  });
  it('rejects empty files', () => {
    expect(validateUpload(file('e.jpg', 'image/jpeg', 0), { allowPdf: true })).toBe('That file is empty.');
  });
});

import { customAlphabet } from 'nanoid';

// Token acak (bukan angka berurutan) agar URL publik /a/{token} & /r/{token}
// tidak bisa ditebak/dienumerasi.
export const generateQrToken = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  10,
);

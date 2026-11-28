// The real format of an uploaded image, read from its first bytes, or null
// when it is not a JPEG, PNG, GIF or WebP. The browser's declared type is
// not trusted: any file can be sent as "image/png".
export function imageType(bytes: Uint8Array): string | null {
  const starts = (sig: number[], at = 0) =>
    sig.every((b, i) => bytes[at + i] === b);
  const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts(ascii("GIF87a")) || starts(ascii("GIF89a"))) return "image/gif";
  if (starts(ascii("RIFF")) && starts(ascii("WEBP"), 8)) return "image/webp";
  return null;
}

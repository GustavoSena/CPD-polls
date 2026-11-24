import { lookup } from "dns";
import http from "http";
import https from "https";
import { BlockList, isIP } from "net";
import zlib from "zlib";

// Fetches a page a member pasted into their wishlist and reads its title and
// preview image (Open Graph / Twitter tags). The URL comes from a user, so
// every request is guarded against SSRF: only http(s) on standard ports, and
// the connection is refused if the hostname resolves to a private, loopback,
// link-local or otherwise internal address. The check runs inside the socket's
// DNS lookup, so it also holds for redirects and DNS rebinding.

const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96], // IPv4-mapped: checked again as IPv4 below
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) {
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return !blocked.check(mapped[1], "ipv4");
    return !blocked.check(address, "ipv6");
  }
  return false;
}

// Used as the socket's lookup: resolves the host and fails the connection if
// any resolved address is internal.
function safeLookup(
  hostname: string,
  options: object,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | { address: string; family: number }[],
    family?: number
  ) => void
) {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as { address: string; family: number }[];
    if (list.length === 0 || !list.every((a) => isPublicAddress(a.address))) {
      const error: NodeJS.ErrnoException = new Error(
        `Blocked address for ${hostname}`
      );
      error.code = "EBLOCKED";
      return callback(error, "", 0);
    }
    if ((options as { all?: boolean }).all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

// Parses user input into a URL we are willing to fetch, or null.
export function parsePublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host)) return null;
  if (host === "localhost" || host.endsWith(".localhost")) return null;
  if (host.endsWith(".internal") || host.endsWith(".local")) return null;
  return url;
}

type Fetched = { url: URL; contentType: string; body: Buffer };

function requestOnce(
  url: URL,
  accept: string,
  maxBytes: number
): Promise<{ status: number; location?: string; fetched?: Fetched }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup: safeLookup as never,
        timeout: TIMEOUT_MS,
        headers: {
          // Many shops only serve preview tags to browser-like agents.
          "User-Agent":
            "Mozilla/5.0 (compatible; LinkPreview/1.0)",
          Accept: accept,
          "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location });
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status });
        }

        const declared = Number(res.headers["content-length"]);
        if (Number.isFinite(declared) && declared > maxBytes) {
          res.destroy();
          return reject(new Error("Response too large"));
        }

        const encoding = String(res.headers["content-encoding"] ?? "");
        let stream: NodeJS.ReadableStream = res;
        if (encoding === "gzip") stream = res.pipe(zlib.createGunzip());
        else if (encoding === "deflate") stream = res.pipe(zlib.createInflate());
        else if (encoding === "br")
          stream = res.pipe(zlib.createBrotliDecompress());

        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        const finish = () =>
          resolve({
            status,
            fetched: {
              url,
              contentType: String(res.headers["content-type"] ?? "")
                .split(";")[0]
                .trim()
                .toLowerCase(),
              body: Buffer.concat(chunks),
            },
          });
        stream.on("data", (chunk: Buffer) => {
          if (truncated) return;
          size += chunk.length;
          if (size > maxBytes) {
            truncated = true;
            res.destroy();
            if (accept.startsWith("image/")) {
              return reject(new Error("Image too large"));
            }
            // For HTML the head (where the tags live) is already in hand.
            chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
            return finish();
          }
          chunks.push(chunk);
        });
        stream.on("end", () => !truncated && finish());
        stream.on("error", (e) => !truncated && reject(e));
      }
    );
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.on("error", reject);
    req.end();
  });
}

async function safeFetch(
  start: URL,
  accept: string,
  maxBytes: number
): Promise<Fetched | null> {
  let url = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const result = await requestOnce(url, accept, maxBytes);
    if (result.fetched) return result.fetched;
    if (!result.location) return null;
    const next = parsePublicUrl(new URL(result.location, url).toString());
    if (!next) return null;
    url = next;
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? "") : null;
}

function readMeta(html: string) {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
    const content = attr(tag, "content");
    if (key && content && !(key in meta)) meta[key] = content.trim();
  }
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title =
    meta["og:title"] ||
    meta["twitter:title"] ||
    (titleTag ? decodeEntities(titleTag[1]).replace(/\s+/g, " ").trim() : "");
  const image =
    meta["og:image:secure_url"] ||
    meta["og:image"] ||
    meta["og:image:url"] ||
    meta["twitter:image"] ||
    meta["twitter:image:src"] ||
    "";
  return { title, image };
}

export type LinkPreview = {
  title: string;
  image: { mimeType: string; data: Buffer } | null;
};

// Best effort: any failure just yields an empty preview, so the link can
// still be saved.
export async function fetchLinkPreview(url: URL): Promise<LinkPreview> {
  const empty: LinkPreview = { title: "", image: null };
  try {
    const page = await safeFetch(
      url,
      "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      MAX_HTML_BYTES
    );
    if (!page) return empty;

    // The link may point straight at an image.
    if (IMAGE_TYPES.has(page.contentType)) {
      return { title: "", image: { mimeType: page.contentType, data: page.body } };
    }
    if (!page.contentType.includes("html")) return empty;

    const { title, image } = readMeta(page.body.toString("utf8"));
    const result: LinkPreview = { title: title.slice(0, 300), image: null };
    if (!image) return result;

    const imageUrl = parsePublicUrl(new URL(image, page.url).toString());
    if (!imageUrl) return result;
    const img = await safeFetch(imageUrl, "image/*", MAX_IMAGE_BYTES).catch(
      () => null
    );
    if (img && IMAGE_TYPES.has(img.contentType) && img.body.length > 0) {
      result.image = { mimeType: img.contentType, data: img.body };
    }
    return result;
  } catch {
    return empty;
  }
}

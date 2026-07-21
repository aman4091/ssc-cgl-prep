// Server-side Cloudflare R2 access (S3-compatible), signed with AWS SigV4.
//
// SERVER ONLY — this reads R2_SECRET_ACCESS_KEY. Never import it from a "use
// client" module; the browser talks to /api/r2 instead, so the key stays on
// Vercel and never reaches a device.
//
// Signing is done by hand rather than pulling in the AWS SDK: two requests
// (PUT, DELETE) do not justify a multi-megabyte dependency in a site whose
// whole point is being light.
import crypto from "crypto";

const REGION = "auto";     // R2 ignores region but SigV4 requires one
const SERVICE = "s3";

export function r2Config() {
  const {
    R2_ACCESS_KEY_ID: accessKey,
    R2_SECRET_ACCESS_KEY: secretKey,
    R2_ENDPOINT: endpoint,
    R2_BUCKET: bucket,
    R2_PUBLIC_BASE: publicBase,
  } = process.env;
  const ok = Boolean(accessKey && secretKey && endpoint && bucket && publicBase);
  return {
    ok, accessKey, secretKey, bucket,
    endpoint: String(endpoint || "").replace(/\/+$/, ""),
    publicBase: String(publicBase || "").replace(/\/+$/, ""),
  };
}

const sha256hex = (b) => crypto.createHash("sha256").update(b).digest("hex");
const hmac = (key, s) => crypto.createHmac("sha256", key).update(s).digest();

// Each path segment is encoded, but the "/" separators are not.
const encodePath = (p) =>
  p.split("/").map((s) => encodeURIComponent(s)).join("/");

function signedHeaders({ method, key, body, contentType, cfg, now }) {
  const url = new URL(`${cfg.endpoint}/${cfg.bucket}/${encodePath(key)}`);
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256hex(body || "");

  const headers = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;

  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n]}\n`).join("");
  const signed = names.join(";");
  const canonicalRequest = [
    method, url.pathname, "", canonicalHeaders, signed, payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest),
  ].join("\n");

  const signature = hmac(
    hmac(hmac(hmac(hmac(`AWS4${cfg.secretKey}`, dateStamp), REGION), SERVICE), "aws4_request"),
    stringToSign
  ).toString("hex");

  return {
    url: url.toString(),
    headers: {
      ...headers,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, ` +
        `SignedHeaders=${signed}, Signature=${signature}`,
    },
  };
}

// -> the object's public URL.
export async function r2Put(key, body, contentType) {
  const cfg = r2Config();
  if (!cfg.ok) throw new Error("R2 configured nahi hai (env vars missing).");
  const { url, headers } = signedHeaders({
    method: "PUT", key, body, contentType, cfg, now: new Date(),
  });
  const res = await fetch(url, { method: "PUT", headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}) ${text.slice(0, 200)}`);
  }
  return `${cfg.publicBase}/${encodePath(key)}`;
}

export async function r2Delete(key) {
  const cfg = r2Config();
  if (!cfg.ok) throw new Error("R2 configured nahi hai (env vars missing).");
  const { url, headers } = signedHeaders({
    method: "DELETE", key, body: "", cfg, now: new Date(),
  });
  const res = await fetch(url, { method: "DELETE", headers });
  // 404 means it is already gone, which is the outcome the caller wanted.
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed (${res.status})`);
  }
}

// A public URL belongs to us only if it sits under our own bucket base — so a
// delete request can never be talked into signing a key it doesn't own.
export function keyFromPublicUrl(url) {
  const cfg = r2Config();
  if (!cfg.ok || !url) return null;
  const prefix = `${cfg.publicBase}/`;
  if (!String(url).startsWith(prefix)) return null;
  const key = decodeURIComponent(String(url).slice(prefix.length));
  return key.startsWith("wrong/") ? key : null;
}

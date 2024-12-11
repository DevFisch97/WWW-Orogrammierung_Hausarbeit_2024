import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const secretKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

export async function generateCSRFToken(sessionId) {
  const token = await create({ alg: "HS512", typ: "JWT" }, { sessionId }, secretKey);
  return token;
}

export async function verifyCSRFToken(token, sessionId) {
  try {
    const payload = await verify(token, secretKey);
    return payload.sessionId === sessionId;
  } catch {
    return false;
  }
}
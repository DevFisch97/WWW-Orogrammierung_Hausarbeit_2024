import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const secretKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"]
);

export async function generateCSRFToken(sessionId) {
  const token = await create({ alg: "HS256", typ: "JWT" }, { sessionId, timestamp: Date.now() }, secretKey);
  return token;
}

export async function verifyCSRFToken(token, sessionId) {
  try {
    const payload = await verify(token, secretKey);
    return payload.sessionId === sessionId;
  } catch (error) {
    console.error("CSRF token verification failed:", error);
    return false;
  }
}

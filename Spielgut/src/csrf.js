import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const secretKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"]
);

export async function generateCSRFToken(sessionId) {
  const token = await create({ alg: "HS256", typ: "JWT" }, { sessionId }, secretKey);
  return token;
}


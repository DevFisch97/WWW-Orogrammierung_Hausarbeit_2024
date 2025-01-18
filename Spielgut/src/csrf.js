import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { createDebug } from "./services/debug.js";
import { getRequestBody } from "./services/requestBodyHelper.js";

const log = createDebug('spielgut:csrf');

const secretKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"]
);

// Neues Map-Objekt zur Speicherung der CSRF-Tokens
const csrfTokens = new Map();

export async function generateCSRFToken(sessionId) {
  const token = await create({ alg: "HS256", typ: "JWT" }, { sessionId }, secretKey);
  csrfTokens.set(sessionId, token);
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

export async function csrfProtection(request, user) {
  if (["POST", "PUT", "DELETE"].includes(request.method) && user) {
    let body;
    try {
      body = await getRequestBody(request);
    } catch (error) {
      console.error("Fehler beim Parsen der Anfragedaten:", error);
      return false;
    }
    
    const token = body._csrf;
    log("Empfangener CSRF-Token:", token);
    log("Erwarteter CSRF-Token:", csrfTokens.get(user.sessionId));
    
    if (!token || !await verifyCSRFToken(token, user.sessionId)) {
      log("CSRF-Token-Validierung fehlgeschlagen");
      return false;
    }
  }
  return true;
}


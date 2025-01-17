import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

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
  } catch (error) {S
    console.error("CSRF token verification failed:", error);
    return false;
  }
}

export async function csrfProtection(request, user) {
  if (["POST", "PUT", "DELETE"].includes(request.method) && user) {
    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("Error parsing form data:", error);
      return false;
    }
    
    const token = formData.get("_csrf");
    console.log("Received CSRF token:", token);
    console.log("Expected CSRF token:", csrfTokens.get(user.sessionId));
    
    if (!token || !await verifyCSRFToken(token, user.sessionId)) {
      console.log("CSRF token validation failed");
      return false;
    }
    
    // Store formData for later use
    request.parsedFormData = formData;
  }
  return true;
}


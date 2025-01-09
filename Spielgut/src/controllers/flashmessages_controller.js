import { setCookie, getCookies } from "https://deno.land/std@0.177.0/http/cookie.ts";
import { sessions } from "../data/sessionStore.js";

export function getUserFromSession(request) {
  const cookies = getCookies(request.headers);
  const sessionId = cookies.session;
  if (!sessionId) return null;
  
  const session = sessions.get(sessionId);
  return session ? { id: session.userId, role: session.role, sessionId } : null;
}

export function setFlashMessage(response, message, type = 'info') {
  const flashMessage = JSON.stringify({ message, type, timestamp: Date.now() });
  setCookie(response.headers, {
    name: "flashMessage",
    value: encodeURIComponent(flashMessage),
    path: "/",
    maxAge: 60, // 1 minute
  });
}

export function getAndClearFlashMessage(request) {
  const cookies = getCookies(request.headers);
  const flashMessage = cookies.flashMessage;
  if (flashMessage) {
    const decodedMessage = JSON.parse(decodeURIComponent(flashMessage));
    const currentTime = Date.now();
    if (currentTime - decodedMessage.timestamp < 5000) { // 5 seconds
      return decodedMessage;
    }
  }
  return null;
}

export function clearFlashMessageCookie(response) {
  setCookie(response.headers, {
    name: "flashMessage",
    value: "",
    path: "/",
    maxAge: 0,
  });
}


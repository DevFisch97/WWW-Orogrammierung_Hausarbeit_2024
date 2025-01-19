import { setCookie, getCookies } from "https://deno.land/std@0.177.0/http/cookie.ts";
import { sessions } from "../data/sessionStore.js";
import { createDebug } from "../services/debug.js";

const log = createDebug('spielgut:flashmessages_controller');


export function getUserFromSession(request) {
  const cookies = getCookies(request.headers);
  const sessionId = cookies.session;
  if (!sessionId) return null;
  
  const session = sessions.get(sessionId);
  return session ? { id: session.userId, role: session.role, sessionId } : null;
}

export function setFlashMessage(response, message, type = 'info') {
  const cookies = getCookies(response.headers);
  let flashMessages = {};
  
  if (cookies.flashMessage) {
    try {
      flashMessages = JSON.parse(decodeURIComponent(cookies.flashMessage));
    } catch (error) {
      error("Error parsing flash message:", error);
    }
  }
  
  flashMessages[type] = message;
  log("Setze Flash-Nachricht:", { type, message });
  log("Aktuelle Flash-Nachrichten:", flashMessages);
  
  const encodedFlashMessages = encodeURIComponent(JSON.stringify(flashMessages));
  
  setCookie(response.headers, {
    name: "flashMessage",
    value: encodedFlashMessages,
    path: "/",
    maxAge: 60, 
  });
  log("Flash-Nachricht-Cookie gesetzt:", encodedFlashMessages);
}

export function getAndClearFlashMessage(request) {
  const cookies = getCookies(request.headers);
  const flashMessage = cookies.flashMessage;
  if (flashMessage) {
    try {
      const decodedMessages = JSON.parse(decodeURIComponent(flashMessage));
      log("Abgerufene Flash-Nachrichten:", decodedMessages);
      return decodedMessages;
    } catch (error) {
      error("Error parsing flash message:", error);
    }
  }
  return {};
}

export function clearFlashMessageCookie(response) {
  setCookie(response.headers, {
    name: "flashMessage",
    value: "",
    path: "/",
    maxAge: 0,
  });
  log("Flash-Nachricht-Cookie gelöscht");
}


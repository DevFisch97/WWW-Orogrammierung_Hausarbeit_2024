import { loginUser } from "../services/user_manager.js";
import { setCookie, getCookies } from "https://deno.land/std@0.177.0/http/cookie.ts";
import { generateCSRFToken } from "../csrf.js";
import { setFlashMessage, getAndClearFlashMessage } from "./flashmessages_controller.js";
import { sessions, csrfTokens } from "../data/sessionStore.js";

export class LoginController {
  async handleLogin(request) {
    try {
        console.log("handleLogin aufgerufen");
        const formData = await request.formData();
        console.log("Empfangene Formulardaten:", Object.fromEntries(formData));
        const email = formData.get("email");
        const password = formData.get("password");

        console.log("Login-Versuch für E-Mail:", email);

        const user = await loginUser(email, password);

        if (user) {
            console.log("Login erfolgreich für Benutzer:", user.id);
            const sessionId = crypto.randomUUID();
            sessions.set(sessionId, { userId: user.id, role: user.role });

            const csrfToken = await generateCSRFToken(sessionId);
            csrfTokens.set(sessionId, csrfToken);

            const response = new Response("", {
                status: 302,
                headers: {
                    "Location": "/",
                    "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; Max-Age=3600`,
                },
            });
            setFlashMessage(response, "Sie haben sich erfolgreich angemeldet.", "success");
            console.log("Flash-Nachrichten gesetzt für erfolgreichen Login");
            return response;
        } else {
            console.log("Login fehlgeschlagen für E-Mail:", email);
            const response = new Response("", {
                status: 302,
                headers: { "Location": "/login" },
            });
            setFlashMessage(response, "Ungültige E-Mail oder Passwort.", "error");
            setFlashMessage(response, email, "email");
            console.log("Flash-Nachrichten gesetzt für fehlgeschlagenen Login");
            return response;
        }
    } catch (error) {
        console.error("Fehler beim Login:", error);
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/login" },
        });
        setFlashMessage(response, "Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.", "error");
        return response;
    }
  }
  
  handleLogout(request) {
    const cookies = getCookies(request.headers);
    const sessionId = cookies.session;
    if (sessionId) {
      sessions.delete(sessionId);
      csrfTokens.delete(sessionId);
    }
    const response = new Response("", {
      status: 302,
      headers: {
        "Location": "/",
      },
    });
    setCookie(response.headers, {
      name: "session",
      value: "",
      path: "/",
      expires: new Date(0),
    });
    setFlashMessage(response, "Sie wurden erfolgreich abgemeldet.", "success");
    return response;
  }

  async getAccountData(user) {
    return {
      email: user.email,
      name: user.name,
    };
  }
}


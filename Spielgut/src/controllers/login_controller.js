import { loginUser } from "../services/user_manager.js";
import { generateCSRFToken } from "../csrf.js";

export class Login_Controller {
  constructor(render, sessions, csrfTokens) {
    this.render = render;
    this.sessions = sessions;
    this.csrfTokens = csrfTokens; // Lokale Referenz
  }

  async handleLogin(request) {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");

    const user = await loginUser(email, password);

    if (user) {
      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, { userId: user.id, role: user.role });

      // Generate CSRF token
      const csrfToken = await generateCSRFToken(sessionId);

      // Store CSRF token
      this.csrfTokens.set(sessionId, csrfToken);

      const response = new Response("", {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": `session=${sessionId}; HttpOnly; Path=/; Max-Age=3600`,
        },
      });

      return response;
    } else {
      const content = await this.render("login.html", { error: "Ungültige E-Mail oder Passwort" });
      return new Response(content, {
        status: 401,
        headers: { "content-type": "text/html" },
      });
    }
  }
}
import { loginUser } from "../services/user_manager.js";

export class Login_Controller {
  constructor(render, sessions) {
    this.render = render;
    this.sessions = sessions;
  }

  async handleLogin(request) {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const user = await loginUser(email, password);
      if (user) {
        const sessionId = this.generateSessionId();
        this.sessions.set(sessionId, { userId: user.id, role: user.role });
        return new Response("", {
          status: 302,
          headers: {
            "Location": "/",
            "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict`,
          },
        });
      } else {
        return new Response(await this.render("login.html", { error: "Ungültige Anmeldedaten" }), {
          status: 401,
          headers: { "content-type": "text/html" },
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      return new Response(await this.render("login.html", { error: "Anmeldung fehlgeschlagen" }), {
        status: 500,
        headers: { "content-type": "text/html" },
      });
    }
  }

  generateSessionId(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
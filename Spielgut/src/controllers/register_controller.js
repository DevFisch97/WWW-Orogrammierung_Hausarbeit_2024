import { registerUser } from "../services/user_manager.js";

export class RegisterController {
  constructor(render) {
    this.render = render;
  }

  async handleRegister(request) {
    const formData = await request.formData();
    const username = formData.get("username");
    const email = formData.get("email");
    const password = formData.get("password");
    const passwordRepeat = formData.get("password-repeat");
    const straße = formData.get("straße");
    const hausnummer = formData.get("hausnummer");
    const stadt = formData.get("stadt");
    const plz = formData.get("plz");

    console.log("Registration attempt:", { username, email, straße, hausnummer, stadt, plz });

    if (password !== passwordRepeat) {
      console.log("Password mismatch");
      return new Response(await this.render("register.html", { error: "Passwörter stimmen nicht überein" }), {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }

    try {
      const userId = await registerUser(username, email, password, straße, hausnummer, stadt, plz);
      console.log("User registered successfully:", userId);
      return new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
    } catch (error) {
      console.error("Registration error:", error);
      return new Response(await this.render("register.html", { error: "Registrierung fehlgeschlagen: " + error.message }), {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
  }
}
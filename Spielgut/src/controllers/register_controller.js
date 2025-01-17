import { registerUser } from "../services/user_manager.js";
import { setFlashMessage } from "./flashmessages_controller.js";

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

    // Überprüfen Sie, ob alle erforderlichen Felder ausgefüllt sind
    if (!username || !email || !password || !passwordRepeat || !straße || !hausnummer || !stadt || !plz) {
        console.log("Missing required fields");
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/register" },
        });
        setFlashMessage(response, "Bitte füllen Sie alle Felder aus.", "error");
        return response;
    }

    if (password !== passwordRepeat) {
        console.log("Password mismatch");
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/register" },
        });
        setFlashMessage(response, "Passwörter stimmen nicht überein", "error");
        return response;
    }

    try {
        const userId = await registerUser(username, email, password, straße, hausnummer, stadt, plz);
        console.log("User registered successfully:", userId);
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/login" },
        });
        setFlashMessage(response, "Registrierung erfolgreich. Bitte melden Sie sich an.", "success");
        return response;
    } catch (error) {
        console.error("Registration error:", error);
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/register" },
        });
        setFlashMessage(response, "Registrierung fehlgeschlagen: " + error.message, "error");
        return response;
    }
}
}


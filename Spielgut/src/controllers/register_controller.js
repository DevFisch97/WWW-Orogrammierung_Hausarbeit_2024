import { registerUser } from "../services/user_manager.js";
import { setFlashMessage } from "./flashmessages_controller.js";
import { createDebug } from "../services/debug.js";



const log = createDebug('spielgut:register_controller');

export class RegisterController {
  constructor(render) {
    this.render = render;
  }

  async handleRegister(request) {
    const formData = await getRequestBody(request);
    log("Registration attempt:", formData);
    const username = formData.username;
    const email = formData.email;
    const password = formData.password;
    const passwordRepeat = formData["password-repeat"];
    const straße = formData.straße;
    const hausnummer = formData.hausnummer;
    const stadt = formData.stadt;
    const plz = formData.plz;

    log("Registration attempt:", { username, email, straße, hausnummer, stadt, plz });

    // Überprüfen Sie, ob alle erforderlichen Felder ausgefüllt sind
    if (!username || !email || !password || !passwordRepeat || !straße || !hausnummer || !stadt || !plz) {
        log("Missing required fields");
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/register" },
        });
        setFlashMessage(response, "Bitte füllen Sie alle Felder aus.", "error");
        return response;
    }

    if (password !== passwordRepeat) {
        log("Password mismatch");
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/register" },
        });
        setFlashMessage(response, "Passwörter stimmen nicht überein", "error");
        return response;
    }

    try {
        const userId = await registerUser(username, email, password, straße, hausnummer, stadt, plz);
        log("User registered successfully:", userId);
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/login" },
        });
        setFlashMessage(response, "Registrierung erfolgreich. Bitte melden Sie sich an.", "success");
        return response;
    } catch (error) {
        log("Registration error:", error);
        const response = new Response("", {
            status: 302,
            headers: { "Location": "/register" },
        });
        setFlashMessage(response, "Registrierung fehlgeschlagen: " + error.message, "error");
        return response;
    }
}
}


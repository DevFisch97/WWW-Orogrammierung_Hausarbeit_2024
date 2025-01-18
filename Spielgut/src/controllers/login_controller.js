import { loginUser } from "../services/user_manager.js";
import { setCookie, getCookies } from "https://deno.land/std@0.177.0/http/cookie.ts";
import { generateCSRFToken } from "../csrf.js";
import { setFlashMessage } from "./flashmessages_controller.js";
import { sessions, csrfTokens } from "../data/sessionStore.js";
import { createDebug } from "../services/debug.js";
import { connection } from "../services/db.js";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { getRequestBody } from "../services/requestBodyHelper.js";

const log = createDebug('spielgut:login_controller');

export class LoginController {
  constructor() {
    this.db = connection();
  }

  async handleLogin(request) {
    try {
      const formData = await getRequestBody(request);
      log("handleLogin formData:", formData);
      const email = formData.email;
      const password = formData.password;

      log("Login-Versuch für E-Mail:", email);

      const user = await loginUser(email, password);

      if (user) {
        log("Login erfolgreich für Benutzer:", user.id);
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
        return response;
      } else {
        log("Login fehlgeschlagen für E-Mail:", email);
        const response = new Response("", {
          status: 302,
          headers: { "Location": "/login" },
        });
        setFlashMessage(response, "Ungültige E-Mail oder Passwort.", "error");
        return response;
      }
    } catch (error) {
      log("Fehler beim Login:", error);
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
    try {
      log("Fetching account data for user ID:", user.id);
      const [userData] = await this.db.query(
        'SELECT u.username, u.email, a.str as street, a.hausnummer as house_number, a.stadt as city, a.plz as zip_code FROM users u LEFT JOIN adress a ON u.id = a.user_id WHERE u.id = ?',
        [user.id]
      );

      if (!userData || userData.length === 0) {
        log("No user data found for user ID:", user.id);
        return {};
      }

      const processedUserData = {
        username: userData[0],
        email: userData[1],
        street: userData[2],
        house_number: userData[3],
        city: userData[4],
        zip_code: userData[5]
      };

      log("Processed user data:", processedUserData);
      return processedUserData;
    } catch (error) {
      log("Error fetching account data:", error);
      return {};
    }
  }

  async handleAccountUpdate(request, user) {
    try {
      const formData = await getRequestBody(request);
      log("handleAccountUpdate formData:", formData);
      const username = formData.username;
      const email = formData.email;
      const street = formData.street;
      const houseNumber = formData.house_number;
      const city = formData.city;
      const zipCode = formData.zip_code;
      const newPassword = formData.new_password;
      const confirmPassword = formData.confirm_password;

      log("Received form data:", { username, email, street, houseNumber, city, zipCode });

      const [userUpdateResult] = await this.db.query(
        'UPDATE users SET username = ?, email = ? WHERE id = ?',
        [username, email, user.id]
      );
      log("User update result:", userUpdateResult);

      const [addressExists] = await this.db.query(
        'SELECT 1 FROM adress WHERE user_id = ?',
        [user.id]
      );

      let addressUpdateResult;
      if (addressExists && addressExists.length > 0) {
        [addressUpdateResult] = await this.db.query(
          'UPDATE adress SET str = ?, hausnummer = ?, stadt = ?, plz = ? WHERE user_id = ?',
          [street, houseNumber, city, zipCode, user.id]
        );
      } else {
        [addressUpdateResult] = await this.db.query(
          'INSERT INTO adress (user_id, str, hausnummer, stadt, plz) VALUES (?, ?, ?, ?, ?)',
          [user.id, street, houseNumber, city, zipCode]
        );
      }
      log("Address update/insert result:", addressUpdateResult);

      if (newPassword && newPassword === confirmPassword) {
        const hashedPassword = await bcrypt.hash(newPassword);
        const [passwordUpdateResult] = await this.db.query(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, user.id]
        );
        log("Password update result:", passwordUpdateResult);
      }

      await this.db.query('COMMIT');

      const response = new Response("", {
        status: 302,
        headers: { "Location": "/account" },
      });
      setFlashMessage(response, "Ihre Kontoinformationen wurden erfolgreich aktualisiert.", "success");
      return response;
    } catch (error) {
      log("Error updating account:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/account" },
      });
      setFlashMessage(response, "Es gab einen Fehler beim Aktualisieren Ihrer Kontoinformationen.", "error");
      return response;
    }
  }
}


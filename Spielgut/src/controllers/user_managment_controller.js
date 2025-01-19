import { createDebug } from "../services/debug.js";
import { connection } from "../services/db.js";
import { setFlashMessage } from "./flashmessages_controller.js";
import { getRequestBody } from "../services/requestBodyHelper.js";

const log = createDebug('spielgut:umc');

export class UserManagementController {
  constructor() {
    this.db = connection();
  }

  async getUserList() {
    try {
      const users = await this.db.query(`
        SELECT u.id, u.username, u.email, r.name as role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.id
      `);
      return users.map(([id, username, email, role]) => ({
        id,
        username,
        email,
        role: role || 'Keine Rolle zugewiesen'
      }));
    } catch (error) {
      log("Error fetching user list:", error);
      throw error;
    }
  }

  async renderUserManagement(user, flashMessage, csrfToken) {
    if (!user || user.role !== 'admin') {
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/" },
      });
      setFlashMessage(response, "Sie haben keine Berechtigung, auf diese Seite zuzugreifen.", "error");
      return response;
    }

    const users = await this.getUserList();
    return { users, flashMessage, csrfToken };
  }


  async handleUpdateUser(request, adminUser) {
    if (!adminUser || adminUser.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const formData = await getRequestBody(request);
      const userId = formData.userId;
      const username = formData.username;
      const email = formData.email;
      const role = formData.role;

      await this.db.query(`
        UPDATE users
        SET username = ?, email = ?, role_id = (SELECT id FROM roles WHERE name = ?)
        WHERE id = ?
      `, [username, email, role, userId]);

      const response = new Response("", {
        status: 302,
        headers: { "Location": "/user-management" },
      });
      setFlashMessage(response, "Benutzer erfolgreich aktualisiert.", "success");
      return response;
    } catch (error) {
      log("Error updating user:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/user-management" },
      });
      setFlashMessage(response, "Fehler beim Aktualisieren des Benutzers.", "error");
      return response;
    }
  }

  async handleDeleteUser(request, adminUser) {
    if (!adminUser || adminUser.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const formData = await getRequestBody(request);
      const userId = formData.userId;

      
      await this.db.query("BEGIN TRANSACTION");

      
      await this.db.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);
      await this.db.query("DELETE FROM adress WHERE user_id = ?", [userId]);
     
      await this.db.query("DELETE FROM users WHERE id = ?", [userId]);

      
      await this.db.query("COMMIT");

      const response = new Response("", {
        status: 302,
        headers: { "Location": "/user-management" },
      });
      setFlashMessage(response, "Benutzer erfolgreich gelöscht.", "success");
      return response;
    } catch (error) {
      
      await this.db.query("ROLLBACK");

      log("Error deleting user:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/user-management" },
      });
      setFlashMessage(response, "Fehler beim Löschen des Benutzers.", "error");
      return response;
    }
  }
}


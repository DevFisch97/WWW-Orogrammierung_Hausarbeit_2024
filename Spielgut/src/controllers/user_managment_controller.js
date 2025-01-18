import { createDebug } from "../services/debug.js";
import { connection } from "../services/db.js";
import { setFlashMessage } from "./flashmessages_controller.js";

const log = createDebug('spielgut:user_management_controller');

export class UserManagementController {
  constructor() {
    this.db = connection();
  }

  async getUserList() {
    try {
      const users = await this.db.query(`
        SELECT u.id, u.username, u.email, r.name as role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        ORDER BY u.id
      `);
      return users.map(([id, username, email, role]) => ({ id, username, email, role }));
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

  async handleCreateUser(request, adminUser) {
    if (!adminUser || adminUser.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const role = formData.get('role');

    try {
      await this.db.query(`
        INSERT INTO users (username, email, password, role_id)
        VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = ?))
      `, [username, email, password, role]);

      const response = new Response("", {
        status: 302,
        headers: { "Location": "/user-management" },
      });
      setFlashMessage(response, "Benutzer erfolgreich erstellt.", "success");
      return response;
    } catch (error) {
      log("Error creating user:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/user-management" },
      });
      setFlashMessage(response, "Fehler beim Erstellen des Benutzers.", "error");
      return response;
    }
  }

  async handleUpdateUser(request, adminUser) {
    if (!adminUser || adminUser.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const userId = formData.get('userId');
    const username = formData.get('username');
    const email = formData.get('email');
    const role = formData.get('role');

    try {
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

    const formData = await request.formData();
    const userId = formData.get('userId');

    try {
      await this.db.query("DELETE FROM users WHERE id = ?", [userId]);

      const response = new Response("", {
        status: 302,
        headers: { "Location": "/user-management" },
      });
      setFlashMessage(response, "Benutzer erfolgreich gelöscht.", "success");
      return response;
    } catch (error) {
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


import { connection } from "../services/db.js";
import { createDebug } from "../services/debug.js";
import { getRequestBody } from "../services/requestBodyHelper.js";
import { setFlashMessage } from "./flashmessages_controller.js";
import { formatDate } from "../services/dateHelper.js";

const log = createDebug('spielgut:message_controller');

const ADMIN_USER_ID = 1; // Hier tragen Sie die ID des Administrators ein, der die Kontaktformular-Nachrichten erhalten soll

export class MessageController {
  constructor() {
    this.db = connection();
  }

  async createMessage(request, sender) {
    try {
      const formData = await getRequestBody(request);
      log("createMessage formData:", formData);
      const { recipient, subject, message } = formData;

      const [result] = await this.db.query(
        'INSERT INTO messages (sender_id, recipient_id, subject, message) VALUES (?, ?, ?, ?)',
        [sender.id, recipient, subject, message]
      );

      log("Message created:", result);

      const response = new Response("", {
        status: 302,
        headers: { "Location": "/messages" },
      });
      setFlashMessage(response, "Nachricht erfolgreich gesendet.", "success");
      return response;
    } catch (error) {
      log("Error creating message:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/messages" },
      });
      setFlashMessage(response, "Fehler beim Senden der Nachricht.", "error");
      return response;
    }
  }

  async getMessages(userId) {
    try {
      const messages = await this.db.query(
        `SELECT m.id, m.sender_id, m.recipient_id, m.subject, m.message, m.created_at, 
                COALESCE(u_sender.username, 'Kontaktformular') as sender_name, u_recipient.username as recipient_name
         FROM messages m
         LEFT JOIN users u_sender ON m.sender_id = u_sender.id
         JOIN users u_recipient ON m.recipient_id = u_recipient.id
         WHERE m.sender_id = ? OR m.recipient_id = ?
         ORDER BY m.created_at DESC`,
        [userId, userId]
      );

      return messages.map(([id, sender_id, recipient_id, subject, message, created_at, sender_name, recipient_name]) => ({
        id, sender_id, recipient_id, subject, message, 
        created_at: formatDate(created_at),
        sender_name, recipient_name
      }));
    } catch (error) {
      log("Error fetching messages:", error);
      return [];
    }
  }

  async renderMessageList(user, flashMessage, csrfToken) {
    if (!user) {
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
      setFlashMessage(response, "Sie müssen angemeldet sein, um auf Ihre Nachrichten zuzugreifen.", "error");
      return response;
    }

    const messages = await this.getMessages(user.id);
    return { messages, user, flashMessage, csrfToken };
  }

  async renderNewMessageForm(user, flashMessage, csrfToken) {
    if (!user) {
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
      setFlashMessage(response, "Sie müssen angemeldet sein, um eine neue Nachricht zu verfassen.", "error");
      return response;
    }

    const users = await this.getAllUsers(user.id);
    return { user, users, flashMessage, csrfToken };
  }

  async getAllUsers(currentUserId) {
    try {
      const users = await this.db.query(
        'SELECT id, username FROM users WHERE id != ?',
        [currentUserId]
      );
      return users.map(([id, username]) => ({ id, username }));
    } catch (error) {
      log("Error fetching users:", error);
      return [];
    }
  }

  async getMessageById(messageId, userId) {
    try {
      const [message] = await this.db.query(
        `SELECT m.id, m.sender_id, m.recipient_id, m.subject, m.message, m.created_at, 
                u_sender.username as sender_name, u_recipient.username as recipient_name
         FROM messages m
         JOIN users u_sender ON m.sender_id = u_sender.id
         JOIN users u_recipient ON m.recipient_id = u_recipient.id
         WHERE m.id = ? AND (m.sender_id = ? OR m.recipient_id = ?)`,
        [messageId, userId, userId]
      );

      if (!message) {
        return null;
      }

      return {
        id: message[0],
        sender_id: message[1],
        recipient_id: message[2],
        subject: message[3],
        message: message[4],
        created_at: formatDate(message[5]),
        sender_name: message[6],
        recipient_name: message[7]
      };
    } catch (error) {
      log("Error fetching message:", error);
      return null;
    }
  }

  async renderMessageDetail(user, messageId, flashMessage, csrfToken) {
    if (!user) {
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
      setFlashMessage(response, "Sie müssen angemeldet sein, um diese Nachricht anzuzeigen.", "error");
      return response;
    }

    const message = await this.getMessageById(messageId, user.id);
    if (!message) {
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/messages" },
      });
      setFlashMessage(response, "Die angeforderte Nachricht wurde nicht gefunden.", "error");
      return response;
    }

    return { message, user, flashMessage, csrfToken };
  }

  async replyToMessage(request, user, messageId) {
    try {
      const formData = await getRequestBody(request);
      log("replyToMessage formData:", formData);
      const { message } = formData;

      const originalMessage = await this.getMessageById(messageId, user.id);
      if (!originalMessage) {
        throw new Error("Original message not found");
      }

      const recipientId = originalMessage.sender_id === user.id ? originalMessage.recipient_id : originalMessage.sender_id;
      const subject = `Re: ${originalMessage.subject}`;

      const [result] = await this.db.query(
        'INSERT INTO messages (sender_id, recipient_id, subject, message) VALUES (?, ?, ?, ?)',
        [user.id, recipientId, subject, message]
      );

      log("Reply created:", result);

      const response = new Response("", {
        status: 302,
        headers: { "Location": "/messages" },
      });
      setFlashMessage(response, "Antwort erfolgreich gesendet.", "success");
      return response;
    } catch (error) {
      log("Error replying to message:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": `/messages/${messageId}` },
      });
      setFlashMessage(response, "Fehler beim Senden der Antwort.", "error");
      return response;
    }
  }

  async createContactMessage(request) {
    try {
      const formData = await getRequestBody(request);
      log("createContactMessage formData:", formData);
      const { name, email, subject, message } = formData;

      const fullMessage = `Von: ${name}\nE-Mail: ${email}\n\n${message}`;

      const [result] = await this.db.query(
        'INSERT INTO messages (sender_id, recipient_id, subject, message) VALUES (?, ?, ?, ?)',
        [null, ADMIN_USER_ID, subject, fullMessage]
      );

      log("Contact message created:", result);

      const response = new Response("", {
        status: 302,
        headers: { "Location": "/contact" },
      });
      setFlashMessage(response, "Ihre Nachricht wurde erfolgreich gesendet.", "success");
      return response;
    } catch (error) {
      log("Error creating contact message:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/contact" },
      });
      setFlashMessage(response, "Fehler beim Senden der Nachricht. Bitte versuchen Sie es später erneut.", "error");
      return response;
    }
  }
}


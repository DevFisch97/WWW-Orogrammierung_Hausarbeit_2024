import db from './data/user_managment'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

export async function registerUser(username, email, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await db.run(
    'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = "registered"))',
    [username, email, hashedPassword]
  );
  return result.lastID;
}

export async function loginUser(username, password) {
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return null;
  }
  const match = await bcrypt.compare(password, user.password);
  if (match) {
    return user;
  }
  return null;
}

export async function getUserRole(userId) {
  const result = await db.get(
    'SELECT roles.name FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = ?',
    [userId]
  );
  return result ? result.name : null;
}
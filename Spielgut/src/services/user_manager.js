import { connection } from "./db.js";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

export async function registerUser(username, email, password, straße, hausnummer, stadt, plz) {
  const db = connection();
  const hashedPassword = await bcrypt.hash(password);
  
  // Start a transaction
  db.query('BEGIN');
  
  try {
    const userResult = db.query(
      'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, 2)',
      [username, email, hashedPassword]
    );
    const userId = userResult.lastInsertId;
    
    db.query(
      'INSERT INTO adress (user_id, str, hausnummer, stadt, plz) VALUES (?, ?, ?, ?, ?)',
      [userId, straße, hausnummer, stadt, plz]
    );
    
    db.query('COMMIT');
    
    return userId;
  } catch (error) {

    db.query('ROLLBACK');
    throw error;
  }
}

export async function loginUser(email, password) {
  const db = connection();
  
  console.log('Attempting to fetch user:', email);
  
  try {
      const result = db.query('SELECT * FROM users WHERE email = ?', [email]);
      const user = result[0]; 
      
      console.log('Database query result:', user);
      
      if (!user) {
          console.log('User not found:', email);
          return null;
      }
      
      // Zugriff auf die Spalten über den Index
      const storedPassword = user[3]; // Das Passwort ist an der vierten Stelle (Index 3)
      
      if (!storedPassword) {
          console.error('Hashed password is missing for user:', email);
          return null;
      }
      
      console.log('Stored hashed password:', storedPassword);
      console.log('Provided password:', password);

      try {
          const match = await bcrypt.compare(password, storedPassword);
          console.log('Password match result:', match);

          if (match) {
              console.log('Password match for user:', email);
              // Erstellen Sie ein Benutzerobjekt ohne das Passwort
              const userData = {
                  id: user[0],
                  username: user[1],
                  email: user[2],
                  role: user[4]
              };
              return userData;
          }
      } catch (error) {
          console.error('Error comparing passwords:', error);
      }
  } catch (dbError) {
      console.error('Database error:', dbError);
  }
  
  console.log('Invalid password for user:', email);
  return null;
}

export async function getUserRole(userId) {
  const db = connection();
  const [result] = db.query(
    'SELECT roles.name FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = ?',
    [userId]
  );
  return result ? result.name : null;
}


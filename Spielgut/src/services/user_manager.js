import { connection } from "./db.js";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { createDebug } from "./debug.js";


const log = createDebug('spielgut:user_manager');

export async function registerUser(username, email, password, straße, hausnummer, stadt, plz) {
  const db = connection();
  const hashedPassword = await bcrypt.hash(password);
  
  log("Starting user registration process");

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]); 
    if (existingUser.length > 0) {
      throw new Error("Benutzername oder E-Mail existiert bereits");
    }

    await db.query('BEGIN TRANSACTION'); 
    
    log("Inserting user into database");
    const userResult = await db.query( 
      'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, 2)',
      [username, email, hashedPassword]
    );
    const userId = db.lastInsertRowId; 
    log("User inserted, ID:", userId);
    
    log("Inserting address into database");
    await db.query( 
      'INSERT INTO adress (user_id, str, hausnummer, stadt, plz) VALUES (?, ?, ?, ?, ?)',
      [userId, straße, hausnummer, stadt, plz]
    );
    log("Address inserted");
    
    await db.query('COMMIT'); 
    log("Transaction committed");
    
    return userId;
  } catch (error) {
    log("Error during registration:", error);
    log("Error details:", error.message);
    log("Error stack:", error.stack);
    try {
      await db.query('ROLLBACK'); 
      log("Transaction rolled back");
    } catch (rollbackError) {
      log("Error during rollback:", rollbackError);
      log("Rollback error details:", rollbackError.message);
    }
    throw error;
  }
}

export async function loginUser(email, password) {
  const db = connection();
  
  log('Attempting to fetch user:', email);
  
  try {
    const result = db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = result[0]; 
    
    log('Database query result:', user);
    
    if (!user) {
      log('User not found:', email);
      return null;
    }
    
    const storedPassword = user[3];
    
    if (!storedPassword) {
      log('Hashed password is missing for user:', email);
      return null;
    }
    
    log('Stored hashed password:', storedPassword);
    log('Provided password:', password);

    try {
      const match = await bcrypt.compare(password, storedPassword);
      log('Password match result:', match);

      if (match) {
        log('Password match for user:', email);
        const userRole = await getUserRole(user[0]);
        const userData = {
          id: user[0],
          username: user[1],
          email: user[2],
          role: userRole
        };
        log('User data:', userData);
        return userData;
      }
    } catch (error) {
      log('Error comparing passwords:', error);
    }
  } catch (dbError) {
    log('Database error:', dbError);
  }
  
  log('Invalid password for user:', email);
  return null;
}

export async function getUserRole(userId) {
  const db = connection();
  log('Fetching role for user ID:', userId);
  try {
    const result = db.query(
      'SELECT roles.name FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = ?',
      [userId]
    );
    log('Role query result:', result);
    if (result && result.length > 0) {
      const roleName = result[0][0];  // Access the first element of the first row
      log('User role:', roleName);
      return roleName;
    } else {
      log('No role found for user');
      return null;
    }
  } catch (error) {
    log('Error fetching user role:', error);
    return null;
  }
}



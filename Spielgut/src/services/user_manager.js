import { connection } from "./db.js";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

export async function registerUser(username, email, password, straße, hausnummer, stadt, plz) {
  const db = connection();
  const hashedPassword = await bcrypt.hash(password);
  
  console.log("Starting user registration process");

  try {
    db.query('BEGIN TRANSACTION');
    
    console.log("Inserting user into database");
    const userResult = db.query(
      'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, 2)',
      [username, email, hashedPassword]
    );
    const userId = userResult.lastInsertId;
    console.log("User inserted, ID:", userId);
    
    console.log("Inserting address into database");
    db.query(
      'INSERT INTO adress (user_id, str, hausnummer, stadt, plz) VALUES (?, ?, ?, ?, ?)',
      [userId, straße, hausnummer, stadt, plz]
    );
    console.log("Address inserted");
    
    db.query('COMMIT');
    console.log("Transaction committed");
    
    return userId;
  } catch (error) {
    console.error("Error during registration:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    try {
      db.query('ROLLBACK');
      console.log("Transaction rolled back");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
      console.error("Rollback error details:", rollbackError.message);
    }
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
    
    const storedPassword = user[3];
    
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
        const userRole = await getUserRole(user[0]);
        const userData = {
          id: user[0],
          username: user[1],
          email: user[2],
          role: userRole
        };
        console.log('User data:', userData);
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
  console.log('Fetching role for user ID:', userId);
  try {
    const result = db.query(
      'SELECT roles.name FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = ?',
      [userId]
    );
    console.log('Role query result:', result);
    if (result && result.length > 0) {
      const roleName = result[0][0];  // Access the first element of the first row
      console.log('User role:', roleName);
      return roleName;
    } else {
      console.log('No role found for user');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

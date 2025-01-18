import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import { createDebug } from "./debug.js";


const log = createDebug('spielgut:db');

let _db = null;

export function initConnection(PATH) {
  try {
    _db = new DB(PATH);
    log("Datenbankverbindung hergestellt.");
    
    // Test the connection
    const testQuery = _db.query("SELECT 1");
    log("Test query result:", testQuery);
    
  } catch (error) {
    log("Error initializing database connection:", error);
    log("Error details:", error.message);
    throw error;
  }
}

export function connection() {
  if (!_db) throw new Error("Datenbank ist nicht verbunden.");
  return _db;
}

import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";

let _db = null;

export function initConnection(PATH) {
  try {
    _db = new DB(PATH);
    console.log("Datenbankverbindung hergestellt.");
    
    // Test the connection
    const testQuery = _db.query("SELECT 1");
    console.log("Test query result:", testQuery);
    
  } catch (error) {
    console.error("Error initializing database connection:", error);
    console.error("Error details:", error.message);
    throw error;
  }
}

export function connection() {
  if (!_db) throw new Error("Datenbank ist nicht verbunden.");
  return _db;
}

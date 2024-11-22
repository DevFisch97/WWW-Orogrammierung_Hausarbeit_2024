import { DB } from "https://deno.land/x/sqlite/mod.ts";

let _db = null;

export function initConnection(PATH) {
  _db = new DB(PATH); 
  console.log("Datenbankverbindung hergestellt.");
}

export function connection() {
  if (!_db) throw new Error("Datenbank ist nicht verbunden.");
  return _db;
}
import { connection } from "./services/db.js";

export async function list() {
  const db = connection();
  const products = await db.query("SELECT id, name, price FROM products");
  return products.map(([id, name, price]) => ({ id, name, price }));
}

export async function get(id) {
  const db = connection();
  const [product] = await db.query("SELECT id, name, price, description, image FROM products WHERE id = ?", [id]);
  if (!product) throw new Error("Produkt nicht gefunden.");
  return { id: product[0], name: product[1], price: product[2], description: product[3], image: product[4] };
}

export async function create(data) {
  const db = connection();
  await db.query("INSERT INTO products (name, price, description, image) VALUES (?, ?, ?, ?)", [
    data.name,
    data.price,
    data.description,
    data.image,
  ]);
}

export async function update(id, data) {
  const db = connection();
  await db.query("UPDATE products SET name = ?, price = ?, description = ?, image = ? WHERE id = ?", [
    data.name,
    data.price,
    data.description,
    data.image,
    id,
  ]);
}

export async function getNewProductsDia() {
  const db = connection();
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, i.bild_pfad AS image_path 
    FROM produkte p
    LEFT JOIN bilder i ON p.id = i.produkt_id
    WHERE p.show_dia = 1 
    ORDER BY p.id DESC 
    LIMIT 6
  `);
  return products.map(([id, name, price, image_path]) => ({ id, name, price, image_path }));
}

export async function getUsedProductsDia() {
  const db = connection();
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, i.bild_pfad AS image_path 
    FROM produkte p
    LEFT JOIN bilder i ON p.id = i.produkt_id
    WHERE p.show_dia = 1 
    ORDER BY p.id DESC 
    LIMIT 6
  `);
  return products.map(([id, name, price, image_path]) => ({ id, name, price, image_path }));
}
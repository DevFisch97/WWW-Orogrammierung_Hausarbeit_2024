import { connection } from "./services/db.js";

export async function list() {
  const db = connection();
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, b.bild_pfad
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
  `);
  return products.map(([id, name, preis, bild_pfad]) => ({ id, name, preis, bild_pfad }));
}

export async function get(id) {
  const db = connection();
  const [product] = await db.query(`
    SELECT p.id, p.name, p.preis, p.produkt_verweis, p.show_dia, b.bild_pfad
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    WHERE p.id = ?
  `, [id]);
  
  if (!product) throw new Error("Produkt nicht gefunden.");
  return { 
    id: product[0], 
    name: product[1], 
    preis: product[2], 
    produkt_verweis: product[3], 
    show_dia: product[4],
    bild_pfad: product[5]
  };
}

export async function create(data) {
  const db = connection();
  await db.query("INSERT INTO produkte (name, preis, produkt_verweis, show_dia) VALUES (?, ?, ?, ?)", [
    data.name,
    data.preis,
    data.produkt_verweis,
    data.show_dia,
  ]);
}

export async function update(id, data) {
  const db = connection();
  await db.query("UPDATE produkte SET name = ?, preis = ?, produkt_verweis = ?, show_dia = ? WHERE id = ?", [
    data.name,
    data.preis,
    data.produkt_verweis,
    data.show_dia,
    id,
  ]);
}

export async function getNewProductsDia() {
  const db = connection();
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, b.bild_pfad
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    WHERE p.show_dia = 1 
    ORDER BY p.id DESC 
    LIMIT 6
  `);
  return products.map(([id, name, preis, bild_pfad]) => ({ id, name, preis, bild_pfad }));
}

export async function getUsedProductsDia() {
  const db = connection();
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, b.bild_pfad
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    WHERE p.show_dia = 0 
    ORDER BY p.id DESC 
    LIMIT 6
  `);
  return products.map(([id, name, preis, bild_pfad]) => ({ id, name, preis, bild_pfad }));
}

export async function getAllNewProducts() {
  const db = connection();
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, b.bild_pfad
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    ORDER BY p.id DESC
  `);
  return products.map(([id, name, preis, bild_pfad]) => ({ id, name, preis, bild_pfad }));
}

export async function getSingleProduct(id) {
  const db = connection();
  const [product] = await db.query(`
    SELECT p.id, p.name, p.preis, p.produkt_verweis, p.show_dia, b.bild_pfad
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    WHERE p.id = ?
  `, [id]);
  
  if (!product) throw new Error("Produkt nicht gefunden.");
  return { 
    id: product[0], 
    name: product[1], 
    preis: product[2], 
    beschreibung: product[3],
    show_dia: product[4],
    bild_pfad: product[5]
  };
}

export async function updateProduct(id, data) {
  const db = connection();
  await db.query("UPDATE produkte SET name = ?, preis = ?, produkt_verweis = ?, show_dia = ? WHERE id = ?", [
    data.name,
    data.preis,
    data.beschreibung,
    data.show_dia,
    id,
  ]);
}

export async function deleteProduct(id) {
  const db = connection();
  await db.query("DELETE FROM produkte WHERE id = ?", [id]);
  await db.query("DELETE FROM bilder WHERE produkt_id = ?", [id]);
}

export async function addToCart(userId, productId, quantity) {
  const db = connection();
  const existingItem = await db.query(
    "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
    [userId, productId]
  );

  if (existingItem.length > 0) {
    await db.query(
      "UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?",
      [quantity, userId, productId]
    );
  } else {
    await db.query(
      "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
      [userId, productId, quantity]
    );
  }
}

export async function updateCartItem(userId, productId, quantity) {
  const db = connection();
  await db.query(
    "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?",
    [quantity, userId, productId]
  );
}

export async function removeFromCart(userId, productId) {
  const db = connection();
  await db.query(
    "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
    [userId, productId]
  );
}

export async function getCartItems(userId) {
  const db = connection();
  const items = await db.query(`
    SELECT ci.product_id, ci.quantity, p.name, p.preis, b.bild_pfad
    FROM cart_items ci
    JOIN produkte p ON ci.product_id = p.id
    LEFT JOIN bilder b ON p.id = b.produkt_id
    WHERE ci.user_id = ?
  `, [userId]);
  return items.map(([productId, quantity, name, preis, bild_pfad]) => ({
    productId,
    quantity,
    name,
    preis,
    bild_pfad
  }));
}


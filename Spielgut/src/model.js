import { connection } from "./services/db.js";
import { createDebug } from "./services/debug.js";

const log = createDebug('spielgut:model');

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
    ORDER BY p.id ASC 
    LIMIT 6
  `);
  return products.map(([id, name, preis, bild_pfad]) => ({ id, name, preis, bild_pfad }));
}

export async function getAllNewProducts(filterParams = {}) {
  const db = connection();
  let query = `
    SELECT p.id, p.name, p.preis, p.produkt_verweis, p.show_dia, b.bild_pfad, k.name as kategorie_name, p.kategorie_id
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    LEFT JOIN kategorie k ON p.kategorie_id = k.id
    WHERE 1=1
  `;
  let queryParams = [];

  if (filterParams.category) {
    query += ` AND p.kategorie_id = ?`;
    queryParams.push(filterParams.category);
  }
  if (filterParams.priceMin) {
    query += ` AND p.preis >= ?`;
    queryParams.push(filterParams.priceMin);
  }
  if (filterParams.priceMax) {
    query += ` AND p.preis <= ?`;
    queryParams.push(filterParams.priceMax);
  }

  query += ` ORDER BY p.id DESC`;

  log('SQL Query:', query);
  log('Query Params:', queryParams);

  const products = await db.query(query, queryParams);

  log('Query Results:', products);

  return products.map(([id, name, preis, produkt_verweis, show_dia, bild_pfad, kategorie_name, kategorie_id]) => 
    ({ id, name, preis, produkt_verweis, show_dia, bild_pfad, kategorie_name, kategorie_id }));
}

export async function getAllUsedProducts(filterParams = {}) {
  const db = connection();
  let query = `
    SELECT p.id, p.name, p.preis, b.bild_pfad, k.name as kategorie_name, p.kategorie_id
    FROM produkte p
    INNER JOIN kategorie k ON p.kategorie_id = k.id
    LEFT JOIN bilder b ON p.id = b.produkt_id
    WHERE 1=1
  `;
  let queryParams = [];

  if (filterParams.category) {
    query += ` AND p.kategorie_id = ?`;
    queryParams.push(filterParams.category);
  }
  if (filterParams.priceMin) {
    query += ` AND p.preis >= ?`;
    queryParams.push(filterParams.priceMin);
  }
  if (filterParams.priceMax) {
    query += ` AND p.preis <= ?`;
    queryParams.push(filterParams.priceMax);
  }

  query += ` ORDER BY p.id DESC`;

  log('SQL Query:', query);
  log('Query Params:', queryParams);

  const products = await db.query(query, queryParams);

  log('Query Results:', products);

  return products.map(([id, name, preis, bild_pfad, kategorie_name, kategorie_id]) => 
    ({ id, name, preis, bild_pfad, kategorie_name, kategorie_id }));
}

export async function getSingleProduct(id) {
  const db = connection();
  log(`Fetching product with id: ${id}`);
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, p.produkt_verweis, p.show_dia, b.bild_pfad
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    WHERE p.id = ?
  `, [id]);
  
  log(`Query result:`, products);
  
  if (products.length === 0) throw new Error("Produkt nicht gefunden.");
  
  const product = products[0];
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
  let query = "UPDATE produkte SET name = ?, preis = ?, produkt_verweis = ?, show_dia = ?";
  let params = [data.name, data.preis, data.beschreibung, data.show_dia];

  if (data.bild_pfad !== undefined) {
    query += ", bild_pfad = ?";
    params.push(data.bild_pfad);
  }

  query += " WHERE id = ?";
  params.push(id);

  log("Executing SQL query:", query);
  log("Query parameters:", params);

  await db.query(query, params);
  log("Product updated successfully");
}

export async function deleteImage(productId) {
  const db = connection();
  log("Deleting image for product:", productId);
  await db.query("UPDATE produkte SET bild_pfad = NULL WHERE id = ?", [productId]);
  log("Image deleted successfully");
}



export async function deleteProduct(id) {
  const db = connection();
  try {
    // Start a transaction
    await db.query("BEGIN TRANSACTION");

    // Delete related records first
    await db.query("DELETE FROM bilder WHERE produkt_id = ?", [id]);
    await db.query("DELETE FROM cart_items WHERE product_id = ?", [id]);
    // Add any other tables that reference the product here

    // Finally, delete the product
    await db.query("DELETE FROM produkte WHERE id = ?", [id]);

    // Commit the transaction
    await db.query("COMMIT");
  } catch (error) {
    // If any error occurs, rollback the changes
    await db.query("ROLLBACK");
    throw error;
  }
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

export async function getCartTotal(userId) {
  const db = connection();
  const result = await db.query(`
    SELECT SUM(p.preis * ci.quantity) as total
    FROM cart_items ci
    JOIN produkte p ON ci.product_id = p.id
    WHERE ci.user_id = ?
  `, [userId]);
  return result[0].total || 0;
}

export async function createProduct(data) {
  const db = connection();
  log("Creating new product with data:", data);
  const result = await db.query(
    "INSERT INTO produkte (name, preis, produkt_verweis, show_dia, kategorie_id) VALUES (?, ?, ?, ?, ?)",
    [data.name, data.preis, data.beschreibung, data.show_dia, data.kategorie_id]
  );
  log("New product created with ID:", result.insertId);
  return result.insertId;
}

export async function createImage(productId, imagePath) {
  const db = connection();
  await db.query(
    "INSERT INTO bilder (produkt_id, bild_pfad) VALUES (?, ?)",
    [productId, imagePath]
  );
}

// New function for search functionality
export async function searchProducts(searchQuery) {
  const db = connection();
  const query = `
    SELECT p.id, p.name, p.preis, p.produkt_verweis, p.show_dia, b.bild_pfad, k.name as kategorie_name, p.kategorie_id
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    LEFT JOIN kategorie k ON p.kategorie_id = k.id
    WHERE p.name LIKE ? OR p.produkt_verweis LIKE ?
    ORDER BY p.id DESC
  `;
  const queryParams = [`%${searchQuery}%`, `%${searchQuery}%`];

  log('Search Query:', query);
  log('Search Params:', queryParams);

  const products = await db.query(query, queryParams);

  log('Search Results:', products);

  return products.map(([id, name, preis, produkt_verweis, show_dia, bild_pfad, kategorie_name, kategorie_id]) => 
    ({ id, name, preis, produkt_verweis, show_dia, bild_pfad, kategorie_name, kategorie_id }));
}


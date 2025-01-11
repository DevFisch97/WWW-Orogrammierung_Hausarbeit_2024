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

export async function getAllNewProducts(page = 1, itemsPerPage = 6, filterParams = {}) {
  const db = connection();
  const offset = (page - 1) * itemsPerPage;
  let query = `
    SELECT p.id, p.name, p.preis, b.bild_pfad, k.name as kategorie_name
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    LEFT JOIN kategorie k ON p.kategorie_id = k.id
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM produkte p
    LEFT JOIN kategorie k ON p.kategorie_id = k.id
  `;
  const queryParams = [];
  const countQueryParams = [];

  console.log('Model: Received filter params:', filterParams);

  if (filterParams.category && filterParams.category !== '') {
    query += ` AND k.name = ?`;
    countQuery += ` AND k.name = ?`;
    queryParams.push(filterParams.category);
    countQueryParams.push(filterParams.category);
  }
  if (typeof filterParams.priceMin === 'number') {
    query += ` AND p.preis >= ?`;
    countQuery += ` AND p.preis >= ?`;
    queryParams.push(filterParams.priceMin);
    countQueryParams.push(filterParams.priceMin);
  }
  if (typeof filterParams.priceMax === 'number') {
    query += ` AND p.preis <= ?`;
    countQuery += ` AND p.preis <= ?`;
    queryParams.push(filterParams.priceMax);
    countQueryParams.push(filterParams.priceMax);
  }

  query += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
  queryParams.push(itemsPerPage, offset);

  console.log('Category filter applied:', filterParams.category);
  console.log('SQL Query:', query);
  console.log('Query parameters:', queryParams);

  const products = await db.query(query, queryParams);
  const [{ total }] = await db.query(countQuery, countQueryParams);

  console.log('Fetched products:', products);
  console.log('Total products found:', products.length);

  console.log('Model: Products found:', products.length);
  console.log('Model: Total products:', total);

  return {
    products: products.map(([id, name, preis, bild_pfad, kategorie_name]) => ({ id, name, preis, bild_pfad, kategorie_name })),
    total,
    totalPages: Math.ceil(total / itemsPerPage)
  };
}

export async function getAllUsedProducts(page = 1, itemsPerPage = 6, filterParams = {}) {
  const db = connection();
  const offset = (page - 1) * itemsPerPage;
  
  // Überprüfung aller Kategorien und ihrer Produktanzahl
  const categoriesCount = await db.query(`
    SELECT k.name, COUNT(p.id) as product_count
    FROM kategorie k
    LEFT JOIN produkte p ON k.id = p.kategorie_id 
    GROUP BY k.id, k.name
    ORDER BY k.name
  `);
  console.log('All categories and their product counts:', categoriesCount.map(c => `${c[0]}: ${c[1]}`));

  // Überprüfung der Kategoriezuordnung für alle Produkte
  const allProducts = await db.query(`
    SELECT p.id, p.name, k.name as kategorie_name
    FROM produkte p
    LEFT JOIN kategorie k ON p.kategorie_id = k.id
  `);
  console.log('All products and their categories:');
  allProducts.forEach(p => console.log(`Product ${p[0]} (${p[1]}) - Category: ${p[2]}`));

  let query = `
    SELECT p.id, p.name, p.preis, b.bild_pfad, k.name as kategorie_name
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    LEFT JOIN kategorie k ON p.kategorie_id = k.id
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM produkte p
    LEFT JOIN kategorie k ON p.kategorie_id = k.id
  `;
  const queryParams = [];
  const countQueryParams = [];

  console.log('Filter params:', filterParams);

  if (filterParams.category && filterParams.category !== 'Unkategorisiert') {
    query += ` AND LOWER(k.name) = LOWER(?)`;
    countQuery += ` AND LOWER(k.name) = LOWER(?)`;
    queryParams.push(filterParams.category);
    countQueryParams.push(filterParams.category);
  }
  if (filterParams.priceMin && !isNaN(parseFloat(filterParams.priceMin))) {
    query += ` AND p.preis >= ?`;
    countQuery += ` AND p.preis >= ?`;
    queryParams.push(parseFloat(filterParams.priceMin));
    countQueryParams.push(parseFloat(filterParams.priceMin));
  }
  if (filterParams.priceMax && !isNaN(parseFloat(filterParams.priceMax))) {
    query += ` AND p.preis <= ?`;
    countQuery += ` AND p.preis <= ?`;
    queryParams.push(parseFloat(filterParams.priceMax));
    countQueryParams.push(parseFloat(filterParams.priceMax));
  }

  query += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
  queryParams.push(itemsPerPage, offset);

  console.log('Final query:', query);
  console.log('Query params:', queryParams);

  const products = await db.query(query, queryParams);
  const [{ total }] = await db.query(countQuery, countQueryParams);

  console.log('Products found:', products.length);
  console.log('Total products:', total);
  console.log('Current page:', page);
  console.log('Items per page:', itemsPerPage);
  console.log('Total pages:', Math.ceil(total / itemsPerPage));

  console.log('Total products from count query:', total);
  console.log('Actual products returned:', products.length);

  // Überprüfung der Kategoriezuordnung für jedes gefundene Produkt
  products.forEach(p => console.log(`Found product ${p[0]} (${p[1]}) - Category: ${p[4]}`));

  return {
    products: products.map(([id, name, preis, bild_pfad, kategorie_name]) => ({ id, name, preis, bild_pfad, kategorie_name })),
    total: total || 0,
    totalPages: Math.ceil((total || 0) / itemsPerPage)
  };
}

export async function getSingleProduct(id) {
  const db = connection();
  console.log(`Fetching product with id: ${id}`);
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, p.produkt_verweis, p.show_dia, b.bild_pfad
    FROM produkte p
    LEFT JOIN bilder b ON p.id = b.produkt_id
    WHERE p.id = ?
  `, [id]);
  
  console.log(`Query result:`, products);
  
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


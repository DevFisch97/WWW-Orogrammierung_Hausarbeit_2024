import { connection } from "./services/db.js";
import { createDebug } from "./services/debug.js";

const log = createDebug('spielgut:model');

//Produkte laden
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
    SELECT p.id, p.name, p.preis, p.produkt_verweis, p.show_dia, p.kategorie_id, b.bild_pfad
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
    kategorie_id: product[5],
    bild_pfad: product[6]
  };
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
  const db = connection()
  const products = await db.query(`
    SELECT gp.id, gp.name, gp.preis, bg.bild_pfad
    FROM gebrauchte_produkte gp
    LEFT JOIN bilder_gebraucht bg ON gp.id = bg.gebrauchte_produkte_id
    WHERE gp.show_dia = 1 
    ORDER BY gp.id DESC 
    LIMIT 6
  `)
  return products.map(([id, name, preis, bild_pfad]) => ({ id, name, preis, bild_pfad }))
}

export async function getSingleProduct(id) {
  const db = connection();
  console.log(`Fetching product with id: ${id}`);
  const products = await db.query(`
    SELECT p.id, p.name, p.preis, p.produkt_verweis, p.show_dia, p.kategorie_id, b.bild_pfad
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
    produkt_verweis: product[3],
    show_dia: product[4],
    kategorie_id: product[5],
    bild_pfad: product[6]
  };
}

export async function getSingleUsedProduct(id) {
  const db = connection()
  console.log(`Fetching used product with id: ${id}`)
  const products = await db.query(
    `
    SELECT gp.id, gp.name, gp.preis, gp.produkt_verweis, bg.bild_pfad, k.name as kategorie_name, z.name as zustand, u.username as verkäufer_name, gp.kategorie_id, gp.zustand_id, gp.verkäufer_id
    FROM gebrauchte_produkte gp
    LEFT JOIN bilder_gebraucht bg ON gp.id = bg.gebrauchte_produkte_id
    LEFT JOIN kategorie k ON gp.kategorie_id = k.id
    LEFT JOIN zustand z ON gp.zustand_id = z.id
    LEFT JOIN users u ON gp.verkäufer_id = u.id
    WHERE gp.id = ?
  `,
    [id],
  )

  console.log(`Query result:`, products)

  if (products.length === 0) throw new Error("Gebrauchtes Produkt nicht gefunden.")

  const product = products[0]
  return {
    id: product[0],
    name: product[1],
    preis: product[2],
    produkt_verweis: product[3],
    bild_pfad: product[4],
    kategorie_name: product[5],
    zustand: product[6],
    verkäufer_name: product[7],
    kategorie_id: product[8],
    zustand_id: product[9],
    verkäufer_id: product[10],
  }
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

export async function getAllUsedProducts(filters = {}) {
  const db = connection()

  let query = `
    SELECT gp.id, gp.name, gp.preis, z.name as zustand, u.username as seller, bg.bild_pfad, gp.show_dia
    FROM gebrauchte_produkte gp
    LEFT JOIN bilder_gebraucht bg ON gp.id = bg.gebrauchte_produkte_id
    LEFT JOIN users u ON gp.verkäufer_id = u.id
    LEFT JOIN zustand z ON gp.zustand_id = z.id
    LEFT JOIN kategorie k ON gp.kategorie_id = k.id
    WHERE 1=1
  `

  const queryParams = []

  if (filters.category) {
    query += " AND gp.kategorie_id = ?"
    queryParams.push(filters.category)
  }

  if (filters.priceMin) {
    query += " AND gp.preis >= ?"
    queryParams.push(filters.priceMin)
  }

  if (filters.priceMax) {
    query += " AND gp.preis <= ?"
    queryParams.push(filters.priceMax)
  }

  if (filters.condition) {
    query += " AND gp.zustand_id = ?"
    queryParams.push(filters.condition)
  }

  query += ` ORDER BY gp.id DESC`

  const products = await db.query(query, queryParams)

  return products.map(([id, name, preis, zustand, seller, bild_pfad, show_dia]) => ({
    id,
    name,
    preis,
    zustand,
    seller,
    bild_pfad,
    show_dia,
  }))
}

// Produkte bearbeiten

export async function createProduct(data) {
  const db = connection()
  log("Creating new product with data:", data)
  try {
    log("Executing INSERT query...")
    const result = await db.query(
      "INSERT INTO produkte (name, preis, produkt_verweis, show_dia, kategorie_id) VALUES (?, ?, ?, ?, ?)",
      [data.name, data.preis, data.produkt_verweis, data.show_dia, data.kategorie_id],
    )
    log("INSERT query executed. Result:", result)

    log("Executing SELECT query to get last insert ID...")
    const [newProductId] = await db.query("SELECT last_insert_rowid() as id")
    log("SELECT query executed. Result:", newProductId)

    if (newProductId && newProductId[0]) {
      const id = newProductId[0]
      log("New product created with ID:", id)
      return id
    } else {
      log("Failed to retrieve the new product ID. newProductId:", newProductId)
      throw new Error("Failed to retrieve the new product ID")
    }
  } catch (error) {
    log("Error in createProduct:", error)
    throw error
  }
}

export async function updateProduct(id, data) {
  const db = connection();
  log("Updating product with data:", data);
  await db.query(
    "UPDATE produkte SET name = ?, preis = ?, produkt_verweis = ?, show_dia = ?, kategorie_id = ? WHERE id = ?",
    [data.name, data.preis, data.produkt_verweis, data.show_dia, data.kategorie_id, id]
  );
  log("Product updated successfully");
}

export async function deleteProduct(id) {
  const db = connection();
  try {
    await db.query("BEGIN TRANSACTION");

    await db.query("DELETE FROM bilder WHERE produkt_id = ?", [id]);
    await db.query("DELETE FROM cart_items WHERE product_id = ?", [id]);
    await db.query("DELETE FROM produkte WHERE id = ?", [id]);

    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

export async function createUsedProduct(data) {
  const db = connection()
  log("Creating new used product with data:", data)
  try {
    log("Executing INSERT query...")
    const result = await db.query(
      "INSERT INTO gebrauchte_produkte (name, preis, produkt_verweis, show_dia, kategorie_id, zustand_id, verkäufer_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        data.name,
        data.preis,
        data.produkt_verweis,
        data.show_dia,
        data.kategorie_id,
        data.zustand_id,
        data.verkäufer_id,
      ],
    )
    log("INSERT query executed. Result:", result)

    log("Executing SELECT query to get last insert ID...")
    const [newProductId] = await db.query("SELECT last_insert_rowid() as id")
    log("SELECT query executed. Result:", newProductId)

    if (newProductId && newProductId[0]) {
      const id = newProductId[0]
      log("New used product created with ID:", id)
      return id
    } else {
      log("Failed to retrieve the new used product ID. newProductId:", newProductId)
      throw new Error("Failed to retrieve the new used product ID")
    }
  } catch (error) {
    log("Error in createUsedProduct:", error)
    throw error
  }
}

export async function updateUsedProduct(id, data) {
  const db = connection()
  log("Updating used product with data:", data)
  await db.query(
    "UPDATE gebrauchte_produkte SET name = ?, preis = ?, produkt_verweis = ?, zustand_id = ?, kategorie_id = ?, show_dia = ? WHERE id = ?",
    [data.name, data.preis, data.produkt_verweis, data.zustand_id, data.kategorie_id, data.show_dia, id],
  )
  log("Used product updated successfully")
}

export async function deleteUsedProduct(id) {
  const db = connection()

  try {
    await db.query("BEGIN TRANSACTION");
    
    await db.query("DELETE FROM bilder_gebraucht WHERE gebrauchte_produkte_id = ?", [id])
    await db.query("DELETE FROM cart_items WHERE product_id = ?", [id]);
    await db.query("DELETE FROM gebrauchte_produkte WHERE id = ?", [id])

    await db.query("COMMIT");
} catch (error) {
    await db.query("ROLLBACK");
  throw error;
}
}


// Suchfunktion Produkte
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

export async function searchUsedProducts(searchQuery) {
  const db = connection()
  const query = `
    SELECT gp.id, gp.name, gp.preis, gp.produkt_verweis, b.bild_pfad, k.name as kategorie_name, z.name as zustand, u.username as verkäufer_name, gp.kategorie_id, gp.zustand_id, gp.verkäufer_id
    FROM gebrauchte_produkte gp
    LEFT JOIN bilder b ON gp.id = b.produkt_id
    LEFT JOIN kategorie k ON gp.kategorie_id = k.id
    LEFT JOIN zustand z ON gp.zustand_id = z.id
    LEFT JOIN users u ON gp.verkäufer_id = u.id
    WHERE gp.name LIKE ? OR gp.produkt_verweis LIKE ?
    ORDER BY gp.id DESC
  `
  const queryParams = [`%${searchQuery}%`, `%${searchQuery}%`]

  log("Search Query:", query)
  log("Search Params:", queryParams)

  const products = await db.query(query, queryParams)

  log("Search Results:", products)

  return products.map(
    ([
      id,
      name,
      preis,
      produkt_verweis,
      bild_pfad,
      kategorie_name,
      zustand,
      verkäufer_name,
      kategorie_id,
      zustand_id,
      verkäufer_id,
    ]) => ({
      id,
      name,
      preis,
      produkt_verweis,
      bild_pfad,
      kategorie_name,
      zustand,
      verkäufer_name,
      kategorie_id,
      zustand_id,
      verkäufer_id,
    }),
  )
}

//Images bearbeiten
export async function createImage(productId, imagePath, isUsed = false) {
  const db = connection()
  log("Creating image record for product ID:", productId)
  await db.query("INSERT INTO bilder (produkt_id, bild_pfad) VALUES (?, ?)", [
    productId,
    imagePath,
  ])
  log("Image record created successfully")
}

export async function createUsedProductImage(productId, imagePath) {
  const db = connection()
  log("Creating image record for used product ID:", productId)
  await db.query("INSERT INTO bilder_gebraucht (gebrauchte_produkte_id, bild_pfad) VALUES (?, ?)", [
    productId,
    imagePath,
  ])
  log("Image record created successfully for used product")
}

export async function updateImage(productId, imagePath, isUsed = false) {
  const db = connection()
  const existingImage = await db.query("SELECT * FROM bilder WHERE produkt_id = ?", [
    productId,
    isUsed ? 1 : 0,
  ])

  if (existingImage.length > 0) {
    await db.query("UPDATE bilder SET bild_pfad = ? WHERE produkt_id = ?", [
      imagePath,
      productId,
      isUsed ? 1 : 0,
    ])
  } else {
    await createImage(productId, imagePath, isUsed)
  }
}

export async function updateUsedProductImage(productId, imagePath) {
  const db = connection()
  const existingImage = await db.query("SELECT * FROM bilder_gebraucht WHERE gebrauchte_produkte_id = ?", [productId])

  if (existingImage.length > 0) {
    await db.query("UPDATE bilder_gebraucht SET bild_pfad = ? WHERE gebrauchte_produkte_id = ?", [imagePath, productId])
  } else {
    await createUsedProductImage(productId, imagePath)
  }
}

export async function deleteImage(productId, isUsed = false) {
  const db = connection()
  await db.query("DELETE FROM bilder WHERE produkt_id = ?", [productId])
}

export async function deleteUsedProductImage(productId) {
  const db = connection()
  await db.query("DELETE FROM bilder_gebraucht WHERE gebrauchte_produkte_id = ?", [productId])
}

//Warenkorb laden
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
    WHERE ci.user_id = ?`,
    [userId]);
  log(result);
  return result|| 0;
}

//Warenkorb bearbeiten 
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



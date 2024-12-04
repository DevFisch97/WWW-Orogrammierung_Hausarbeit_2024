import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { render } from "./services/render.js";
import { contentType } from "https://deno.land/std@0.177.0/media_types/mod.ts";
import { initConnection } from "./services/db.js";
import { registerUser, loginUser } from "./services/user_manager.js";
import { getNewProductsDia, getUsedProductsDia, getAllNewProducts, getSingleProduct, updateProduct, deleteProduct } from "./model.js";

// Initialize the database connection
try {
  initConnection("./src/data/user_managment.db");
  console.log("Database initialized successfully.");
} catch (error) {
  console.error("Failed to initialize database:", error);
  Deno.exit(1);
}

// Simple session storage (in production, use a proper session store)
const sessions = new Map();

const PERMISSIONS = {
  ADMIN: ['manage_users', 'create_post', 'send_message', 'view_content'],
  REGISTERED: ['create_post', 'send_message', 'view_content'],
  UNREGISTERED: ['view_content']
};

// Function to generate a random session ID
function generateSessionId(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Function to get user from session
function getUserFromSession(request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  
  const sessionId = cookie.split('=')[1];
  const session = sessions.get(sessionId);
  return session ? { id: session.userId, role: session.role } : null;
}

// Handle user registration
async function handleRegister(request) {
  const formData = await request.formData();
  const username = formData.get("username");
  const email = formData.get("email");
  const password = formData.get("password");
  const passwordRepeat = formData.get("password-repeat");
  const straße = formData.get("straße");
  const hausnummer = formData.get("hausnummer");
  const stadt = formData.get("stadt");
  const plz = formData.get("plz");

  console.log("Registration attempt:", { username, email, straße, hausnummer, stadt, plz });

  if (password !== passwordRepeat) {
    console.log("Password mismatch");
    return new Response(await render("register.html", { error: "Passwörter stimmen nicht überein" }), {
      status: 400,
      headers: { "content-type": "text/html" },
    });
  }

  try {
    const userId = await registerUser(username, email, password, straße, hausnummer, stadt, plz);
    console.log("User registered successfully:", userId);
    return new Response("", {
      status: 302,
      headers: { "Location": "/login" },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(await render("register.html", { error: "Registrierung fehlgeschlagen: " + error.message }), {
      status: 400,
      headers: { "content-type": "text/html" },
    });
  }
}

// Handle user login
async function handleLogin(request) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    const user = await loginUser(email, password);
    if (user) {
      const sessionId = generateSessionId();
      sessions.set(sessionId, { userId: user.id, role: user.role });
      return new Response("", {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict`,
        },
      });
    } else {
      return new Response(await render("login.html", { error: "Ungültige Anmeldedaten" }), {
        status: 401,
        headers: { "content-type": "text/html" },
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return new Response(await render("login.html", { error: "Anmeldung fehlgeschlagen" }), {
      status: 500,
      headers: { "content-type": "text/html" },
    });
  }
}

// Handle user logout
function handleLogout(request) {
  const user = getUserFromSession(request);
  if (user) {
    const cookie = request.headers.get('cookie');
    const sessionId = cookie.split('=')[1];
    sessions.delete(sessionId);
  }
  return new Response("", {
    status: 302,
    headers: {
      "Location": "/",
      "Set-Cookie": "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  });
}

// Serve static files
async function serveStaticFile(path) {
  const filePath = path.startsWith("/static/") 
    ? `./src${path}`
    : `./src/static${path}`;
  try {
    const file = await Deno.readFile(filePath);
    const mimeType = contentType(path.split(".").pop() || "") || "application/octet-stream";
    return new Response(file, {
      headers: { "content-type": mimeType },
    });
  } catch (error) {
    console.error(`Error serving static file: ${filePath}`, error);
    return new Response("File not found", { status: 404 });
  }
}

async function serveAssetFile(path) {
  let filePath;
  if (path.startsWith("/assets/")) {
    // For the logo
    if (path.includes("Logo.png")) {
      filePath = `.${path}`;
    } else {
      // For product images
      filePath = `.${path}`;
    }
  } else {
    // For other assets
    filePath = `./assets${path}`;
  }
  try {
    const file = await Deno.readFile(filePath);
    const mimeType = contentType(path.split(".").pop() || "") || "application/octet-stream";
    return new Response(file, {
      headers: { "content-type": mimeType },
    });
  } catch (error) {
    console.error(`Error serving asset file: ${filePath}`, error);
    return new Response("Asset file not found", { status: 404 });
  }
}

// Main request handler
const handler = async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Serve static files
  if (path.startsWith("/static/") || path === "/styles.css" || path === "/script.js") {
    return await serveStaticFile(path);
  }

  // Serve asset files (including logo and product images)
  if (path.startsWith("/assets/") || path.endsWith(".jpeg") || path.endsWith(".png")) {
    return await serveAssetFile(path);
  }

  // Handle authentication routes
  if (path === "/api/register" && request.method === "POST") {
    return await handleRegister(request);
  }
  
  if (path === "/api/login" && request.method === "POST") {
    return await handleLogin(request);
  }
  
  if (path === "/api/logout") {
    return handleLogout(request);
  }

  // Handle existing routes with authentication check
  let content = "";
  let response_contentType = "text/html";
  
  // Check authentication for protected routes
  const protectedRoutes = ['/account'];
  if (protectedRoutes.includes(path)) {
    const user = getUserFromSession(request);
    if (!user) {
      return new Response(await render("login.html"), {
        headers: { "content-type": response_contentType}
      });
    }
  }

  // Get user for all routes
  const user = getUserFromSession(request);
  console.log('Current user:', user);  // Add this line for debugging

  switch (path) {
    case "/":
      const newProducts = await getNewProductsDia();
      const usedProducts = await getUsedProductsDia();
      content = await render("index.html", { user, newProducts, usedProducts });
      break;

    case "/new-products":
      const allNewProducts = await getAllNewProducts();
      content = await render("new-products.html", { user, allNewProducts });
      break;

    case (path.match(/^\/product\/\d+$/) || {}).input:
      const productId = parseInt(path.split('/')[2]);
      const product = await getSingleProduct(productId);
      content = await render("product_details.html", { user, product });
      break;

    case (path.match(/^\/product\/\d+\/edit$/) || {}).input:
      const editProductId = parseInt(path.split('/')[2]);
        if (request.method === 'GET') {
          if (!user || user.role !== 'admin') {  
            console.log('Unauthorized access attempt. User:', user);
            return new Response("Unauthorized", { status: 401 });
          }
          const editProduct = await getSingleProduct(editProductId);
          content = await render("product_edit.html", { user, product: editProduct });
        } else if (request.method === 'POST') {
          if (!user || user.role !== 'admin') {
            return new Response("Unauthorized", { status: 401 });
          }
          const formData = await request.formData();
          const updatedData = {
            name: formData.get('name'),
            preis: parseFloat(formData.get('preis')),
            beschreibung: formData.get('beschreibung'),
            show_dia: formData.get('show_dia') === 'on'
          };
          await updateProduct(editProductId, updatedData);
          return new Response("", {
            status: 302,
            headers: { "Location": `/product/${editProductId}` },
          });
        }
      break;

    case (path.match(/^\/product\/\d+\/delete$/) || {}).input:
      if (!user || user.role !== 'admin') {
        return new Response("Unauthorized", { status: 401 });
      }
      if (request.method === 'POST') {
        const deleteProductId = parseInt(path.split('/')[2]);
        await deleteProduct(deleteProductId);
        return new Response("", {
          status: 302,
          headers: { "Location": "/new-products" },
        });
      }
      break;

    case "/used-products":
      content = await render("used-products.html", { user });
      break;

    case "/about":
      content = await render("about.html", { user });
      break;

    case "/contact":
      content = await render("contact.html", { user });
      break;

    case "/login":
      content = await render("login.html", { user });
      break;

    case "/register":
      content = await render("register.html", { user });
      break;

    case "/shopping_cart":
      content = await render("shopping_cart.html", { user });
      break;

    default:
      content = await render("error404.html", { user });
  }

  return new Response(content, {
    headers: { "content-type": response_contentType},
  });
};

const port = 8000;
console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await serve(handler, { port });


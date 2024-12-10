import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { render } from "./services/render.js";
import { initConnection } from "./services/db.js";
import {
  getNewProductsDia,
  getUsedProductsDia,
  getAllNewProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  addToCart,
  updateCartItem,
  removeFromCart,
  getCartItems
} from "./model.js";
import { Login_Controller } from "./controllers/login_controller.js";
import { Register_Controller } from "./controllers/register_controller.js";
import { StaticFileController } from "./controllers/staticFile_controller.js";
import { AssetFileController } from "./controllers/assetFile_controller.js";

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

// Function to get user from session
function getUserFromSession(request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  
  const sessionId = cookie.split('=')[1];
  const session = sessions.get(sessionId);
  return session ? { id: session.userId, role: session.role } : null;
}

// Create instances of the controllers
const loginController = new Login_Controller(render, sessions);
const registerController = new Register_Controller(render);
const staticFileController = new StaticFileController();
const assetFileController = new AssetFileController();

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

// Main request handler
const handler = async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Serve static files
  if (path.startsWith("/static/") || path === "/styles.css" || path === "/script.js") {
    return await staticFileController.serveStaticFile(path);
  }

  // Serve asset files (including logo and product images)
  if (path.startsWith("/assets/") || path.endsWith(".jpeg") || path.endsWith(".png")) {
    return await assetFileController.serveAssetFile(path);
  }

  // Handle authentication routes
  if (path === "/api/register" && request.method === "POST") {
    return await registerController.handleRegister(request);
  }
  
  if (path === "/api/login" && request.method === "POST") {
    return await loginController.handleLogin(request);
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

  // New routes for cart actions
  if (path === "/api/cart/add" && request.method === "POST") {
    const user = getUserFromSession(request);
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const formData = await request.formData();
    const productId = parseInt(formData.get("productId"));
    const quantity = parseInt(formData.get("quantity"));
    await addToCart(user.id, productId, quantity);
    return new Response(JSON.stringify({ success: true, message: "Product added to cart" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (path === "/api/cart/update" && request.method === "POST") {
    const user = getUserFromSession(request);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const formData = await request.formData();
    const productId = parseInt(formData.get("productId"));
    const quantity = parseInt(formData.get("quantity"));
    await updateCartItem(user.id, productId, quantity);
    return new Response("", { status: 200 });
  }

  if (path === "/api/cart/remove" && request.method === "POST") {
    const user = getUserFromSession(request);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const formData = await request.formData();
    const productId = parseInt(formData.get("productId"));
    await removeFromCart(user.id, productId);
    return new Response("", { status: 200 });
  }

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
      if (!user) {
        return new Response("", {
          status: 302,
          headers: { "Location": "/login" },
        });
      }
      const cartItems = await getCartItems(user.id);
      content = await render("shoppingcart.html", { user, cartItems });
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


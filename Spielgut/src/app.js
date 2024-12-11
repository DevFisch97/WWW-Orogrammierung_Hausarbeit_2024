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
} from "./model.js";
import { Login_Controller } from "./controllers/login_controller.js";
import { Register_Controller } from "./controllers/register_controller.js";
import { StaticFileController } from "./controllers/staticFile_controller.js";
import { AssetFileController } from "./controllers/assetFile_controller.js";
import { Cart_Controller } from "./controllers/cart_controller.js";
import { setCookie, getCookies } from "https://deno.land/std@0.177.0/http/cookie.ts";
import { generateCSRFToken, verifyCSRFToken } from "./csrf.js";

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
const cartController = new Cart_Controller(render);

// Handle user logout
function handleLogout(request) {
  const user = getUserFromSession(request);
  if (user) {
    const cookie = request.headers.get('cookie');
    const sessionId = cookie.split('=')[1];
    sessions.delete(sessionId);
  }
  const response = new Response("", {
    status: 302,
    headers: {
      "Location": "/",
      "Set-Cookie": "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  });
  setFlashMessage(response, "Sie wurden erfolgreich abgemeldet.", "success");
  return response;
}

// Function to set flash message
function setFlashMessage(response, message, type = 'info') {
  const flashMessage = JSON.stringify({ message, type, timestamp: Date.now() });
  setCookie(response.headers, {
    name: "flashMessage",
    value: encodeURIComponent(flashMessage),
    path: "/",
    maxAge: 60, // 1 minute
  });
}

// Function to get and clear flash message
function getAndClearFlashMessage(request, response) {
  const cookies = getCookies(request.headers);
  const flashMessage = cookies.flashMessage;
  if (flashMessage) {
    const decodedMessage = JSON.parse(decodeURIComponent(flashMessage));
    const currentTime = Date.now();
    if (currentTime - decodedMessage.timestamp < 5000) { // 5 seconds
      // Clear the flash message cookie
      setCookie(response.headers, {
        name: "flashMessage",
        value: "",
        path: "/",
        maxAge: 0,
      });
      return decodedMessage;
    }
  }
  return null;
}

// Main request handler
const handler = async (request) => {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const searchParams = url.searchParams;

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
      const response = await registerController.handleRegister(request);
      setFlashMessage(response, "Registrierung erfolgreich! Sie können sich jetzt anmelden.", "success");
      return response;
    }
    
    if (path === "/api/login" && request.method === "POST") {
      const response = await loginController.handleLogin(request);
      if (response.status === 302) {
        setFlashMessage(response, "Anmeldung erfolgreich!", "success");
      }
      return response;
    }
    
    if (path === "/api/logout") {
      return handleLogout(request);
    }

    // Handle existing routes with authentication check
    let content = "";
    let response_contentType = "text/html";
    
    // Check authentication for protected routes
    const protectedRoutes = ['/account', '/shopping_cart', '/api/cart/add', '/api/cart/update', '/api/cart/remove'];
    if (protectedRoutes.includes(path)) {
      const user = getUserFromSession(request);
      if (!user) {
        const response = new Response("", {
          status: 302,
          headers: { "Location": "/login" }
        });
        setFlashMessage(response, "Bitte melden Sie sich an, um fortzufahren.", "info");
        return response;
      }
    }

    // Get user for all routes
    const user = getUserFromSession(request);
    console.log('Current user:', user);  // Add this line for debugging

    // Generate CSRF token for authenticated users
    let csrfToken = null;
    if (user) {
      csrfToken = await generateCSRFToken(user.sessionId);
    }

    // Verify CSRF token for POST, PUT, DELETE requests
    if (["POST", "PUT", "DELETE"].includes(request.method) && user) {
      const formData = await request.formData();
      const token = formData.get("_csrf");
      if (!token || !(await verifyCSRFToken(token, user.sessionId))) {
        return new Response("Invalid CSRF token", { status: 403 });
      }
    }

    // Get flash message
    const flashMessage = getAndClearFlashMessage(request);

    // Handle cart routes
    if (path === "/api/cart/add" && request.method === "POST") {
      return await cartController.handleAddToCart(request, user);
    }

    if (path === "/api/cart/update" && request.method === "POST") {
      return await cartController.handleUpdateCartItem(request, user);
    }

    if (path === "/api/cart/remove" && request.method === "POST") {
      return await cartController.handleRemoveFromCart(request, user);
    }

    switch (path) {
      case "/":
        const newProducts = await getNewProductsDia();
        const usedProducts = await getUsedProductsDia();
        content = await render("index.html", { user, newProducts, usedProducts, flashMessage });
        break;

      case "/new-products":
        const allNewProducts = await getAllNewProducts();
        content = await render("new-products.html", { user, allNewProducts, flashMessage });
        break;

      case (path.match(/^\/product\/\d+$/) || {}).input:
        const productId = parseInt(path.split('/')[2]);
        const quantity = searchParams.get('quantity');
        const addToCartSuccess = searchParams.get('success') === 'true';
        return await cartController.renderProductDetails(user, productId, quantity, addToCartSuccess, flashMessage);

      case (path.match(/^\/product\/\d+\/edit$/) || {}).input:
        const editProductId = parseInt(path.split('/')[2]);
          if (request.method === 'GET') {
            if (!user || user.role !== 'admin') {  
              console.log('Unauthorized access attempt. User:', user);
              return new Response("Unauthorized", { status: 401 });
            }
            const editProduct = await getSingleProduct(editProductId);
            content = await render("product_edit.html", { user, product: editProduct, flashMessage });
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
            const response = new Response("", {
              status: 302,
              headers: { "Location": `/product/${editProductId}` },
            });
            setFlashMessage(response, "Produkt erfolgreich aktualisiert.", "success");
            return response;
          }
        break;

      case (path.match(/^\/product\/\d+\/delete$/) || {}).input:
        if (!user || user.role !== 'admin') {
          return new Response("Unauthorized", { status: 401 });
        }
        if (request.method === 'POST') {
          const deleteProductId = parseInt(path.split('/')[2]);
          await deleteProduct(deleteProductId);
          const response = new Response("", {
            status: 302,
            headers: { "Location": "/new-products" },
          });
          setFlashMessage(response, "Produkt erfolgreich gelöscht.", "success");
          return response;
        }
        break;

      case "/used-products":
        content = await render("used-products.html", { user, flashMessage });
        break;

      case "/about":
        content = await render("about.html", { user, flashMessage });
        break;

      case "/contact":
        content = await render("contact.html", { user, flashMessage });
        break;

      case "/login":
        content = await render("login.html", { user, flashMessage });
        break;

      case "/register":
        content = await render("register.html", { user, flashMessage });
        break;

      case "/shopping_cart":
        return await cartController.renderShoppingCart(user, flashMessage);

      default:
        content = await render("error404.html", { user, flashMessage });
    }

    const response = new Response(content, {
      headers: { "content-type": response_contentType },
    });

    // Clear the flash message cookie
    setCookie(response.headers, {
      name: "flashMessage",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response("An error occurred. Please try again later.", {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }
};

const port = 8000;
console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await serve(handler, { port });


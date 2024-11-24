import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { render } from "./services/render.js";
import { contentType } from "https://deno.land/std@0.177.0/media_types/mod.ts";
import { initConnection, connection } from "./services/db.js";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import * as crypto from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { registerUser, loginUser, getUserRole } from "./services/user_manager.js";

// Initialize the database connection
initConnection("./src/data/user_managment.db");

// Simple session storage (in production, use a proper session store)
const sessions = new Map();

const PERMISSIONS = {
  ADMIN: ['manage_users', 'create_post', 'send_message', 'view_content'],
  REGISTERED: ['create_post', 'send_message', 'view_content'],
  UNREGISTERED: ['view_content']
};

async function handleRegister(request) {
  const body = await request.json();
  const { username, email, password } = body;
  
  try {
    const userId = await registerUser(username, email, password);
    return new Response(JSON.stringify({ message: 'User registered successfully', userId }), {
    status: 201,
    headers: { 'content-type': 'application/json' }
    });
    } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
    status: 400,
    headers: { 'content-type': 'application/json' }
    });
    }
    }

    async function handleLogin(request) {
      const body = await request.json();
      const { email, password } = body;
      
      try {
      const user = await loginUser(email, password);
      if (user) {
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { userId: user.id });
      
      plaintext
        return new Response(JSON.stringify({ message: 'Login successful' }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly`
          }
        });
      } else {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
      });
      }
      }
      
  

function getUserFromSession(request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  
  const sessionId = cookie.split('=')[1];
  return sessions.get(sessionId);
}

const port = 8000;

const handler = async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  console.log(`Received request for: ${path}`);

  // Serve static files
  if (path.startsWith("/static/") || path === "/styles.css" || path === "/script.js") {
    const filePath = path.startsWith("/static/") 
      ? `./src${path}`
      : `./src/static${path}`;
    console.log(`Attempting to serve file: ${filePath}`);
    try {
      const file = await Deno.readFile(filePath);
      const mimeType = contentType(path.split(".").pop() || "") || "application/octet-stream";
      console.log(`Successfully read file: ${filePath} with MIME type: ${mimeType}`);
      return new Response(file, {
        headers: { "content-type": mimeType },
      });
    } catch (error) {
      console.error(`Error serving static file: ${filePath}`, error);
      return new Response("File not found", { status: 404 });
    }
  }

  // Handle authentication routes
  if (path === "/api/register" && request.method === "POST") {
    return await handleRegister(request);
  }
  
  if (path === "/api/login" && request.method === "POST") {
    return await handleLogin(request);
  }
  
  if (path === "/api/logout") {
    const user = getUserFromSession(request);
    if (user) {
      const cookie = request.headers.get('cookie');
      const sessionId = cookie.split('=')[1];
      sessions.delete(sessionId);
    }
    return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
      headers: {
        'content-type': 'application/json',
        'Set-Cookie': 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    });
  }

  // Handle existing routes with authentication check
  let content = "";
  let respone_contentType = "text/html";
  
  // Check authentication for protected routes
  const protectedRoutes = ['/account', '/new-products'];
  if (protectedRoutes.includes(path)) {
    const user = getUserFromSession(request);
    if (!user) {
      return new Response(await render("login.html"), {
        headers: { "content-type": respone_contentType}
      });
    }
  }

  switch (path) {
    case "/":
      content = await render("index.html");
      break;
    case "/new-products":
      content = await render("new-products.html");
      break;
    case "/used-products":
      content = await render("used-products.html");
      break;
    case "/about":
      content = await render("about.html");
      break;
    case "/contact":
      content = await render("contact.html");
      break;
    case "/login":
      content = await render("login.html");
      break;
    case "/register":
      content = await render("register.html");
      break;
    case "/shopping_cart":
      content = await render("shopping_cart.html");
      break;
    default:
      content = await render("error404.html");
  }

  return new Response(content, {
    headers: { "content-type": respone_contentType},
  });
};

console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await serve(handler, { port });
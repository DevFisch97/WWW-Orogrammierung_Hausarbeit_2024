import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { render } from "./services/render.js";
import { initConnection } from "./services/db.js";
import { Router } from "./router.js";
import { createDebug } from "./services/debug.js";

const log = createDebug('spielgut:app');

// Initialize the database connection
try {
  initConnection("./src/data/user_managment.db");
  log("Database initialized successfully.");
} catch (error) {
  error("Failed to initialize database:", error);
  Deno.exit(1);
}

const router = new Router(render);

const handler = async (request) => {
  try {
    return await router.route(request);
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response("An error occurred. Please try again later.", {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }
};

const port = 8000;
log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await serve(handler, { port });
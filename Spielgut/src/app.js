import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { render } from "./services/render.js";
import { initConnection } from "./services/db.js";
import { Router } from "./router.js";

// Initialize the database connection
try {
  initConnection("./src/data/user_managment.db");
  console.log("Database initialized successfully.");
} catch (error) {
  console.error("Failed to initialize database:", error);
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
console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await serve(handler, { port });
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { render } from "./services/render.js";

const port = 8000;

const handler = async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;

  let content = "";
  let contentType = "text/html";

  // Dummy data for products (replace this with actual data fetching later)

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
    case "/account":
      content = await render("account.html");
      break;
          case "/account":
      content = await render("account.html");
      break;
    case "/shopping_cart":
      content = await render("shopping_cart.html");
      break;
    case "/styles.css":
      content = await Deno.readTextFile("./src/templates/styles.css");
      contentType = "text/css";
      break;
    case "/script.js":
      content = await Deno.readTextFile("./src/templates/script.js");
      contentType = "application/javascript";
      break;
    default:
      content = await render("error404.html");
  }

  return new Response(content, {
    headers: { "content-type": contentType },
  });
};

console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await serve(handler, { port });
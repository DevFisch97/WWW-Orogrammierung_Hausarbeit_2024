import nunjucks from "npm:nunjucks@3.2.4";
import { join } from "https://deno.land/std/path/mod.ts";

const templatesDir = join(Deno.cwd(), "src", "templates");

nunjucks.configure(templatesDir, {
  autoescape: true,
  noCache: true
});

export async function render(path, data) {
  try {
    const content = await nunjucks.render(path, data);
    return new Response(content, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  } catch (error) {
    console.error(`Error rendering template ${path}:`, error);
    return new Response(`Error rendering page: ${error.message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}


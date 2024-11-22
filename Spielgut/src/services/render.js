import nunjucks from "npm:nunjucks@3.2.4";
import { join } from "https://deno.land/std/path/mod.ts";

const templatesDir = join(Deno.cwd(), "src", "templates");

nunjucks.configure(templatesDir, {
  autoescape: true,
  noCache: true
});

export function render(path, data) {
  return nunjucks.render(path, data);
}
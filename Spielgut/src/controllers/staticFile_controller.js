import { contentType } from "https://deno.land/std@0.177.0/media_types/mod.ts";

export class StaticFileController {
  async serveStaticFile(path) {
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
}

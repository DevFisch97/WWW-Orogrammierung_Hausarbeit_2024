import { contentType } from "https://deno.land/std@0.177.0/media_types/mod.ts";

export class AssetFileController {
  async serveAssetFile(path) {
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
}
import { contentType } from "https://deno.land/std@0.177.0/media_types/mod.ts";
import { join, normalize } from "https://deno.land/std@0.177.0/path/mod.ts";

export class AssetFileController {
  #assetDir = "./assets";

  async serveAssetFile(path) {
    const cleanPath = path.replace(/^\/+/, '').replace(/^assets\//, '');
    const normalizedPath = normalize(cleanPath);
    const filePath = join(this.#assetDir, normalizedPath);

    if (!filePath.startsWith(normalize(this.#assetDir))) {
      console.error(`Versuchter Zugriff außerhalb des Asset-Verzeichnisses: ${path}`);
      return new Response("Zugriff verweigert", { status: 403 });
    }

    try {
      const file = await Deno.readFile(filePath);
      const mimeType = contentType(path.split(".").pop() || "") || "application/octet-stream";
      return new Response(file, {
        headers: { "content-type": mimeType },
      });
    } catch (error) {
      console.error(`Fehler beim Bereitstellen der Asset-Datei: ${filePath}`, error);
      return new Response("Asset-Datei nicht gefunden", { status: 404 });
    }
  }
}
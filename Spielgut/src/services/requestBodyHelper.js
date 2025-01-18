import { createDebug } from "./debug.js";

const log = createDebug('spielgut:requestBodyHelper');

export async function getRequestBody(request) {
  if (!request.cachedBody) {
    const contentType = request.headers.get("content-type");
    let body;

    if (contentType && contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    } else if (contentType && contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType && contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = {};
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          body[key] = value;
        } else {
          body[key] = value;
        }
      }
    } else {
      body = await request.text();
    }

    request.cachedBody = body;
    log("Cached request body:", body);
  }

  return request.cachedBody;
}
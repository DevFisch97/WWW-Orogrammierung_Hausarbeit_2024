import {
  getNewProductsDia,
  getUsedProductsDia,
  getAllNewProducts,
  getAllUsedProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  createUsedProduct,
  updateUsedProduct,
  deleteUsedProduct,
} from "../model.js"
import { setFlashMessage } from "../controllers/flashmessages_controller.js";
import { join, dirname } from "https://deno.land/std/path/mod.ts";
import { connection } from "../services/db.js";
import { createDebug } from "../services/debug.js";
import { getRequestBody } from "../services/requestBodyHelper.js";

const log = createDebug('spielgut:pCon');

export class ProductController {
  constructor() {}

  // Produkte anzeigen
  async getHomePageData(user, flashMessage, csrfToken) {
    const newProducts = await getNewProductsDia()
    const usedProducts = await getUsedProductsDia()
    return { user, flashMessage, csrfToken, newProducts, usedProducts }
  }

  async getDiaShowProducts() {
    const db = connection();
    const products = await db.query(`
      SELECT p.id, p.name, p.preis, b.bild_pfad
      FROM produkte p
      LEFT JOIN bilder b ON p.id = b.produkt_id
      WHERE p.show_dia = true
      ORDER BY RANDOM()
      LIMIT 10
    `);
    return products.map(([id, name, preis, bild_pfad]) => ({ id, name, preis, bild_pfad }));
  }

  async getNewProductsData(user, flashMessage, csrfToken, filterParams = {}) {
    log('ProductController: Received filter params:', filterParams);
    const validFilterParams = {};
    if (filterParams.category) {
      validFilterParams.category = filterParams.category;
    }
    if (filterParams.priceMin && !isNaN(parseFloat(filterParams.priceMin))) {
      validFilterParams.priceMin = parseFloat(filterParams.priceMin);
    }
    if (filterParams.priceMax && !isNaN(parseFloat(filterParams.priceMax))) {
      validFilterParams.priceMax = parseFloat(filterParams.priceMax);
    }

    log('ProductController: Valid filter params:', validFilterParams);

    const products = await getAllNewProducts(validFilterParams);
    log('ProductController: Products returned:', products.length);
    
    return { 
      user, 
      products, 
      flashMessage, 
      csrfToken, 
      filterParams: validFilterParams
    };
  }

  async getUsedProductsData(user, flashMessage, csrfToken, filterParams)
  {
    const db = connection()
    const kategorien = await db.query("SELECT id, name FROM kategorie")
    const zustände = await db.query("SELECT id, name FROM zustand")
  
    const allUsedProducts = await getAllUsedProducts(filterParams)
    return {
      user,
      products: allUsedProducts,
      flashMessage,
      csrfToken,
      filters: filterParams,
      kategorien: kategorien.map(([id, name]) => ({ id, name })),
      zustände: zustände.map(([id, name]) => ({ id, name })),
    }
  }

  async getProductDetailsData(user, productId, quantity, addToCartSuccess, flashMessage, csrfToken) {
    try {
      const product = await getSingleProduct(productId);
      console.log("Product details:", product); 
      return { user, product, quantity: parseInt(quantity) || 1, addToCartSuccess, flashMessage, csrfToken };
    } catch (error) {
      console.error(`Error fetching product details: ${error.message}`);
      return { user, error: "Produkt nicht gefunden", flashMessage, csrfToken };
    }
  }

  async getUsedProductDetailsData(user, productId, flashMessage, csrfToken) {
    try {
      const product = await getSingleUsedProduct(productId)
      console.log("Used product details:", product)
      return { user, product, flashMessage, csrfToken }
    } catch (error) {
      console.error(`Error fetching used product details: ${error.message}`)
      return { user, error: "Produkt nicht gefunden", flashMessage, csrfToken }
    }
  }

  async getProductEditData(user, productId, flashMessage, csrfToken) {
    if (!user || user.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }
    const db = connection();
    const editProduct = await getSingleProduct(productId);
    
    log("Edit Product Data:", editProduct);

    const kategorien = await db.query("SELECT id, name FROM kategorie");
    
    return { 
      user, 
      product: editProduct, 
      kategorien: kategorien.map(([id, name]) => ({ id, name })),
      flashMessage, 
      csrfToken 
    };
  }

  async getUsedProductEditData(user, productId, flashMessage, csrfToken) {
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }
    const db = connection()
    const editProduct = await getSingleUsedProduct(productId)

    if (editProduct.verkäufer_id !== user.id) {
      return new Response("Unauthorized", { status: 401 })
    }

    log("Edit Used Product Data:", editProduct)

    const kategorien = await this.getKategorien()
    const zustände = await this.getZustände()

    return {
      user,
      product: editProduct,
      kategorien,
      zustände,
      flashMessage,
      csrfToken,
    }
  }

  // Produkte erstellen
  async handleCreateProduct(request, user) {
    if (!user || user.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const formData = await getRequestBody(request);
      log("Form data received:", formData);

      return this.processProductCreation(formData, user);

    } catch (error) {
      log("Error reading form data:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/create-product" },
      });
      setFlashMessage(response, "Fehler beim Lesen der Formulardaten. Bitte versuchen Sie es erneut.", "error");
      return response;
    }
  }
  async processProductCreation(formData, user)
{
  const productData = {
    name: formData.productName,
    produkt_verweis: formData.productDescription,
    preis: Number.parseFloat(formData.productPrice),
    kategorie_id: Number.parseInt(formData.productCategory),
    show_dia: formData.diaShow === "on",
  }

  const productImage = formData.productImage

  log("Product data:", productData)
  log("Product image:", productImage ? "Image file received" : "No image file")

  try {
    log("Creating new product...")
    const newProductId = await createProduct(productData)
    log("New product created with ID:", newProductId)

    if (newProductId && productImage && productImage.size > 0) {
      const fileName = `product_${newProductId}_${Date.now()}.jpg`
      const projectRoot = Deno.cwd()
      const imagePath = join(projectRoot, "assets", "Produktbilder", fileName)

      log("Saving image file...")
      await this.saveImageFile(productImage, imagePath)
      log("Image file saved successfully")

      log("Creating image record in database...")
      await createImage(newProductId, `/assets/Produktbilder/${fileName}`)
      log("Image record created successfully")
    }

    const response = new Response("", {
      status: 302,
      headers: { Location: "/new-products" },
    })
    setFlashMessage(response, "Produkt erfolgreich erstellt.", "success")
    return response;
  } catch (error) {
    log("Error creating product:", error)
    const response = new Response("", {
      status: 302,
      headers: { Location: "/create-product" },
    })
    setFlashMessage(response, `Fehler beim Erstellen des Produkts: ${error.message}`, "error")
    return response;
  }
}

async handleCreateUsedProduct(request, user) {
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const formData = await getRequestBody(request)
    log("Form data received:", formData)

    return this.processUsedProductCreation(formData, user)
  } catch (error) {
    log("Error reading form data:", error)
    const response = new Response("", {
      status: 302,
      headers: { Location: "/create-used-product" },
    })
    setFlashMessage(response, "Fehler beim Lesen der Formulardaten. Bitte versuchen Sie es erneut.", "error")
    return response
  }
}

async processUsedProductCreation(formData, user) {
  const productData = {
    name: formData.productName,
    produkt_verweis: formData.productDescription,
    preis: Number.parseFloat(formData.productPrice),
    kategorie_id: Number.parseInt(formData.productCategory),
    zustand_id: Number.parseInt(formData.productCondition),
    seller_id: user.id,
    show_dia: formData.diaShow === "on",
  }

  const productImage = formData.productImage

  log("Used product data:", productData)
  log("Used product image:", productImage ? "Image file received" : "No image file")

  try {
    log("Creating new used product...")
    const newProductId = await createUsedProduct(productData)
    log("New used product created with ID:", newProductId)

    if (newProductId && productImage && productImage.size > 0) {
      const fileName = `used_product_${newProductId}_${Date.now()}.jpg`
      const projectRoot = Deno.cwd()
      const imagePath = join(projectRoot, "assets", "Produktbilder", fileName)

      log("Saving image file...")
      await this.saveImageFile(productImage, imagePath)
      log("Image file saved successfully")

      log("Creating image record in database...")
      await createImage(newProductId, `/assets/Produktbilder/${fileName}`, true)
      log("Image record created successfully")
    }

    const response = new Response("", {
      status: 302,
      headers: { Location: "/used-products" },
    })
    setFlashMessage(response, "Gebrauchtes Produkt erfolgreich erstellt.", "success")
    return response
  } catch (error) {
    log("Error creating used product:", error)
    const response = new Response("", {
      status: 302,
      headers: { Location: "/create-used-product" },
    })
    setFlashMessage(response, `Fehler beim Erstellen des gebrauchten Produkts: ${error.message}`, "error")
    return response
  }
}
  // Produkte aktualisieren
  async handleProductUpdate(request, user, productId) {
    if (!user || user.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const formData = await getRequestBody(request);
      log("Received form data:", formData);

      const updatedData = {
        name: formData.name,
        preis: parseFloat(formData.preis),
        produkt_verweis: formData.produkt_verweis,
        show_dia: formData.show_dia === 'on',
        kategorie_id: parseInt(formData.kategorie_id)
      };

      log("Updating product with data:", updatedData);
      await updateProduct(productId, updatedData);

      const deleteExistingImage = formData.delete_image === 'on';
      const newImage = formData.new_image;

      if (deleteExistingImage) {
        log("Deleting existing image for product:", productId);
        await deleteImage(productId);
      }

      if (newImage && newImage.size > 0) {
        const fileName = `product_${productId}_${Date.now()}.jpg`;
        const projectRoot = Deno.cwd();
        const imagePath = join(projectRoot, "assets", "Produktbilder", fileName);
        
        log("Saving new image to:", imagePath);
        await this.saveImageFile(newImage, imagePath);
        const bild_pfad = `/assets/Produktbilder/${fileName}`;
        await updateImage(productId, bild_pfad);
      }

      const response = new Response("", {
        status: 302,
        headers: { "Location": `/product/${productId}` },
      });
      setFlashMessage(response, "Produkt erfolgreich aktualisiert.", "success");
      return response;
    } catch (error) {
      log("Error updating product:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": `/product/${productId}/edit` },
      });
      setFlashMessage(response, `Fehler beim Aktualisieren des Produkts: ${error.message}`, "error");
      return response;
    }
  }

  async handleUsedProductUpdate(request, user, productId) {
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    try {
      const formData = await getRequestBody(request)
      log("Received form data for used product update:", formData)

      const product = await getSingleUsedProduct(productId)
      if (product.verkäufer_id !== user.id && user.role !== "admin") {
        return new Response("Unauthorized", { status: 401 })
      }

      const updatedData = {
        name: formData.name,
        preis: Number.parseFloat(formData.preis),
        produkt_verweis: formData.produkt_verweis,
        show_dia: formData.show_dia === "on",
        kategorie_id: Number.parseInt(formData.kategorie_id),
        zustand_id: Number.parseInt(formData.zustand_id),
      }

      log("Updating used product with data:", updatedData)
      await updateUsedProduct(productId, updatedData)

      const deleteExistingImage = formData.delete_image === "on"
      const newImage = formData.new_image

      if (deleteExistingImage) {
        log("Deleting existing image for used product:", productId)
        await deleteImage(productId, true)
      }

      if (newImage && newImage.size > 0) {
        const fileName = `used_product_${productId}_${Date.now()}.jpg`
        const projectRoot = Deno.cwd()
        const imagePath = join(projectRoot, "assets", "Produktbilder", fileName)

        log("Saving new image to:", imagePath)
        await this.saveImageFile(newImage, imagePath)
        const bild_pfad = `/assets/Produktbilder/${fileName}`
        await updateImage(productId, bild_pfad, true)
      }

      const response = new Response("", {
        status: 302,
        headers: { Location: `/used-product/${productId}` },
      })
      setFlashMessage(response, "Gebrauchtes Produkt erfolgreich aktualisiert.", "success")
      return response
    } catch (error) {
      log("Error updating used product:", error)
      const response = new Response("", {
        status: 302,
        headers: { Location: `/used-product/${productId}/edit` },
      })
      setFlashMessage(response, `Fehler beim Aktualisieren des gebrauchten Produkts: ${error.message}`, "error")
      return response
    }
  }

  // Produkte löschen
  async handleProductDelete(user, productId) {
    if (!user || user.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }
    await deleteProduct(productId);
    const response = new Response("", {
      status: 302,
      headers: { "Location": "/new-products" },
    });
    setFlashMessage(response, "Produkt erfolgreich gelöscht.", "success");
    return response;
  }

  async handleUsedProductDelete(user, productId) {
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    try {
      const product = await getSingleUsedProduct(productId)
      if (product.verkäufer_id !== user.id) {
        return new Response("Unauthorized", { status: 401 })
      }

      await deleteUsedProduct(productId)
      const response = new Response("", {
        status: 302,
        headers: { Location: "/used-products" },
      })
      setFlashMessage(response, "Gebrauchtes Produkt erfolgreich gelöscht.", "success")
      return response
    } catch (error) {
      log("Error deleting used product:", error)
      const response = new Response("", {
        status: 302,
        headers: { Location: `/used-product/${productId}` },
      })
      setFlashMessage(response, `Fehler beim Löschen des gebrauchten Produkts: ${error.message}`, "error")
      return response
    }
  }

  // Hilfsfunktionen
  async saveImageFile(file, path)
  {
    try {
      const contents = await file.arrayBuffer()
      const directory = dirname(path)
      await Deno.mkdir(directory, { recursive: true })
      await Deno.writeFile(path, new Uint8Array(contents))
      log(`File saved successfully to ${path}`)
    } catch (error) {
      log(`Error saving file to ${path}:`, error)
      throw error
    }
  }
  async getKategorien() {
    const db = connection()
    const kategorien = await db.query("SELECT id, name FROM kategorie")
    return kategorien.map(([id, name]) => ({ id, name }))
  }

  async getZustände() {
    const db = connection()
    const zustände = await db.query("SELECT id, name FROM zustand")
    return zustände.map(([id, name]) => ({ id, name }))
  }


  // Suchfunktion
  async getSearchResults(user, searchQuery, flashMessage, csrfToken) {
    log('ProductController: Received search query:', searchQuery);
    
    try {
      const products = await searchProducts(searchQuery);
      log('ProductController: Search results returned:', products.length);
      
      return { 
        user, 
        products, 
        searchQuery, 
        flashMessage, 
        csrfToken 
      };
    } catch (error) {
      log('Error in search:', error);
      return { 
        user, 
        products: [], 
        searchQuery, 
        flashMessage: { type: 'error', message: 'Ein Fehler ist bei der Suche aufgetreten.' }, 
        csrfToken 
      };
    }
  }
    async getUsedProductSearchResults(user, searchQuery, flashMessage, csrfToken) {
    log("ProductController: Received search query for used products:", searchQuery)

    try {
      const products = await searchUsedProducts(searchQuery)
      log("ProductController: Used product search results returned:", products.length)

      return {
        user,
        products,
        searchQuery,
        flashMessage,
        csrfToken,
      }
    } catch (error) {
      log("Error in used product search:", error)
      return {
        user,
        products: [],
        searchQuery,
        flashMessage: {
          type: "error",
          message: "Ein Fehler ist bei der Suche nach gebrauchten Produkten aufgetreten.",
        },
        csrfToken,
      }
    }
  }
}
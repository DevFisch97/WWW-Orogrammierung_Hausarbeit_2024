import { 
  getNewProductsDia, 
  getUsedProductsDia, 
  getAllNewProducts, 
  getAllUsedProducts, 
  getSingleProduct, 
  updateProduct, 
  deleteProduct,
  createProduct,
  createImage,
  searchProducts
} from "../model.js";
import { setFlashMessage } from "../controllers/flashmessages_controller.js";
import { join, dirname } from "https://deno.land/std/path/mod.ts";
import { connection } from "../services/db.js";

export class ProductController {
  constructor() {
  }

  async getHomePageData(user, flashMessage, csrfToken) {
    const newProducts = await getNewProductsDia();
    const usedProducts = await getUsedProductsDia();
    const diaShowProducts = await this.getDiaShowProducts();
    return { user, flashMessage, csrfToken, newProducts, usedProducts, diaShowProducts };
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
  console.log('ProductController: Received filter params:', filterParams);
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

  console.log('ProductController: Valid filter params:', validFilterParams);

  const products = await getAllNewProducts(validFilterParams);
  console.log('ProductController: Products returned:', products.length);
  
  return { 
    user, 
    products, 
    flashMessage, 
    csrfToken, 
    filterParams: validFilterParams
  };
}

async getUsedProductsData(user, flashMessage, csrfToken, filterParams = {}) {
  console.log('ProductController: Received filter params:', filterParams);
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

  console.log('ProductController: Valid filter params:', validFilterParams);

  const products = await getAllUsedProducts(validFilterParams);
  console.log('ProductController: Products returned:', products.length);
  
  return { 
    user, 
    products, 
    flashMessage, 
    csrfToken, 
    filterParams: validFilterParams
  };
}
  
  
  async getProductDetailsData(user, productId, quantity, addToCartSuccess, flashMessage, csrfToken) {
    try {
      const product = await getSingleProduct(productId);
      return { user, product, quantity: parseInt(quantity) || 1, addToCartSuccess, flashMessage, csrfToken };
    } catch (error) {
      console.error(`Error fetching product details: ${error.message}`);
      return { user, error: "Produkt nicht gefunden", flashMessage, csrfToken };
    }
  }

  async getProductEditData(user, productId, flashMessage, csrfToken) {
    if (!user || user.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }
    const editProduct = await getSingleProduct(productId);
    return { user, product: editProduct, flashMessage, csrfToken };
  }

  async handleProductUpdate(user, productId, formData) {
    if (!user || user.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }
    const updatedData = {
      name: formData.get('name'),
      preis: parseFloat(formData.get('preis')),
      beschreibung: formData.get('beschreibung'),
      show_dia: formData.get('show_dia') === 'on'
    };
    await updateProduct(productId, updatedData);
    const response = new Response("", {
      status: 302,
      headers: { "Location": `/product/${productId}` },
    });
    setFlashMessage(response, "Produkt erfolgreich aktualisiert.", "success");
    return response;
  }

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

  async handleCreateProduct(request, user) {
    if (!user || user.role !== 'admin') {
      return new Response("Unauthorized", { status: 401 });
    }
  
    let formData;
    try {
      if (request.parsedFormData) {
        formData = request.parsedFormData;
      } else {
        formData = await request.formData();
      }
      console.log("Form data received:", Object.fromEntries(formData));
    } catch (error) {
      console.error("Error reading form data:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/create-product" },
      });
      setFlashMessage(response, "Fehler beim Lesen der Formulardaten. Bitte versuchen Sie es erneut.", "error");
      return response;
    }
  
    return this.processProductCreation(formData, user);
  }
  

  async processProductCreation(formData, user) {
    const productData = {
      name: formData.get('productName'),
      beschreibung: formData.get('productDescription'),
      preis: parseFloat(formData.get('productPrice')),
      kategorie_id: parseInt(formData.get('productCategory')),
      show_dia: formData.get('diaShow') === 'on'
    };
  
    const productImage = formData.get('productImage');
  
    console.log("Product data:", productData);
    console.log("Product image:", productImage ? "Image file received" : "No image file");
  
    try {
      console.log("Creating new product...");
      const newProductId = await createProduct(productData);
      console.log("New product created with ID:", newProductId);
      
      if (newProductId && productImage && productImage.size > 0) {
        const fileName = `product_${newProductId}_${Date.now()}.jpg`;
        const projectRoot = Deno.cwd(); // Holt das aktuelle Arbeitsverzeichnis
        const imagePath = join(projectRoot, "assets", "Produktbilder", fileName);
        
        console.log("Saving image file...");
        await this.saveImageFile(productImage, imagePath);
        console.log("Image file saved successfully");
  
        console.log("Creating image record in database...");
        await createImage(newProductId, `/assets/Produktbilder/${fileName}`);
        console.log("Image record created successfully");
      }
  
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/new-products" },
      });
      setFlashMessage(response, "Produkt erfolgreich erstellt.", "success");
      return response;
    } catch (error) {
      console.error("Error creating product:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/create-product" },
      });
      setFlashMessage(response, `Fehler beim Erstellen des Produkts: ${error.message}`, "error");
      return response;
    }
  }
  
  async saveImageFile(file, path) {
    try {
      const contents = await file.arrayBuffer();
      const directory = dirname(path);
      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeFile(path, new Uint8Array(contents));
      console.log(`File saved successfully to ${path}`);
    } catch (error) {
      console.error(`Error saving file to ${path}:`, error);
      throw error;
    }
  }
  
  async getSearchResults(user, searchQuery, flashMessage, csrfToken) {
    console.log('ProductController: Received search query:', searchQuery);
    
    try {
      const products = await searchProducts(searchQuery);
      console.log('ProductController: Search results returned:', products.length);
      
      return { 
        user, 
        products, 
        searchQuery, 
        flashMessage, 
        csrfToken 
      };
    } catch (error) {
      console.error('Error in search:', error);
      return { 
        user, 
        products: [], 
        searchQuery, 
        flashMessage: { type: 'error', message: 'Ein Fehler ist bei der Suche aufgetreten.' }, 
        csrfToken 
      };
    }
  }
}


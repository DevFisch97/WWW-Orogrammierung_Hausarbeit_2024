import { 
  getNewProductsDia, 
  getUsedProductsDia, 
  getAllNewProducts, 
  getAllUsedProducts, 
  getSingleProduct, 
  updateProduct, 
  deleteProduct,
  createProduct,
  createImage
} from "../model.js";
import { setFlashMessage } from "../controllers/flashmessages_controller.js";

export class ProductController {
  constructor() {
  }

  async getHomePageData(user, flashMessage, csrfToken) {
    const newProducts = await getNewProductsDia();
    const usedProducts = await getUsedProductsDia();
    return { user, flashMessage, csrfToken, newProducts, usedProducts };
  }

  async getNewProductsData(user, page, flashMessage, csrfToken, filterParams) {
  console.log('ProductController: Received filter params:', filterParams);
  const validFilterParams = {};
  if (filterParams.category && filterParams.category !== '') {
    validFilterParams.category = filterParams.category;
  }
  if (filterParams.priceMin && !isNaN(parseFloat(filterParams.priceMin))) {
    validFilterParams.priceMin = parseFloat(filterParams.priceMin);
  }
  if (filterParams.priceMax && !isNaN(parseFloat(filterParams.priceMax))) {
    validFilterParams.priceMax = parseFloat(filterParams.priceMax);
  }

  console.log('ProductController: Valid filter params:', validFilterParams);

  const { products, total, totalPages } = await getAllNewProducts(page, 6, validFilterParams);
  console.log('ProductController: Products returned:', products.length);
  console.log('Total products:', total);
  console.log('Total pages:', totalPages);
  
  return { 
    user, 
    products, 
    currentPage: page, 
    totalPages, 
    flashMessage, 
    csrfToken, 
    filterParams: validFilterParams, 
    total,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages
  };
}

async getUsedProductsData(user, flashMessage, csrfToken, filterParams) {
  console.log('ProductController: Received filter params:', filterParams);
  const validFilterParams = {};
  if (filterParams.category && typeof filterParams.category !== 'string') {
    console.warn('Invalid category filter parameter. Ignoring.');
  } else {
    validFilterParams.category = filterParams.category;
  }
  if (filterParams.minPrice && typeof filterParams.minPrice !== 'number' || filterParams.minPrice < 0) {
    console.warn('Invalid minPrice filter parameter. Ignoring.');
  } else {
    validFilterParams.minPrice = filterParams.minPrice;
  }
  if (filterParams.maxPrice && typeof filterParams.maxPrice !== 'number' || filterParams.maxPrice < 0) {
    console.warn('Invalid maxPrice filter parameter. Ignoring.');
  } else {
    validFilterParams.maxPrice = filterParams.maxPrice;
  }

  console.log('ProductController: Valid filter params:', validFilterParams);

  const { products, total } = await this.getAllUsedProducts(validFilterParams);
    console.log('ProductController: Products returned:', products.length);
    console.log('Total products:', total);
  
  return { 
    user, 
    products, 
    flashMessage, 
    csrfToken, 
    filterParams: validFilterParams, 
    total
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
      formData = await request.formData();
    } catch (error) {
      console.error("Error reading form data:", error);
      const response = new Response("", {
        status: 302,
        headers: { "Location": "/create-product" },
      });
      setFlashMessage(response, "Fehler beim Lesen der Formulardaten. Bitte versuchen Sie es erneut.", "error");
      return response;
    }
  
    const productData = {
      name: formData.get('productName'),
      beschreibung: formData.get('productDescription'),
      preis: parseFloat(formData.get('productPrice')),
      kategorie_id: formData.get('productCategory'),
      show_dia: formData.get('diaShow') === 'on'
    };
  
    const productImage = formData.get('productImage');
  
    try {
      const newProductId = await createProduct(productData);
      
      if (productImage && productImage.size > 0) {
        const fileName = `product_${newProductId}_${Date.now()}.jpg`;
        const imagePath = `/assets/Produktbilder/${fileName}`;
        
        // Implement image saving logic here
        await this.saveImageFile(productImage, imagePath);
  
        await createImage(newProductId, imagePath);
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
      setFlashMessage(response, "Fehler beim Erstellen des Produkts. Bitte versuchen Sie es erneut.", "error");
      return response;
    }
  }
  
  async saveImageFile(file, path) {
    // Implement file saving logic here
    // This is a placeholder implementation
    console.log(`Saving file to ${path}`);
    // In a real implementation, you would write the file to the server's file system
    // For example:
    // const contents = await file.arrayBuffer();
    // await Deno.writeFile(path, new Uint8Array(contents));
  }
  
}
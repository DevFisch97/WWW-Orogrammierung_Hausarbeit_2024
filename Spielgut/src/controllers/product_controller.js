import { 
    getNewProductsDia, 
    getUsedProductsDia, 
    getAllNewProducts, 
    getAllUsedProducts, 
    getSingleProduct, 
    updateProduct, 
    deleteProduct 
  } from "../model.js";
  
  export class ProductController {
    constructor() {
    }
  
    async getHomePageData(user, flashMessage, csrfToken) {
      const newProducts = await getNewProductsDia();
      const usedProducts = await getUsedProductsDia();
      return { user, flashMessage, csrfToken, newProducts, usedProducts };
    }
  
    async getNewProductsData(user, page, flashMessage, csrfToken, filterParams) {
      // Entfernen Sie ungültige oder leere Filterparameter
      const validFilterParams = {};
      if (filterParams.priceMin && !isNaN(parseFloat(filterParams.priceMin))) {
        validFilterParams.priceMin = parseFloat(filterParams.priceMin);
      }
      if (filterParams.priceMax && !isNaN(parseFloat(filterParams.priceMax))) {
        validFilterParams.priceMax = parseFloat(filterParams.priceMax);
      }
    
      const { products: allNewProducts, totalPages } = await getAllNewProducts(page, 6, validFilterParams);
      return { user, products: allNewProducts, currentPage: page, totalPages, flashMessage, csrfToken, filterParams: validFilterParams };
    }
    
    async getUsedProductsData(user, page, flashMessage, csrfToken, filterParams) {
      // Entfernen Sie ungültige oder leere Filterparameter
      const validFilterParams = {};
      if (filterParams.priceMin && !isNaN(parseFloat(filterParams.priceMin))) {
        validFilterParams.priceMin = parseFloat(filterParams.priceMin);
      }
      if (filterParams.priceMax && !isNaN(parseFloat(filterParams.priceMax))) {
        validFilterParams.priceMax = parseFloat(filterParams.priceMax);
      }
    
      const { products: allUsedProducts, totalPages } = await getAllUsedProducts(page, 6, validFilterParams);
      return { user, products: allUsedProducts, currentPage: page, totalPages, flashMessage, csrfToken, filterParams: validFilterParams };
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
  }
  
  
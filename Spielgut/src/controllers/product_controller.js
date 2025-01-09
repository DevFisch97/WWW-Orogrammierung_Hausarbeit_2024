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
      // Kein render-Parameter mehr
    }
  
    async getHomePageData(user, flashMessage, csrfToken) {
      const newProducts = await getNewProductsDia();
      const usedProducts = await getUsedProductsDia();
      return { user, flashMessage, csrfToken, newProducts, usedProducts };
    }
  
    async getNewProductsData(user, page, flashMessage, csrfToken) {
      const { products: allNewProducts, totalPages } = await getAllNewProducts(page);
      return { user, products: allNewProducts, currentPage: page, totalPages, flashMessage, csrfToken };
    }
  
    async getUsedProductsData(user, page, flashMessage, csrfToken) {
      const { products: allUsedProducts, totalPages: usedTotalPages } = await getAllUsedProducts(page);
      return { user, products: allUsedProducts, currentPage: page, totalPages: usedTotalPages, flashMessage, csrfToken };
    }
  
    async getProductDetailsData(user, productId, quantity, addToCartSuccess, flashMessage, csrfToken) {
      const product = await getSingleProduct(productId);
      return { user, product, quantity: parseInt(quantity) || 1, addToCartSuccess, flashMessage, csrfToken };
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
  
  
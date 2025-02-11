import { addToCart, updateCartItem, removeFromCart, getCartItems, getCartTotal } from "../model.js";
import { getRequestBody } from "../services/requestBodyHelper.js";
import { createDebug } from "../services/debug.js";

const log = createDebug('spielgut:cart_controller');

export class CartController {
  constructor(render) {
    this.render = render;
  }

  async handleAddToCart(request, user) {
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
    }
    try {
      const formData = await getRequestBody(request);
      log("handleAddToCart formData:", formData);
      const productId = parseInt(formData.productId);
      const quantity = parseInt(formData.quantity);

      await addToCart(user.id, productId, quantity);
      return new Response("", {
        status: 302,
        headers: { "Location": `/product/${productId}?success=true&quantity=${quantity}` },
      });
    } catch (error) {
      log("Error adding to cart:", error);
      return new Response("", {
        status: 500,
        headers: { "Location": "/error" },
      });
    }
  }

  async handleUpdateCartItem(request, user) {
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
    }
    try {
      const formData = await getRequestBody(request);
      log("handleUpdateCartItem formData:", formData);
      const productId = parseInt(formData.productId);
      const action = formData.action;
      
      const cartItems = await getCartItems(user.id);
      const currentItem = cartItems.find(item => item.productId === productId);
      
      if (!currentItem) {
        return new Response("", {
          status: 302,
          headers: { "Location": "/shopping_cart" },
        });
      }

      let newQuantity = currentItem.quantity;
      if (action === "increase") {
        newQuantity += 1;
      } else if (action === "decrease") {
        newQuantity = Math.max(1, newQuantity - 1);
      }

      await updateCartItem(user.id, productId, newQuantity);
      return new Response("", {
        status: 302,
        headers: { "Location": "/shopping_cart" },
      });
    } catch (error) {
      log("Error updating cart item:", error);
      return new Response("", {
        status: 500,
        headers: { "Location": "/error" },
      });
    }
  }

  async handleRemoveFromCart(request, user) {
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
    }
    try {
      const formData = await getRequestBody(request);
      log("handleRemoveFromCart formData:", formData);
      const productId = parseInt(formData.productId);
      await removeFromCart(user.id, productId);
      return new Response("", {
        status: 302,
        headers: { "Location": "/shopping_cart" },
      });
    } catch (error) {
      log("Error removing from cart:", error);
      return new Response("", {
        status: 500,
        headers: { "Location": "/error" },
      });
    }
  }

  async renderShoppingCart(user, csrfToken) {
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
    }
    try {
      const cartItems = await getCartItems(user.id);
      const cartTotal = await getCartTotal(user.id);
      return { cartItems, cartTotal };
    } catch (error) {
      log("Error rendering shopping cart:", error);
      return { error: "Ein Fehler ist aufgetreten beim Laden des Warenkorbs." };
    }
  }
}


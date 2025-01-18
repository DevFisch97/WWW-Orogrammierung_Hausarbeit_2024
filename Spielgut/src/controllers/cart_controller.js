import { addToCart, updateCartItem, removeFromCart, getCartItems, getCartTotal } from "../model.js";


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
    const formData = request.parsedFormData;
    const productId = parseInt(formData.get("productId"));
    const quantity = parseInt(formData.get("quantity"));

    await addToCart(user.id, productId, quantity);
    return new Response("", {
      status: 302,
      headers: { "Location": `/product/${productId}?success=true&quantity=${quantity}` },
    });
  }

  async handleUpdateCartItem(request, user) {
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
    }
    const formData = request.parsedFormData;
    const productId = parseInt(formData.get("productId"));
    const action = formData.get("action");
    
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
  }

  async handleRemoveFromCart(request, user) {
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
    }
    const formData = request.parsedFormData;
    const productId = parseInt(formData.get("productId"));
    await removeFromCart(user.id, productId);
    return new Response("", {
      status: 302,
      headers: { "Location": "/shopping_cart" },
    });
  }

  async renderShoppingCart(user, csrfToken) {
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { "Location": "/login" },
      });
    }
    const cartItems = await getCartItems(user.id);
    const cartTotal = await getCartTotal(user.id);
    return { cartItems, cartTotal };
  }
}


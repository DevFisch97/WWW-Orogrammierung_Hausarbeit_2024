import { addToCart, updateCartItem, removeFromCart, getCartItems, getCartTotal, getSingleProduct } from "../model.js";

export class Cart_Controller {
  constructor(render) {
    this.render = render;
  }

  async handleAddToCart(request, user) {
    if (!user) {
      return this.redirect("/login");
    }
    const formData = await request.formData();
    const productId = parseInt(formData.get("productId"));
    const quantity = parseInt(formData.get("quantity"));

    await addToCart(user.id, productId, quantity);
    return this.redirect(`/product/${productId}?success=true&quantity=${quantity}`);
  }

  async handleUpdateCartItem(request, user) {
    if (!user) {
      return this.redirect("/login");
    }
    const formData = await request.formData();
    const productId = parseInt(formData.get("productId"));
    const action = formData.get("action");
    
    const cartItems = await getCartItems(user.id);
    const currentItem = cartItems.find(item => item.productId === productId);
    
    if (!currentItem) {
      return this.redirect("/shopping_cart");
    }

    let newQuantity = currentItem.quantity;
    if (action === "increase") {
      newQuantity += 1;
    } else if (action === "decrease") {
      newQuantity = Math.max(1, newQuantity - 1);
    }

    await updateCartItem(user.id, productId, newQuantity);
    return this.redirect("/shopping_cart");
  }

  async handleRemoveFromCart(request, user) {
    if (!user) {
      return this.redirect("/login");
    }
    const formData = await request.formData();
    const productId = parseInt(formData.get("productId"));
    await removeFromCart(user.id, productId);
    return this.redirect("/shopping_cart");
  }

  async renderShoppingCart(user, csrfToken) {
    if (!user) {
      return this.redirect("/login");
    }
    const cartItems = await getCartItems(user.id);
    const cartTotal = await getCartTotal(user.id);
    const content = await this.render("shoppingcart.html", { user, cartItems, cartTotal, csrfToken });
    return new Response(content, {
      headers: { "content-type": "text/html" },
    });
  }

  redirect(location) {
    return new Response("", {
      status: 302,
      headers: { "Location": location },
    });
  }

  async renderProductDetails(user, productId, quantity, addToCartSuccess, csrfToken) {
    const product = await getSingleProduct(productId);
    const content = await this.render("product_details.html", { 
      user, 
      product, 
      quantity: parseInt(quantity) || 1,
      addToCartSuccess,
      csrfToken
    });
    return new Response(content, {
      headers: { "content-type": "text/html" },
    });
  }
}


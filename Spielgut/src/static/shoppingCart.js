class ShoppingCart {
    constructor() {
      this.quantityForms = document.querySelectorAll('.quantity-form');
      this.removeForms = document.querySelectorAll('.remove-form');
      this.init();
    }
  
    init() {
      this.quantityForms.forEach(form => {
        const decreaseBtn = form.querySelector('.decrease-quantity');
        const increaseBtn = form.querySelector('.increase-quantity');
        const quantityInput = form.querySelector('.quantity-input');
  
        decreaseBtn.addEventListener('click', (e) => this.updateQuantity(e, form, -1));
        increaseBtn.addEventListener('click', (e) => this.updateQuantity(e, form, 1));
        quantityInput.addEventListener('change', (e) => this.updateQuantity(e, form, 0));
        form.addEventListener('submit', (e) => e.preventDefault());
      });
  
      this.removeForms.forEach(form => {
        form.addEventListener('submit', (e) => this.handleRemove(e));
      });
    }
  
    updateQuantity(e, form, change) {
      e.preventDefault();
      const quantityInput = form.querySelector('.quantity-input');
      let newQuantity = parseInt(quantityInput.value) + change;
      if (newQuantity < 1) newQuantity = 1;
      quantityInput.value = newQuantity;
      this.sendUpdateRequest(form);
    }
  
    sendUpdateRequest(form) {
      const formData = new FormData(form);
      fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.updateCartUI(data);
        } else {
          alert('Fehler beim Aktualisieren des Warenkorbs');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Fehler beim Aktualisieren des Warenkorbs');
      });
    }
  
    handleRemove(e) {
      e.preventDefault();
      if (confirm('Sind Sie sicher, dass Sie diesen Artikel aus dem Warenkorb entfernen möchten?')) {
        fetch(e.target.action, {
          method: 'POST',
          body: new FormData(e.target),
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            this.removeCartItem(data.productId);
          } else {
            alert('Fehler beim Entfernen des Artikels aus dem Warenkorb');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Fehler beim Entfernen des Artikels aus dem Warenkorb');
        });
      }
    }
  
    updateCartUI(data) {
      const cartItem = document.querySelector(`.cart-item[data-product-id="${data.productId}"]`);
      if (cartItem) {
        const quantityInput = cartItem.querySelector('.quantity-input');
        const itemTotal = cartItem.querySelector('.item-total');
        quantityInput.value = data.quantity;
        itemTotal.textContent = `${data.itemTotal.toFixed(2)}€`;
      }
      const cartTotal = document.querySelector('.cart-total');
      if (cartTotal) {
        cartTotal.textContent = `Gesamtsumme: ${data.cartTotal.toFixed(2)}€`;
      }
    }
  
    removeCartItem(productId) {
      const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
      if (cartItem) {
        cartItem.remove();
      }
      const cartTotal = document.querySelector('.cart-total');
      if (cartTotal) {
        const total = parseFloat(cartTotal.textContent.split(':')[1].trim().replace('€', ''));
        const itemTotal = parseFloat(cartItem.querySelector('.item-total').textContent.replace('€', ''));
        cartTotal.textContent = `Gesamtsumme: ${(total - itemTotal).toFixed(2)}€`;
      }
    }
  }
  
  
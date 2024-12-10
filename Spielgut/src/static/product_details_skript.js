document.addEventListener('DOMContentLoaded', function() {
    const decreaseBtn = document.getElementById('decrease');
    const increaseBtn = document.getElementById('increase');
    const quantityInput = document.getElementById('quantity');
    const addToCartBtn = document.getElementById('addToCart');
  
    decreaseBtn.addEventListener('click', function() {
      let currentValue = parseInt(quantityInput.value);
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
      }
    });
  
    increaseBtn.addEventListener('click', function() {
      let currentValue = parseInt(quantityInput.value);
      quantityInput.value = currentValue + 1;
    });
  
    addToCartBtn.addEventListener('click', function() {
      const quantity = parseInt(quantityInput.value);
      // Here you can add the logic to add the product to the cart
      console.log(`Adding ${quantity} item(s) to cart`);
    });
  });
  
  
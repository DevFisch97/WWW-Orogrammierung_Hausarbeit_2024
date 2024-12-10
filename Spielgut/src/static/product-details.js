document.addEventListener('DOMContentLoaded', function() {
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decrease');
    const increaseBtn = document.getElementById('increase');
  
    decreaseBtn.addEventListener('click', () => {
      if (quantityInput.value > 1) {
        quantityInput.value = parseInt(quantityInput.value) - 1;
      }
    });
  
    increaseBtn.addEventListener('click', () => {
      quantityInput.value = parseInt(quantityInput.value) + 1;
    });
  });

  document.addEventListener('DOMContentLoaded', function() {
    const quantityForms = document.querySelectorAll('.quantity-form');
    const removeForms = document.querySelectorAll('.remove-form');

    quantityForms.forEach(form => {
        const decreaseBtn = form.querySelector('.decrease-quantity');
        const increaseBtn = form.querySelector('.increase-quantity');
        const quantityInput = form.querySelector('.quantity-input');

        decreaseBtn.addEventListener('click', () => {
            if (quantityInput.value > 1) {
                quantityInput.value = parseInt(quantityInput.value) - 1;
                form.submit();
            }
        });

        increaseBtn.addEventListener('click', () => {
            quantityInput.value = parseInt(quantityInput.value) + 1;
            form.submit();
        });
    });

    removeForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!confirm('Sind Sie sicher, dass Sie diesen Artikel aus dem Warenkorb entfernen möchten?')) {
                e.preventDefault();
            }
        });
    });
});
  
  
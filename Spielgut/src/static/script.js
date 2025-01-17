document.addEventListener('DOMContentLoaded', () => {
  const slideshows = document.querySelectorAll('.product-slideshow');
  
  slideshows.forEach(slideshow => {
      const container = slideshow.querySelector('.product-container');
      const products = container.querySelectorAll('.product-card');
      let currentIndex = 0;

      function showProducts() {
          for (let i = 0; i < products.length; i++) {
              if (i >= currentIndex && i < currentIndex + 3) {
                  products[i].style.display = 'block';
              } else {
                  products[i].style.display = 'none';
              }
          }
      }

      function nextSlide() {
          currentIndex += 3;
          if (currentIndex >= products.length) {
              currentIndex = 0;
          }
          showProducts();
      }

      function prevSlide() {
          currentIndex -= 3;
          if (currentIndex < 0) {
              currentIndex = Math.max(0, products.length - 3);
          }
          showProducts();
      }

      showProducts();
      const interval = setInterval(nextSlide, 5000); // Change slides every 5 seconds

      // Add event listeners for manual navigation
      const prevButton = slideshow.parentElement.querySelector('.prev-button');
      const nextButton = slideshow.parentElement.querySelector('.next-button');

      prevButton.addEventListener('click', () => {
          clearInterval(interval);
          prevSlide();
      });

      nextButton.addEventListener('click', () => {
          clearInterval(interval);
          nextSlide();
      });
  });
});


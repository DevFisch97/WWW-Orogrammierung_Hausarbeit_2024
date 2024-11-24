document.addEventListener('DOMContentLoaded', function() {
    // Funktion zur Erstellung einer Slideshow
    function createSlideshow(containerSelector, prevButtonSelector, nextButtonSelector) {
        let currentSlide = 0;
        const slideInterval = 5000; // 5 Sekunden
        const productContainer = document.querySelector(containerSelector);
        const productCards = productContainer.querySelectorAll('.product-card');
        const prevButton = document.querySelector(prevButtonSelector);
        const nextButton = document.querySelector(nextButtonSelector);
        
        const totalSlides = productCards.length;
        
        function moveToSlide(slideIndex) {
            currentSlide = (slideIndex + totalSlides) % totalSlides;
            updateSlideshowLayout();
        }

        function moveNext() {
            moveToSlide(currentSlide + 1);
        }

        function movePrev() {
            moveToSlide(currentSlide - 1);
        }

        nextButton.addEventListener('click', moveNext);
        prevButton.addEventListener('click', movePrev);
        
        function updateSlideshowLayout() {
            const viewportWidth = window.innerWidth;
            let visibleSlides;
            if (viewportWidth <= 768) {
                visibleSlides = 1;
            } else if (viewportWidth <= 1024) {
                visibleSlides = 2;
            } else {
                visibleSlides = 3;
            }

            productContainer.style.transform = `translateX(-${(currentSlide % visibleSlides) * (100 / visibleSlides)}%)`;

            productCards.forEach((card, index) => {
                card.style.order = (index - currentSlide + totalSlides) % totalSlides;
            });
        }
        
        updateSlideshowLayout();
        window.addEventListener('resize', updateSlideshowLayout);

        function autoAdvance() {
            moveNext();
        }

        let slideshow = setInterval(autoAdvance, slideInterval);

        function resetSlideshow() {
            clearInterval(slideshow);
            slideshow = setInterval(autoAdvance, slideInterval);
        }

        nextButton.addEventListener('click', resetSlideshow);
        prevButton.addEventListener('click', resetSlideshow);
    }

    // Erstelle Slideshows für neue und gebrauchte Produkte
    createSlideshow('.products:nth-child(1) .product-container', 
                    '.products:nth-child(1) #prevButton', 
                    '.products:nth-child(1) #nextButton');
    
    createSlideshow('.products:nth-child(2) .product-container', 
                    '.products:nth-child(2) #prevButton', 
                    '.products:nth-child(2) #nextButton');
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (data.password !== data['password-repeat']) {
      alert('Passwörter stimmen nicht überein');
      return;
    }
  
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        alert('Registrierung erfolgreich');
        window.location.href = '/login';
      } else {
        alert(result.error || 'Registrierung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Bei der Registrierung ist ein Fehler aufgetreten');
    }
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
  
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        alert('Anmeldung erfolgreich');
        window.location.href = '/';
      } else {
        alert(result.error || 'Anmeldung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Bei der Anmeldung ist ein Fehler aufgetreten');
    }
  });
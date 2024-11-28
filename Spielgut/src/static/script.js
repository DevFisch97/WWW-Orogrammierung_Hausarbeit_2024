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

  
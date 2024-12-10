document.addEventListener('DOMContentLoaded', function() {
    // Existing slideshow functionality
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

    // Create slideshows for new and used products
    createSlideshow('.products:nth-child(1) .product-container', 
                    '.products:nth-child(1) #prevButton', 
                    '.products:nth-child(1) #nextButton');
    
    createSlideshow('.products:nth-child(2) .product-container', 
                    '.products:nth-child(2) #prevButton', 
                    '.products:nth-child(2) #nextButton');

    // New filter functionality
    const filterButton = document.getElementById('filterButton');
    const filterPanel = document.getElementById('filterPanel');
    const applyFiltersButton = document.getElementById('applyFilters');
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');

    filterButton.addEventListener('click', function() {
        filterPanel.classList.toggle('active');
    });

    applyFiltersButton.addEventListener('click', function() {
        // Here you would typically handle the filter application logic
        console.log('Filters applied');
        filterPanel.classList.remove('active');
    });

    priceRange.addEventListener('input', function() {
        priceValue.textContent = this.value + '€';
    });

    // Close the filter panel when clicking outside of it
    document.addEventListener('click', function(event) {
        if (!filterPanel.contains(event.target) && event.target !== filterButton) {
            filterPanel.classList.remove('active');
        }
    });
});


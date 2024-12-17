document.addEventListener('DOMContentLoaded', function() {
    // Existing slideshow functionality
    function createSlideshow(containerSelector) {
        let currentSlide = 0;
        const slideInterval = 5000; // 5 Sekunden
        const productContainer = containerSelector.querySelector('.product-container');
        const productCards = productContainer.querySelectorAll('.product-card');
        const prevButton = containerSelector.querySelector('.prev-button');
        const nextButton = containerSelector.querySelector('.next-button');
        
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
    const newProductsSection = document.querySelector('.new-products');
    const usedProductsSection = document.querySelector('.used-products');
    
    if (newProductsSection) {
        createSlideshow(newProductsSection);
    }
    
    if (usedProductsSection) {
        createSlideshow(usedProductsSection);
    }

    // New filter functionality
    const filterButton = document.getElementById('filterButton');
    const filterPanel = document.getElementById('filterPanel');
    const applyFiltersButton = document.getElementById('applyFilters');
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');

    if (filterButton && filterPanel) {
        filterButton.addEventListener('click', function() {
            filterPanel.classList.toggle('active');
        });
    }

    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', function() {
            // Here you would typically handle the filter application logic
            console.log('Filters applied');
            filterPanel.classList.remove('active');
        });
    }

    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = this.value + '€';
        });
    }

    // Close the filter panel when clicking outside of it
    document.addEventListener('click', function(event) {
        if (filterPanel && !filterPanel.contains(event.target) && event.target !== filterButton) {
            filterPanel.classList.remove('active');
        }
    });
});


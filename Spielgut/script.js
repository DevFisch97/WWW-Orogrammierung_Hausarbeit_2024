document.addEventListener('DOMContentLoaded', function() {
    let currentSlide = 0;
    const slideInterval = 5000; // 5 Sekunden
    const productContainer = document.querySelector('.product-container');
    const productCards = document.querySelectorAll('.product-card');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    
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
    
    // Funktion zum Aktualisieren der Slideshow basierend auf der Bildschirmgröße
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

        // Neuanordnung der Produkte für nahtlosen Übergang
        productCards.forEach((card, index) => {
            card.style.order = (index - currentSlide + totalSlides) % totalSlides;
        });
    }
    
    // Initial aufrufen und bei Größenänderung des Fensters
    updateSlideshowLayout();
    window.addEventListener('resize', updateSlideshowLayout);

    function autoAdvance() {
        moveNext();
    }

    let slideshow = setInterval(autoAdvance, slideInterval);

    // Stoppe die automatische Diashow, wenn der Benutzer manuell navigiert
    function resetSlideshow() {
        clearInterval(slideshow);
        slideshow = setInterval(autoAdvance, slideInterval);
    }

    nextButton.addEventListener('click', resetSlideshow);
    prevButton.addEventListener('click', resetSlideshow);
    updateSlideshowLayout();
});
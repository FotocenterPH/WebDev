// ============== LANGUAGE SYSTEM ==============
// Get currentLanguage from languages.js (loaded first)
if (typeof window.currentLanguage === 'undefined') {
    window.currentLanguage = {
        code: 'us',
        name: 'English (US)',
        flag: '🇺🇸',
        currency: 'USD',
        symbol: '$',
        rate: 1,
        translations: {}
    };
}

let currentLanguage = window.currentLanguage;

// Initialize language dropdown
function initLanguageDropdown() {
    const languageBtn = document.getElementById('languageBtn');
    const languageMenu = document.getElementById('languageMenu');
    const languageDropdown = document.getElementById('languageDropdown');

    if (!languageBtn || !languageMenu) return;

    if (typeof languages === 'undefined') {
        console.error('languages not defined! Make sure languages.js loads first.');
        return;
    }

    languageMenu.innerHTML = '';
    languages.forEach(lang => {
        const item = document.createElement('div');
        item.className = `language-item ${lang.code === currentLanguage.code ? 'active' : ''}`;
        item.setAttribute('data-language', lang.code);
        const fc = lang.flagCode || lang.code;
        const cn = lang.countryName || lang.name;
        item.innerHTML = `
            <img class="flag-img" src="https://flagcdn.com/24x18/${fc}.png" alt="${cn}">
            <span class="language-name">${cn}</span>
            <span class="currency-code">${lang.currency}</span>
            <span class="currency-symbol">${lang.symbol}</span>
        `;
        item.addEventListener('click', () => selectLanguage(lang));
        languageMenu.appendChild(item);
    });

    languageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        languageDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!languageDropdown.contains(e.target)) {
            languageDropdown.classList.remove('open');
        }
    });

    updateLanguageButton();
}

function selectLanguage(lang) {
    currentLanguage = lang;
    window.currentLanguage = lang;

    document.querySelectorAll('.language-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-language') === lang.code) {
            item.classList.add('active');
        }
    });

    updateLanguageButton();
    updateAllText();
    updateAllPrices();

    // Re-render dynamic content to apply translations and new currency formats
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        const pageId = activePage.id;
        console.log(`Language changed. Re-rendering active page: ${pageId}`);
        switch (pageId) {
            case 'home':
                if (typeof displayHomeProducts === 'function') displayHomeProducts();
                break;
            case 'shop':
                if (typeof renderShopProducts === 'function') renderShopProducts();
                break;
            case 'product-page':
                const openEditorBtn = document.getElementById('openEditorBtn');
                if (openEditorBtn && typeof loadProductDetails === 'function') {
                    const productType = openEditorBtn.getAttribute('data-product');
                    if (productType) loadProductDetails(productType);
                }
                break;
            case 'cart-page':
                if (typeof renderCartPage === 'function') renderCartPage();
                break;
            case 'photos':
                 if (typeof calculatePrice === 'function') calculatePrice();
                 if (typeof updatePrintOptions === 'function') updatePrintOptions(window.currentProduct);
                 break;
            case 'calendars':
                if (document.getElementById('calendarsProductsView').style.display === 'block') {
                    if (typeof displayCalendarProducts === 'function') displayCalendarProducts();
                } else {
                    if (typeof updateCalendarPrice === 'function') updateCalendarPrice();
                }
                break;
            case 'cards':
                 if (document.getElementById('cardsProductsView').style.display === 'block') {
                    if (typeof displayCardsProducts === 'function') displayCardsProducts();
                }
                break;
        }
    }

    // Also update slideshow if it's visible
    if (window.slideshow) {
        window.slideshow.renderSlides();
        updateAllPrices(); // re-run after render
    }

    localStorage.setItem('preferredLanguage', lang.code);
}

function updateLanguageButton() {
    const btn = document.getElementById('languageBtn');
    if (!btn) return;

    const fc = currentLanguage.flagCode || currentLanguage.code;
    const cn = currentLanguage.countryName || currentLanguage.name;
    btn.innerHTML = `
        <img class="flag-img" src="https://flagcdn.com/24x18/${fc}.png" alt="${cn}">
        <span class="language-name">${cn}</span>
        <span class="currency-code">${currentLanguage.currency}</span>
        <span class="dropdown-arrow">▼</span>
    `;
}

function updateAllText() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (currentLanguage?.translations?.[key]) {
            element.textContent = currentLanguage.translations[key];
        }
    });
}

function formatPrice(usdPrice) {
    if (typeof usdPrice !== 'number' || isNaN(usdPrice)) {
        // console.error('Invalid price provided to formatPrice:', usdPrice);
        return ''; // Return empty string or a default value for invalid input
    }
    const convertedPrice = usdPrice * currentLanguage.rate;

    switch (currentLanguage.currency) {
        case 'USD':
            return `$${convertedPrice.toFixed(2)}`;
        case 'GBP':
            return `£${convertedPrice.toFixed(2)}`;
        case 'EUR':
            return `€${convertedPrice.toFixed(2)}`;
        case 'SEK':
        case 'NOK':
        case 'DKK':
            return `${convertedPrice.toFixed(2)} kr`;
        default:
            return `${currentLanguage.symbol}${convertedPrice.toFixed(2)}`;
    }
}

function updateAllPrices() {
    document.querySelectorAll('[data-usd]').forEach(element => {
        const usdPrice = parseFloat(element.getAttribute('data-usd'));
        if (!isNaN(usdPrice)) {
            if (element.classList.contains('slide-price')) {
                element.textContent = `For only ${formatPrice(usdPrice)} !!!`;
            } else {
                element.textContent = formatPrice(usdPrice);
            }
        }
    });
}

// ============== PRINT OPTIONS CONFIGURATION ==============
const printOptionsConfig = {
    photocards: [
        { value: "4x6", label: "4x6", priceUSD: 0.45 },
        { value: "5x7", label: "5x7", priceUSD: 0.63 },
        { value: "8x10", label: "8x10", priceUSD: 0.90 }
    ],
    calendar: [
        { value: "8x10", label: "8x10", priceUSD: 1.08 },
        { value: "12x12", label: "12x12", priceUSD: 1.53 },
        { value: "8.5x11", label: "8.5x11", priceUSD: 1.26 },
        { value: "11x17", label: "11x17", priceUSD: 1.80 }
    ],
    photobook: [
        { value: "8x8", label: "8x8", priceUSD: 2.16 },
        { value: "11x8.5", label: "11x8.5", priceUSD: 2.70 }
    ],
    canvas: [
        { value: "8x10", label: "8x10", priceUSD: 3.60 },
        { value: "16x20", label: "16x20", priceUSD: 6.30 }
    ],
    mousepads: [
        { value: "7x9", label: "7x9", priceUSD: 0.81 },
        { value: "9x11", label: "9x11", priceUSD: 1.08 }
    ],
    doublecards: [
        { value: "5x7", label: "5x7", priceUSD: 1.26 },
        { value: "8x10", label: "8x10", priceUSD: 1.71 }
    ]
};
window.printOptionsConfig = printOptionsConfig;

// ============== PRODUCT DATABASE ==============
const productDatabase = {
    photocards: {
        name: 'Photo Cards',
        basePriceUSD: 0.47,
        mainImage: 'https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
        thumbnails: [
            'https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
            'https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&flip=1',
            'https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&rotate=90'
        ],
        sizes: printOptionsConfig.photocards,
        paperTypes: [
            { name: 'Standard', priceUSD: 0 },
            { name: 'Glossy', priceUSD: 0.18 },
            { name: 'Matte', priceUSD: 0.27 },
            { name: 'Premium', priceUSD: 0.45 }
        ],
        description: 'Create personalized greeting cards for any occasion. Perfect for birthdays, holidays, or just to say thank you. Choose from various sizes and paper types to match your style.',
        icon: '🖼️',
        productType: 'photocards'
    },
    calendar: {
        name: 'Calendar',
        basePriceUSD: 1.08,
        mainImage: 'https://images.pexels.com/photos/4692171/pexels-photo-4692171.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
        thumbnails: [
            'https://images.pexels.com/photos/4692171/pexels-photo-4692171.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
            'https://images.pexels.com/photos/4692171/pexels-photo-4692171.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&flip=1',
            'https://images.pexels.com/photos/4692171/pexels-photo-4692171.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&rotate=90'
        ],
        sizes: printOptionsConfig.calendar,
        paperTypes: [
            { name: 'Standard', priceUSD: 0 },
            { name: 'Glossy', priceUSD: 0.18 },
            { name: 'Matte', priceUSD: 0.27 },
            { name: 'Premium', priceUSD: 0.45 }
        ],
        description: 'Create personalized calendars with your favorite photos. Perfect for gifts or home decoration. Choose from desk, wall, or mini calendars to match your style.',
        icon: '📅',
        productType: 'calendar'
    },
    photobook: {
        name: 'Photo Book',
        basePriceUSD: 2.16,
        mainImage: 'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
        thumbnails: [
            'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
            'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&flip=1',
            'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&rotate=90'
        ],
        sizes: printOptionsConfig.photobook,
        paperTypes: [
            { name: 'Standard', priceUSD: 0 },
            { name: 'Glossy', priceUSD: 0.18 },
            { name: 'Matte', priceUSD: 0.27 },
            { name: 'Premium', priceUSD: 0.45 }
        ],
        description: 'Premium hardcover photo books to collect your memories. Perfect for weddings, vacations, or family albums. Choose from various sizes and binding options.',
        icon: '📘',
        productType: 'photobook'
    },
    canvas: {
        name: 'Canvas',
        basePriceUSD: 3.60,
        mainImage: 'https://images.pexels.com/photos/1572386/pexels-photo-1572386.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
        thumbnails: [
            'https://images.pexels.com/photos/1572386/pexels-photo-1572386.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
            'https://images.pexels.com/photos/1572386/pexels-photo-1572386.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&flip=1',
            'https://images.pexels.com/photos/1572386/pexels-photo-1572386.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&rotate=90'
        ],
        sizes: printOptionsConfig.canvas,
        paperTypes: [
            { name: 'Standard', priceUSD: 0 },
            { name: 'Glossy', priceUSD: 0.18 },
            { name: 'Matte', priceUSD: 0.27 },
            { name: 'Premium', priceUSD: 0.45 }
        ],
        description: 'Your favorite photo mounted on high-quality canvas. Gallery-wrapped and ready to hang. Perfect for home decor or special gifts.',
        icon: '🖼️',
        productType: 'canvas'
    },
    mousepads: {
        name: 'Mouse Pads',
        basePriceUSD: 0.81,
        mainImage: 'https://images.unsplash.com/photo-1625723044792-44de16ccb5e9?w=800&h=600&fit=crop',
        thumbnails: [
            'https://images.unsplash.com/photo-1625723044792-44de16ccb5e9?w=200&h=200&fit=crop',
            'https://images.unsplash.com/photo-1625723044792-44de16ccb5e9?w=200&h=200&fit=crop&flip=1',
            'https://images.unsplash.com/photo-1625723044792-44de16ccb5e9?w=200&h=200&fit=crop&rotate=90'
        ],
        sizes: printOptionsConfig.mousepads,
        paperTypes: [
            { name: 'Standard', priceUSD: 0 },
            { name: 'Glossy', priceUSD: 0.18 },
            { name: 'Matte', priceUSD: 0.27 },
            { name: 'Premium', priceUSD: 0.45 }
        ],
        description: 'Custom photo mouse pads for your desk. Perfect for office or home use. Non-slip rubber base and smooth surface for optimal mouse control.',
        icon: '🖱️',
        productType: 'mousepads'
    },
    doublecards: {
        name: 'Double Cards',
        basePriceUSD: 1.26,
        mainImage: 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
        thumbnails: [
            'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
            'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&flip=1',
            'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop&rotate=90'
        ],
        sizes: printOptionsConfig.doublecards,
        paperTypes: [
            { name: 'Standard', priceUSD: 0 },
            { name: 'Glossy', priceUSD: 0.18 },
            { name: 'Matte', priceUSD: 0.27 },
            { name: 'Premium', priceUSD: 0.45 }
        ],
        description: 'Elegant folded greeting cards for all special occasions. Perfect for invitations, thank you notes, or holiday greetings. Comes with matching envelopes.',
        icon: '🃏',
        productType: 'doublecards'
    }
};

// ============== LOAD PRODUCT DETAILS ==============
function loadProductDetails(productType) {
    const product = productDatabase[productType];
    if (!product) return;

    document.getElementById('productMainImage').src = product.mainImage;

    const nameElement = document.getElementById('productName');
    nameElement.textContent = product.name;
    nameElement.setAttribute('data-i18n', `product_${productType}_name`);

    const priceElement = document.getElementById('productPrice');
    const productUsdPrice = product.basePriceUSD.toFixed(2);
    priceElement.setAttribute('data-usd', productUsdPrice);
    priceElement.textContent = formatPrice(product.basePriceUSD);

    document.getElementById('productDescription').textContent = product.description;
    document.getElementById('productIcon').textContent = product.icon;

    const descriptionElement = document.getElementById('productDescription');
    const descriptionKey = `product_${productType}_desc`;
    descriptionElement.setAttribute('data-i18n', descriptionKey);
    descriptionElement.textContent = currentLanguage.translations[descriptionKey] || product.description;

    const thumbnailsContainer = document.getElementById('productThumbnails');
    thumbnailsContainer.innerHTML = '';
    product.thumbnails.forEach((thumb, index) => {
        const thumbDiv = document.createElement('div');
        thumbDiv.className = `thumbnail-item ${index === 0 ? 'active' : ''}`;
        thumbDiv.innerHTML = `<img src="${thumb}" alt="Variation ${index + 1}">`;
        thumbDiv.addEventListener('click', function () {
            document.getElementById('productMainImage').src = thumb;
            document.querySelectorAll('.thumbnail-item').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
        });
        thumbnailsContainer.appendChild(thumbDiv);
    });

    const sizesContainer = document.getElementById('productSizes');
    sizesContainer.innerHTML = '';
    product.sizes.forEach(size => {
        const usdPrice = size.priceUSD.toFixed(2);
        const sizeDiv = document.createElement('div');
        sizeDiv.className = 'size-item';
        sizeDiv.innerHTML = `<span data-i18n="size_${size.value}">${size.label}</span> <span data-usd="${usdPrice}">${formatPrice(size.priceUSD)}</span>`;
        sizesContainer.appendChild(sizeDiv);
    });

    const paperContainer = document.getElementById('productPaperTypes');
    paperContainer.innerHTML = '';
    product.paperTypes.forEach(paper => {
        const paperDiv = document.createElement('div');
        paperDiv.className = 'paper-item';
        const usdPrice = paper.priceUSD.toFixed(2);
        paperDiv.innerHTML = `<span>${paper.name}</span> <span data-usd="${usdPrice}">+${formatPrice(paper.priceUSD)}</span>`;
        paperContainer.appendChild(paperDiv);
    });

    document.getElementById('openEditorBtn').setAttribute('data-product', product.productType);

    updateAllText();
    updateAllPrices();
}

// ============== SLIDESHOW CLASS ==============
class Slideshow {
    constructor() {
        this.track = document.getElementById('slidesTrack');
        this.dotsContainer = document.getElementById('slideshowDots');
        this.prevBtn = document.getElementById('slideshowPrev');
        this.nextBtn = document.getElementById('slideshowNext');
        this.pauseBtn = document.getElementById('slideshowPause');

        this.currentIndex = 0;
        this.totalSlides = 0;
        this.isPaused = false;
        this.interval = null;
        this.autoPlayDelay = 5000;

        this.products = [
            { name: 'Photo Cards', nameKey: 'slide_photo_cards', priceUSD: 0.45, image: 'https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&fit=crop', desc: 'Create personalized greeting cards', descKey: 'slide_photo_cards_desc' },
            { name: 'Calendar', nameKey: 'slide_calendar', priceUSD: 1.08, image: 'https://images.pexels.com/photos/4692171/pexels-photo-4692171.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&fit=crop', desc: 'Make your own custom calendar', descKey: 'slide_calendar_desc' },
            { name: 'Photo Book', nameKey: 'slide_photo_book', priceUSD: 2.16, image: 'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&fit=crop', desc: 'Premium hardcover photo books', descKey: 'slide_photo_book_desc' },
            { name: 'Canvas', nameKey: 'slide_canvas', priceUSD: 3.60, image: 'https://images.pexels.com/photos/1572386/pexels-photo-1572386.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&fit=crop', desc: 'Your favorite photo on canvas', descKey: 'slide_canvas_desc' },
            { name: 'Mouse Pads', nameKey: 'slide_mouse_pads', priceUSD: 0.81, image: 'https://images.unsplash.com/photo-1625723044792-44de16ccb5e9?w=1260&h=750&fit=crop', desc: 'Custom photo mouse pads', descKey: 'slide_mouse_pads_desc' },
            { name: 'Double Cards', nameKey: 'slide_double_cards', priceUSD: 1.26, image: 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&fit=crop', desc: 'Elegant folded greeting cards', descKey: 'slide_double_cards_desc' }
        ];
        this.init();
    }

    init() {
        if (!this.track) {
            console.error('Slideshow track not found');
            return;
        }

        this.totalSlides = this.products.length;
        this.renderSlides();
        this.createDots();
        this.setupEventListeners();
        this.startAutoPlay();
        this.updateSlidePosition(0);
    }

    renderSlides() {
        this.track.innerHTML = '';
        this.track.style.width = `${this.totalSlides * 100}%`;

        this.products.forEach(product => {
            const slide = document.createElement('div');
            slide.className = 'slide-card';
            slide.style.width = `${100 / this.totalSlides}%`;
            slide.innerHTML = `
                <div class="slide-image">
                    <img src="${product.image}" 
                         alt="${product.name}" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/1200x800?text=${product.name}'">
                </div>
                <div class="slide-info">
                    <h3 data-i18n="${product.nameKey}">${product.name}</h3>
                    <p data-i18n="${product.descKey}">${product.desc}</p>
                    <div class="slide-price" data-usd="${product.priceUSD}"><span data-i18n="slide_for_only">For only</span> ${formatPrice(product.priceUSD)} !!!</div>
                </div>
            `;
            this.track.appendChild(slide);
        });
        if (typeof updateAllText === 'function') updateAllText();
    }

    createDots() {
        if (!this.dotsContainer) return;

        this.dotsContainer.innerHTML = '';
        for (let i = 0; i < this.totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = `dot ${i === 0 ? 'active' : ''}`;
            dot.setAttribute('data-index', i);
            dot.addEventListener('click', () => this.goToSlide(i));
            this.dotsContainer.appendChild(dot);
        }
    }

    setupEventListeners() {
        if (this.prevBtn) {
            const newPrev = this.prevBtn.cloneNode(true);
            this.prevBtn.parentNode.replaceChild(newPrev, this.prevBtn);
            this.prevBtn = newPrev;
            this.prevBtn.addEventListener('click', () => this.prevSlide());
        }

        if (this.nextBtn) {
            const newNext = this.nextBtn.cloneNode(true);
            this.nextBtn.parentNode.replaceChild(newNext, this.nextBtn);
            this.nextBtn = newNext;
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }

        if (this.pauseBtn) {
            const newPause = this.pauseBtn.cloneNode(true);
            this.pauseBtn.parentNode.replaceChild(newPause, this.pauseBtn);
            this.pauseBtn = newPause;
            this.pauseBtn.addEventListener('click', () => this.togglePause());
        }

        window.addEventListener('resize', () => {
            this.updateSlidePosition(this.currentIndex);
        });
    }

    updateSlidePosition(index) {
        if (index < 0) index = this.totalSlides - 1;
        if (index >= this.totalSlides) index = 0;

        const translateX = -(index * 100 / this.totalSlides) + '%';
        this.track.style.transform = `translateX(${translateX})`;

        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        this.currentIndex = index;
    }

    nextSlide() {
        const nextIndex = (this.currentIndex + 1) % this.totalSlides;
        this.updateSlidePosition(nextIndex);
    }

    prevSlide() {
        const prevIndex = (this.currentIndex - 1 + this.totalSlides) % this.totalSlides;
        this.updateSlidePosition(prevIndex);
    }

    goToSlide(index) {
        if (index >= 0 && index < this.totalSlides) {
            this.updateSlidePosition(index);
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.pauseBtn) {
            this.pauseBtn.innerHTML = this.isPaused ? '▶️ Play' : '⏸️ Pause';
        }

        if (this.isPaused) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }

    startAutoPlay() {
        this.stopAutoPlay();
        this.interval = setInterval(() => {
            if (!this.isPaused) {
                this.nextSlide();
            }
        }, this.autoPlayDelay);
    }

    stopAutoPlay() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

// ============== SAMPLE PRODUCTS DATA ==============
const products = [
    { id: 1, name: "Photo Cards", priceUSD: 10.80, image: "https://i5.walmartimages.com/seo/48-Pack-Photo-Frame-Cards-with-Envelopes-Notecards-for-4x6-Picture-Insert-Ivory_5339c47e-9e2e-4d17-bbcc-46da7d0288fb.88480b050f2d7e488cd5a07e5e90cfb5.jpeg", description: "Create personalized greeting cards with your best photos" },
    { id: 2, name: "Calendar", priceUSD: 16.20, image: "https://th.bing.com/th/id/OIP.YCkmc4EOofxjfXtluhXq-gHaFj?w=284&h=213&c=7&r=0&o=7&pid=1.7&rm=3", description: "Make your own calendar with your favorite photos" },
    { id: 3, name: "Photo Book", priceUSD: 27.00, image: "https://kroma.co.nz/cdn/shop/products/Classic_Hard_Cover_Photo_Book_Premium.jpg?v=1746043639&width=940", description: "Premium hardcover photo books to collect your memories" },
    { id: 4, name: "Canvas", priceUSD: 43.20, image: "https://www.printique.com/wp-content/uploads/2019/08/1.jpg", description: "Your favorite photo mounted on canvas" },
    { id: 5, name: "Mouse Pads", priceUSD: 8.64, image: "https://th.bing.com/th/id/OIP.3qkIBo_qp7kxxk0SVA2ntwHaEI?w=313&h=180&c=7&r=0&o=7&pid=1.7&rm=3", description: "Display your favorite photo at the office with a mouse pad" },
    { id: 6, name: "Double Cards", priceUSD: 12.96, image: "https://framkallning.fotocenter.se/templates2/categories/FOLDEDCARDS/mobile_image.png", description: "Elegant greetings for all special occasions" },
];

const productIcons = {
    'photocards': '🖼️',
    'calendar': '📅',
    'photobook': '📘',
    'canvas': '🖼️',
    'mousepads': '🖱️',
    'doublecards': '🃏'
};

const productDisplayNames = {
    'photocards': 'Photo Cards',
    'calendar': 'Calendar',
    'photobook': 'Photo Book',
    'canvas': 'Canvas',
    'mousepads': 'Mouse Pads',
    'doublecards': 'Double Cards'
};

// ============== CALENDAR PRODUCTS DATA ==============
const calendarProducts = [
    { id: 101, type: 'desk', name: "Classic Wooden Desk Calendar", priceUSD: 15.30, image: "https://images.unsplash.com/photo-1585241645928-1f7aeb8bb6c7?w=400&h=300&fit=crop", description: "Elegant wooden base with monthly tear-off pages", features: ["Wooden Stand", "Tear-off Pages", "8x10 inches"], badge: "Best Seller" },
    { id: 102, type: 'desk', name: "Modern Acrylic Desk Calendar", priceUSD: 17.10, image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop", description: "Sleek acrylic stand with minimalist design", features: ["Acrylic Stand", "Modern Design", "12x12 inches"], badge: "Modern" },
    { id: 103, type: 'desk', name: "Magnetic Cube Calendar", priceUSD: 13.50, image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w-400&h=300&fit=crop", description: "Rotating cube design with monthly magnets", features: ["Magnetic Cubes", "Rotating Design", "Compact Size"], badge: "Interactive" },
    { id: 104, type: 'wall', name: "Landscape Wall Calendar", priceUSD: 11.70, image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop", description: "Beautiful nature photography for each month", features: ["12 Landscape Photos", "Spiral Bound", "11x17 inches"], badge: "Nature" },
    { id: 105, type: 'wall', name: "Family Photo Wall Calendar", priceUSD: 12.60, image: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=400&h=300&fit=crop", description: "Perfect for displaying family memories all year", features: ["Custom Photos", "Family Themed", "12x12 inches"], badge: "Family" },
    { id: 106, type: 'wall', name: "Art Illustration Calendar", priceUSD: 14.40, image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop", description: "Unique artwork for each month by local artists", features: ["Original Art", "Premium Paper", "8.5x11 inches"], badge: "Artistic" },
    { id: 107, type: 'mini', name: "Magnetic Fridge Calendar", priceUSD: 6.30, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop", description: "Small magnetic calendar perfect for your refrigerator", features: ["Magnetic Back", "Monthly View", "5x7 inches"], badge: "Practical" },
    { id: 108, type: 'mini', name: "Credit Card Pocket Calendar", priceUSD: 4.50, image: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=300&fit=crop", description: "Ultra-thin calendar that fits in your wallet", features: ["Credit Card Size", "12 Months", "Plastic Coated"], badge: "Portable" },
    { id: 109, type: 'mini', name: "Sticky Note Calendar", priceUSD: 8.10, image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400&h=300&fit=crop", description: "Monthly sticky notes you can write on", features: ["Writeable Surface", "12 Month Pads", "Desktop Design"], badge: "Functional" },
    { id: 110, type: 'photo', name: "12-Photo Custom Calendar", priceUSD: 16.20, image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop", description: "One special photo for each month of the year", features: ["12 Custom Photos", "Premium Glossy", "Wire-O Bound"], badge: "Personalized" },
    { id: 111, type: 'photo', name: "Photo Collage Calendar", priceUSD: 19.80, image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop", description: "Multiple photos per month in beautiful layouts", features: ["Collage Layouts", "Hard Cover", "12x12 inches"], badge: "Deluxe" },
    { id: 112, type: 'photo', name: "Baby's 1st Year Calendar", priceUSD: 21.60, image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop", description: "Special calendar to track baby's milestones", features: ["Baby Themed", "Milestone Stickers", "Premium Binding"], badge: "Baby" }
];

// ============== TEMPLATE CONFIGURATION ==============
let currentProduct = 'photocards';
window.currentProduct = currentProduct;
let templateImage = null;
const templates = {
    calendar: null,
    photocards: null,
    photobook: null,
    canvas: null,
    mousepads: null,
    doublecards: null
};

// ============== UNIT CONVERSION ==============
let currentUnit = 'inches';

function convertSize(sizeInInches, targetUnit) {
    if (!sizeInInches) return '';

    const parts = sizeInInches.split('x');
    if (parts.length !== 2) return sizeInInches;

    const width = parseFloat(parts[0]);
    const height = parseFloat(parts[1]);

    if (isNaN(width) || isNaN(height)) return sizeInInches;

    switch (targetUnit) {
        case 'cm':
            return `${(width * 2.54).toFixed(1)}x${(height * 2.54).toFixed(1)}`;
        case 'mm':
            return `${Math.round(width * 25.4)}x${Math.round(height * 25.4)}`;
        case 'inches':
        default:
            return sizeInInches;
    }
}

function getUnitSymbol(unit) {
    switch (unit) {
        case 'cm': return 'cm';
        case 'mm': return 'mm';
        default: return '"';
    }
}

function updateUnitDisplay() {
    const container = document.getElementById('sizeOptionsContainer');
    if (!container) return;

    const sizeLabels = container.querySelectorAll('.size-label');
    const sizePriceSpans = container.querySelectorAll('.size-price');
    const radioInputs = container.querySelectorAll('input[name="advancedPrintSize"]');

    radioInputs.forEach((radio, index) => {
        if (radio.value === 'custom') return;

        const sizeValue = radio.value;
        const sizeLabel = sizeLabels[index];
        const sizePrice = sizePriceSpans[index];

        if (sizeLabel) {
            sizeLabel.innerHTML = sizeValue + '"';

            if (currentUnit !== 'inches') {
                const convertedSize = convertSize(sizeValue, currentUnit);
                const unitSymbol = getUnitSymbol(currentUnit);

                let convertedSpan = sizeLabel.parentElement.querySelector('.converted-size');
                if (!convertedSpan) {
                    convertedSpan = document.createElement('span');
                    convertedSpan.className = 'converted-size';
                    convertedSpan.style.display = 'block';
                    convertedSpan.style.fontSize = '0.7rem';
                    convertedSpan.style.color = 'var(--text-muted)';
                    sizeLabel.parentElement.appendChild(convertedSpan);
                }
                convertedSpan.textContent = `${convertedSize}${unitSymbol}`;
            } else {
                const convertedSpan = sizeLabel.parentElement.querySelector('.converted-size');
                if (convertedSpan) {
                    convertedSpan.remove();
                }
            }
        }
    });

    updateCustomSizeUnit();
}

function updateCustomSizeUnit() {
    const widthInput = document.getElementById('customWidth');
    const heightInput = document.getElementById('customHeight');
    const unitSelect = document.getElementById('customUnit');

    if (!widthInput || !heightInput || !unitSelect) return;

    const currentWidthInInches = parseFloat(widthInput.getAttribute('data-inches') || widthInput.value);
    const currentHeightInInches = parseFloat(heightInput.getAttribute('data-inches') || heightInput.value);

    if (currentUnit === 'inches') {
        widthInput.value = currentWidthInInches;
        heightInput.value = currentHeightInInches;
        unitSelect.value = 'inches';
    } else if (currentUnit === 'cm') {
        widthInput.value = (currentWidthInInches * 2.54).toFixed(1);
        heightInput.value = (currentHeightInInches * 2.54).toFixed(1);
        unitSelect.value = 'cm';
    } else if (currentUnit === 'mm') {
        widthInput.value = Math.round(currentWidthInInches * 25.4);
        heightInput.value = Math.round(currentHeightInInches * 25.4);
        unitSelect.value = 'cm';
    }

    widthInput.setAttribute('data-inches', currentWidthInInches);
    heightInput.setAttribute('data-inches', currentHeightInInches);
}

function changeUnit(unit) {
    currentUnit = unit;
    updateUnitDisplay();
}

function getEventClient(e) {
    if (e.touches && e.touches[0]) return e.touches[0];
    return e;
}

// ============== SHOPPING CART ==============
let shoppingCart = JSON.parse(localStorage.getItem('fotocenterCart')) || [];
let undoStack = [];
let redoStack = [];

// ============== PHOTO EDITOR VARIABLES ==============
let uploadedImages = [];
let currentImageIndex = -1;
let originalImages = [];
let canvas = null;
let ctx = null;
let currentFilter = 'none';

// ============== CALENDAR VARIABLES ==============
let calendarImages = [];
let calendarCurrentImageIndex = -1;

let adjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false
};

// ============== CROP TOOL ==============
const cropTool = {
    active: false,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    minSize: 10,
    startX: 0,
    startY: 0,
    startCropX: 0,
    startCropY: 0,
    startCropWidth: 0,
    startCropHeight: 0,
    resizing: false,
    moving: false,
    handle: null,
    imageX: 0,
    imageY: 0,
    imageWidth: 0,
    imageHeight: 0
};

// ============== EDITOR FEATURES ==============
const editorFeatures = {
    filters: {
        none: '',
        grayscale: 'grayscale(100%)',
        sepia: 'sepia(100%)',
        vintage: 'sepia(80%) contrast(120%) brightness(90%)',
        cool: 'hue-rotate(180deg) saturate(120%)',
        warm: 'hue-rotate(-30deg) saturate(120%)',
        vivid: 'saturate(150%) contrast(120%)',
        noir: 'grayscale(100%) contrast(150%)',
        lomo: 'contrast(120%) saturate(120%) brightness(110%)',
        dreamy: 'contrast(90%) brightness(110%) saturate(150%)'
    },
    textOverlay: {
        active: false,
        text: 'Add Text',
        font: 'Arial',
        size: 20,
        color: '#ffffff',
        x: 50,
        y: 50
    }
};

// ============== CHAT AI ==============
const chatAI = {
    responses: {
        greeting: ["Hello! 👋 How can I help you with your photo printing needs today?", "Hi there! Welcome to FOTOCENTER. What can I assist you with?"],
        pricing: ["Our photo prints start at $0.45 for 4x6 prints. Cards range from $2.70-$6.30. Would you like specific pricing for any product?", "Prices vary by product: Photos ($0.45-$0.90), Cards ($2.70-$6.30), Calendars ($16.20), Photo Books ($27.00+). Need details?"],
        delivery: ["Delivery takes 3-5 business days in Metro Manila, 5-7 days for provincial areas. Express delivery (+$3.60) is available.", "Standard delivery: 3-5 days. We offer express options for faster service."],
        quality: ["We use professional-grade photo paper and printers for excellent quality. All prints come with a satisfaction guarantee!", "Our prints are made with archival-quality materials to ensure your memories last a lifetime."],
        upload: ["You can upload JPG, PNG, or GIF files up to 10MB each. Just drag & drop or click the upload area!", "Supported formats: JPG, PNG, GIF. Max 10MB per file. Need help with uploading?"],
        editing: ["Try our photo editor! You can adjust brightness, contrast, add filters, crop, and more before printing.", "Edit your photos with our tools - adjust colors, add filters, crop, or add text overlays."],
        sizes: ["We offer 4x6, 5x7, and 8x10 inch prints. Cards come in 5x7, 8x10, and folded formats.", "Print sizes: 4x6 ($0.45), 5x7 ($0.63), 8x10 ($0.90). Card sizes vary."],
        refund: ["We offer refunds within 7 days if prints are damaged or incorrect. Contact support with order details.", "Refund policy: 7-day window for damaged/incorrect items. Contact us for assistance."],
        payment: ["We accept GCash, Maya, credit/debit cards (Visa/Mastercard), and bank transfers.", "Payment methods: GCash, Maya, cards, and bank transfers."],
        default: ["I understand you're asking about that. For detailed assistance, please contact us at (+63) 929 725 2291.", "That's a great question! Let me connect you with a human agent for better assistance."]
    },

    getResponse: function (query) {
        query = query.toLowerCase();

        if (query.includes('hi') || query.includes('hello') || query.includes('hey')) {
            return this.getRandomResponse('greeting');
        } else if (query.includes('price') || query.includes('cost') || query.includes('how much')) {
            return this.getRandomResponse('pricing');
        } else if (query.includes('deliver') || query.includes('ship') || query.includes('time')) {
            return this.getRandomResponse('delivery');
        } else if (query.includes('quality') || query.includes('good') || query.includes('best')) {
            return this.getRandomResponse('quality');
        } else if (query.includes('upload') || query.includes('file') || query.includes('format')) {
            return this.getRandomResponse('upload');
        } else if (query.includes('edit') || query.includes('filter') || query.includes('crop')) {
            return this.getRandomResponse('editing');
        } else if (query.includes('size') || query.includes('dimension')) {
            return this.getRandomResponse('sizes');
        } else if (query.includes('refund') || query.includes('return') || query.includes('exchange')) {
            return this.getRandomResponse('refund');
        } else if (query.includes('payment') || query.includes('pay') || query.includes('card')) {
            return this.getRandomResponse('payment');
        } else {
            return this.responses.default[Math.floor(Math.random() * this.responses.default.length)];
        }
    },

    getRandomResponse: function (type) {
        const responses = this.responses[type];
        return responses[Math.floor(Math.random() * responses.length)];
    }
};

// ============== CHAT FUNCTIONS ==============
function setupChatKeyboard() {
    const chatInput = document.getElementById('chatInput');

    if (chatInput) {
        chatInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        chatInput.addEventListener('keypress', function (event) {
            if (event.keyCode === 13 || event.key === 'Enter') {
                if (!event.shiftKey) {
                    event.preventDefault();
                    setTimeout(() => {
                        sendMessage();
                    }, 10);
                }
            }
        });
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');

    if (!input) return;

    const messageText = input.value.trim();

    if (!messageText) {
        return;
    }

    input.value = '';

    addMessage(messageText, 'user');
    if (window.socket && window.socket.connected) {
        try {
            window.socket.emit('message', { sender: 'user', text: messageText, time: new Date().toLocaleTimeString(), user: localStorage.getItem('userName') || 'Guest' });
        } catch (e) {
            console.warn('Socket emit failed', e);
        }
    }

    setTimeout(() => {
        const response = chatAI.getResponse(messageText);
        addMessage(response, 'bot');

        if (window.socket && window.socket.connected) {
            try {
                window.socket.emit('message', { sender: 'bot', text: response, time: new Date().toLocaleTimeString() });
            } catch (e) { }
        }
    }, 1000);

    setTimeout(() => {
        if (input) {
            input.focus();
        }
    }, 50);
}

function addMessage(text, sender) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;

    const messageContent = document.createElement('div');
    const time = new Date().toLocaleTimeString();
    messageContent.innerHTML = `<p>${text}</p><div class="msg-time">${time}</div>`;
    messageDiv.appendChild(messageContent);

    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
    persistChatMessage({ sender, text, time });
}

function persistChatMessage(msg) {
    try {
        const key = 'fotocenterChatHistory';
        const hist = JSON.parse(localStorage.getItem(key)) || [];
        hist.push(msg);
        if (hist.length > 200) hist.shift();
        localStorage.setItem(key, JSON.stringify(hist));
    } catch (e) {
        console.warn('Failed to persist chat message', e);
    }
}

function loadChatHistory() {
    try {
        const key = 'fotocenterChatHistory';
        const hist = JSON.parse(localStorage.getItem(key)) || [];
        const messages = document.getElementById('chatMessages');
        if (!messages) return;
        messages.innerHTML = '';
        hist.forEach(m => {
            const div = document.createElement('div');
            div.className = `chat-message ${m.sender}-message`;
            const content = document.createElement('div');
            content.innerHTML = `<p>${m.text}</p><div class="msg-time">${m.time}</div>`;
            div.appendChild(content);
            messages.appendChild(div);
        });
        messages.scrollTop = messages.scrollHeight;
    } catch (e) {
        console.warn('Failed to load chat history', e);
    }
}

// ============== CART IMAGE STORE (IndexedDB) ==============
var CartImageStore = {
    dbName: 'fotocenterCartImages',
    storeName: 'images',
    version: 1,

    open: function() {
        return new Promise(function(resolve, reject) {
            var request = indexedDB.open(CartImageStore.dbName, CartImageStore.version);
            request.onupgradeneeded = function(e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains(CartImageStore.storeName)) {
                    db.createObjectStore(CartImageStore.storeName, { keyPath: 'id' });
                }
            };
            request.onsuccess = function(e) { resolve(e.target.result); };
            request.onerror = function(e) { reject(e.target.error); };
        });
    },

    save: function(cartItemId, photosData) {
        return CartImageStore.open().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction(CartImageStore.storeName, 'readwrite');
                var store = tx.objectStore(CartImageStore.storeName);
                store.put({ id: cartItemId, photos: photosData });
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        }).catch(function(e) { console.warn('CartImageStore save failed:', e); });
    },

    load: function(cartItemId) {
        return CartImageStore.open().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction(CartImageStore.storeName, 'readonly');
                var store = tx.objectStore(CartImageStore.storeName);
                var request = store.get(cartItemId);
                request.onsuccess = function() { resolve(request.result ? request.result.photos : null); };
                request.onerror = function(e) { reject(e.target.error); };
            });
        }).catch(function(e) { console.warn('CartImageStore load failed:', e); return null; });
    },

    remove: function(cartItemId) {
        return CartImageStore.open().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction(CartImageStore.storeName, 'readwrite');
                var store = tx.objectStore(CartImageStore.storeName);
                store.delete(cartItemId);
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        }).catch(function(e) { console.warn('CartImageStore remove failed:', e); });
    },

    clear: function() {
        return CartImageStore.open().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction(CartImageStore.storeName, 'readwrite');
                var store = tx.objectStore(CartImageStore.storeName);
                store.clear();
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        }).catch(function(e) { console.warn('CartImageStore clear failed:', e); });
    }
};

// ============== CART MANAGEMENT ==============
function updateCartStorage() {
    var lightCart = shoppingCart.map(function(item) {
        var copy = Object.assign({}, item);
        delete copy._fullPhotosData;
        return copy;
    });
    localStorage.setItem('fotocenterCart', JSON.stringify(lightCart));
}

function addToCart(item) {
    if (!item.sizeMode) {
        item.sizeMode = 'fill';
    }

    if (item.selected === undefined) {
        item.selected = true;
    }

    const existingItemIndex = shoppingCart.findIndex(cartItem =>
        cartItem.id === item.id &&
        cartItem.type === item.type &&
        cartItem.size === item.size &&
        cartItem.sizeMode === item.sizeMode &&
        cartItem.paperType === item.paperType
    );

    if (existingItemIndex > -1) {
        shoppingCart[existingItemIndex].quantity += item.quantity || 1;
    } else {
        item.addedAt = new Date().toISOString();
        shoppingCart.push(item);
    }

    updateCartStorage();
    updateCartUI();
    showSuccessModal();
    updateCartHover();

    return item;
}

function updateCartUI() {
    const cartBtn = document.querySelector('.cart-btn');
    if (!cartBtn) return;

    const total = calculateCartTotal();
    const itemCount = shoppingCart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    cartBtn.innerHTML = `
        <span class="cart-icon-wrapper">
            <img src="images2/cart.png" alt="Cart" class="cart-icon-img">
            <span id="cartCount" class="cart-badge">${itemCount}</span>
        </span>
        <span data-i18n="cart">Cart</span>
    `;
    if (typeof updateAllText === 'function') updateAllText();
}

function calculateCartTotal() {
    return shoppingCart.reduce((total, item) => {
        const itemPrice = item.basePriceUSD || 0;
        return total + (itemPrice * (item.quantity || 1));
    }, 0);
}

function removeFromCart(index) {
    var removedItem = shoppingCart[index];
    shoppingCart.splice(index, 1);
    updateCartStorage();
    updateCartUI();
    updateCartHover();
    if (removedItem && removedItem.id) {
        CartImageStore.remove(removedItem.id);
        if (window._cartImageData) delete window._cartImageData[removedItem.id];
    }
    if (document.getElementById('cart-page')?.classList.contains('active')) {
        renderCartPage();
    }
}

function clearCart() {
    shoppingCart = [];
    updateCartStorage();
    updateCartUI();
    updateCartHover();
    CartImageStore.clear();
    window._cartImageData = {};
}

function viewCart() {
    closeModal();
    navigateTo('cart-page');
}

function updateCartItemQuantity(index, change) {
    const item = shoppingCart[index];
    const newQuantity = (item.quantity || 1) + change;

    if (newQuantity < 1) {
        removeFromCart(index);
    } else {
        item.quantity = newQuantity;
        updateCartStorage();
        updateCartUI();
        updateCartHover();
        if (document.getElementById('cart-page')?.classList.contains('active')) {
            renderCartPage();
        }
    }
}

function closeCartModal() {
    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        cartModal.style.display = 'none';
    }
}

// General purpose success modal open/close used when adding items to cart
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (!modal) return;
    // Ensure modal is visible
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    // Helper to hide all modals reliably
    function hideAllModals() {
        document.querySelectorAll('.modal').forEach(m => {
            m.style.display = 'none';
        });
        document.body.classList.remove('modal-open');
    }

    // Replace handlers to ensure modal is hidden before navigation and to avoid duplicate handlers
    const continueBtn = modal.querySelector('.continue-btn');
    if (continueBtn) {
        continueBtn.onclick = null;
        continueBtn.addEventListener('click', function (e) {
            e && e.preventDefault && e.preventDefault();
            e && e.stopPropagation && e.stopPropagation();
            hideAllModals();
        }, { once: true });
    }

    const viewBtn = modal.querySelector('.cart-view-btn');
    if (viewBtn) {
        // Remove inline onclick and attach a robust listener
        viewBtn.onclick = null;
        viewBtn.addEventListener('click', function (e) {
            e && e.preventDefault && e.preventDefault();
            e && e.stopPropagation && e.stopPropagation();
            // Hide immediately, then navigate after a short delay to allow DOM updates
            hideAllModals();
            setTimeout(() => navigateTo('cart-page'), 50);
        }, { once: true });
    }
}

function closeModal() {
    // Hide any open modal and ensure body class is cleared
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
    });
    document.body.classList.remove('modal-open');
}

function proceedToCheckout() {
    if (shoppingCart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        alert('Please log in to proceed to checkout.');
        navigateTo('login');
        closeCartModal();
        return;
    }

    navigateTo('cart-page');
    closeCartModal();
}

function updateCartBadgeOnLoad() {
    const badge = document.getElementById('cartCount');
    if (badge) {
        const count = shoppingCart.reduce((s, i) => s + (i.quantity || 1), 0);
        badge.textContent = count;
    }
}

function renderShopProducts() {
    const grid = document.getElementById('shopProductsGrid');
    if (!grid) return;
    grid.innerHTML = products.map(p => {
        return `
        <div class="product-card" onclick="openProductPage(${p.id})">
            <div class="product-image"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
            <div class="product-info">
                <h4 data-i18n="product_${p.name.toLowerCase().replace(/ /g, '_')}_name">${p.name}</h4>
                <p data-i18n="product_${p.name.toLowerCase().replace(/ /g, '_')}_desc">${p.description}</p>
                <div class="product-footer">
                    <span class="price" data-usd="${p.priceUSD.toFixed(2)}">${formatPrice(p.priceUSD)}</span>
                    <button onclick="navigateTo('photos');" data-i18n="edit_btn">Edit</button>
                </div>
            </div>
        </div>
    `}).join('');
    updateAllText();
    updateAllPrices();
}

// ============== REVIEWS ==============
const reviews = [
    { name: 'Maria', product: 'Photo Book', rating: 5, text: 'Beautiful quality and fast delivery!' },
    { name: 'Jon', product: 'Canvas', rating: 4, text: 'Great colors, slightly longer shipping.' },
    { name: 'Anna', product: 'Calendars', rating: 5, text: 'Perfect gift. Loved the layout options.' }
];
let currentReview = 0;

function renderReviews() {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;
    container.innerHTML = reviews.map(r => `
        <div class="review-card">
            <div class="review-header"><strong>${r.name}</strong> — <em>${r.product}</em></div>
            <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
            <p>${r.text}</p>
        </div>
    `).join('');
    updateReviewVisibility();
}

function updateReviewVisibility() {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;
    const cards = container.querySelectorAll('.review-card');
    cards.forEach((c, i) => {
        c.style.display = i === currentReview ? 'block' : 'none';
    });
}

function prevReview() {
    currentReview = (currentReview - 1 + reviews.length) % reviews.length;
    updateReviewVisibility();
}

function nextReview() {
    currentReview = (currentReview + 1) % reviews.length;
    updateReviewVisibility();
}

// ============== LOGIN MODAL ==============
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function handleLoginModal(e) {
    e.preventDefault();
    const email = document.getElementById('modalEmail').value;
    const password = document.getElementById('modalPassword').value;
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    }).then(r => r.json()).then(data => {
        if (data && data.success) {
            closeLoginModal();
            updateLoginStatus();
            alert('Logged in successfully');
        } else {
            alert('Login failed: ' + (data.error || 'Unknown'));
        }
    }).catch(err => { console.error(err); alert('Login request failed'); });
}

function simulateSocialLogin(provider) {
    // Open OAuth popup to server route
    const url = `/auth/${provider}`;
    const popup = window.open(url, '_blank', 'width=600,height=700');
    // We can't reliably detect when popup finishes; user should be redirected back to / and session set
    alert(`A popup will open for ${provider} login. Complete the flow in the new window.`);
}

function toggleChat() {
    const chatBox = document.getElementById('chatBox');
    const chatMessages = document.getElementById('chatMessages');

    const isMobile = window.innerWidth <= 480;
    if (isMobile) {
        chatBox.classList.add('active');
        chatBox.style.width = '100%';
        chatBox.style.right = '0';
        chatBox.style.left = '0';
        chatBox.style.bottom = '0';
        chatBox.style.height = '100%';
        chatBox.style.borderRadius = '0';
    } else {
        chatBox.classList.toggle('active');
    }

    if (chatBox.classList.contains('active')) {
        const input = document.getElementById('chatInput');
        if (input) input.focus();

        const userName = localStorage.getItem('userName') || 'Guest';
        const existingWelcome = chatMessages.querySelector('.agent-welcome');
        if (!existingWelcome) {
            const welcomeMessageDiv = document.createElement('div');
            welcomeMessageDiv.className = 'chat-message bot-message agent-welcome';
            welcomeMessageDiv.innerHTML = `
                <div class="agent-welcome">
                    <img src="https://tse2.mm.bing.net/th/id/OIP.Il1NAN2piMWTFt8ZUoG8cwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3" alt="Agent" class="agent-photo">
                    <div class="agent-message"><p>Hello ${userName}! 👋 I'm Kyle from FOTOCENTER. How can I help?</p></div>
                </div>
            `;
            chatMessages.appendChild(welcomeMessageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } else {
        chatBox.style.width = '';
        chatBox.style.right = '';
        chatBox.style.left = '';
        chatBox.style.bottom = '';
        chatBox.style.height = '';
        chatBox.style.borderRadius = '';
    }
}

function initChatBackend() {
    try {
        if (typeof io === 'undefined') {
            console.info('Socket.io client not available. Backend chat disabled.');
            return;
        }

        const socket = io('http://localhost:3000');
        window.socket = socket;

        socket.on('connect', () => {
            console.info('Connected to chat backend');
            socket.emit('getHistory');
        });

        socket.on('history', (hist) => {
            try {
                const messages = document.getElementById('chatMessages');
                if (!messages) return;
                messages.innerHTML = '';
                hist.forEach(m => {
                    addMessage(m.text, m.sender === 'user' ? 'user' : 'bot');
                });
            } catch (e) {
                console.warn('Failed to render history', e);
            }
        });

        socket.on('message', (msg) => {
            if (!msg) return;
            addMessage(msg.text, msg.sender === 'user' ? 'user' : 'bot');
        });

        socket.on('disconnect', () => {
            console.info('Disconnected from chat backend');
        });
    } catch (e) {
        console.warn('Chat backend init failed', e);
    }
}

function displayHomeProducts() {
    const productsContainer = document.getElementById('products');
    if (!productsContainer) return;

    productsContainer.innerHTML = products.map(product => {
        return `
        <div class="product-card" onclick="openProductPage(${product.id})">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
            </div>
            <div class="product-info">
                <h3 data-i18n="product_${product.name.toLowerCase().replace(/ /g, '_')}_name">${product.name}</h3>
                <p class="product-desc" data-i18n="product_${product.name.toLowerCase().replace(/ /g, '_')}_desc">${product.description}</p>
                <div class="product-footer">
                    <span class="price" data-usd="${product.priceUSD.toFixed(2)}">${formatPrice(product.priceUSD)}</span>
                    <button class="add-btn" onclick="event.stopPropagation(); addToCartProduct(${product.id});" data-i18n="add_to_cart_btn">Add to Cart</button>
                </div>
            </div>
        </div>
    `}).join('');
    updateAllText();
}

function displayProductsGrid() {
    const productsGrid = document.getElementById('printProductsGrid');
    if (!productsGrid) return;

    productsGrid.innerHTML = products.map(product => {
        return `
        <div class="product-card" onclick="openProductPage(${product.id})">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
            </div>
            <div class="product-info">
                <h3 data-i18n="product_${product.name.toLowerCase().replace(/ /g, '_')}_name">${product.name}</h3>
                <p class="product-desc" data-i18n="product_${product.name.toLowerCase().replace(/ /g, '_')}_desc">${product.description}</p>
                <div class="product-footer">
                    <span class="price" data-usd="${product.priceUSD.toFixed(2)}">${formatPrice(product.priceUSD)}</span>
                    <button class="add-btn" onclick="event.stopPropagation(); addToCartProduct(${product.id})" data-i18n="add_to_cart_btn">Add to Cart</button>
                </div>
            </div>
        </div>
    `}).join('');
    updateAllText();
}

function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const detailContent = document.getElementById('detail-content');
    detailContent.innerHTML = `
        <div class="detail-layout">
            <div class="detail-image">
                <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
            </div>
            <div class="detail-info">
                <h2 data-i18n="product_${product.name.toLowerCase().replace(/ /g, '_')}_name">${product.name}</h2>
                <p class="detail-desc" data-i18n="product_${product.name.toLowerCase().replace(/ /g, '_')}_desc">${product.description}</p>
                <div class="price-section">
                    <span class="detail-price" data-usd="${product.priceUSD.toFixed(2)}">${formatPrice(product.priceUSD)}</span>
                </div>
                <div class="quantity-section">
                    <label for="quantity" data-i18n="quantity_label">Quantity:</label>
                    <input type="number" id="quantity" min="1" value="1">
                </div>
                <button class="detail-add-btn" onclick="addToCartProduct(${product.id})" data-i18n="add_to_cart_btn">Add to Cart</button>
            </div>
        </div>
    `;
    updateAllText();
}

function addToCartProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const quantityInput = document.getElementById('quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    const cartItem = {
        id: productId,
        type: 'product',
        productType: product.name.toLowerCase().replace(' ', ''),
        productName: product.name,
        name: product.name,
        image: product.image,
        basePriceUSD: product.priceUSD,
        quantity: quantity,
        selected: true,
        sizeMode: 'fill',
        photoCount: 1,
        photos: [{ thumbnail: product.image, name: product.name }]
    };

    addToCart(cartItem);
    alert(`${product.name} added to cart!`);
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    updateNavHighlight(pageId);

    if (pageId === 'photos') {
        setTimeout(() => {
            switchPhotoMode('upload');
        }, 50);

        // Show editor welcome popup (unless already triggered by "Open in Editor" button)
        setTimeout(() => {
            if (!window._editorWelcomeShownByButton) {
                const currentProd = window.currentProduct || 'photocards';
                if (typeof showEditorWelcome === 'function') {
                    showEditorWelcome(currentProd);
                }
            }
            window._editorWelcomeShownByButton = false;
        }, 200);
    }

    if (pageId === 'cart-page') {
        setTimeout(() => {
            activeCartTab = 'all';
            document.querySelectorAll('.cart-tab').forEach(t => t.classList.remove('active'));
            const allTab = document.querySelector('.cart-tab[data-tab="all"]');
            if (allTab) allTab.classList.add('active');
            renderCartPage();
        }, 100);
    }

    window.scrollTo(0, 0);
}

function updateNavHighlight(pageId) {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        const onclick = link.getAttribute('onclick');
        if (onclick && onclick.includes(`'${pageId}'`)) {
            link.classList.add('active');
        }
    });
}

function switchPhotoMode(mode) {
    const uploadModeBtn = document.getElementById('uploadModeBtn');
    const printModeBtn = document.getElementById('printModeBtn');
    const uploadView = document.getElementById('uploadView');
    const printsView = document.getElementById('printsView');

    if (mode === 'upload') {
        uploadModeBtn.classList.add('active');
        printModeBtn.classList.remove('active');
        uploadView.classList.add('active-view');
        uploadView.style.display = 'block';
        printsView.style.display = 'none';
    } else {
        uploadModeBtn.classList.remove('active');
        printModeBtn.classList.add('active');
        uploadView.classList.remove('active-view');
        uploadView.style.display = 'none';
        printsView.style.display = 'block';
        displayProductsGrid();
    }
}

// ============== PHOTO EDITOR SETUP ==============
function setupPhotoEditor() {
    canvas = document.getElementById('photoCanvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    setupSliders();
    setupTextDrag();
}

function setupTextDrag() {
    if (!canvas) return;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
        const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
        return {
            x: Math.round((clientX - rect.left) * (canvas.width / rect.width)),
            y: Math.round((clientY - rect.top) * (canvas.height / rect.height))
        };
    }

    function onDown(e) {
        if (!editorFeatures.textOverlay.active) return;
        const pos = getMousePos(e);
        let tx = editorFeatures.textOverlay.x;
        let ty = editorFeatures.textOverlay.y;
        if (tx <= 100) tx = Math.round((tx / 100) * canvas.width);
        if (ty <= 100) ty = Math.round((ty / 100) * canvas.height);

        const textSize = editorFeatures.textOverlay.size || 20;
        const textWidth = ctx.measureText(editorFeatures.textOverlay.text || '').width;
        const textHeight = textSize;

        if (pos.x >= tx - textWidth / 2 && pos.x <= tx + textWidth / 2 && pos.y >= ty - textHeight && pos.y <= ty + 10) {
            isDragging = true;
            dragOffset.x = pos.x - tx;
            dragOffset.y = pos.y - ty;
            e.preventDefault();
        }
    }

    function onMove(e) {
        if (!isDragging) return;
        const pos = getMousePos(e);
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;
        editorFeatures.textOverlay.x = Math.round((newX / canvas.width) * 100);
        editorFeatures.textOverlay.y = Math.round((newY / canvas.height) * 100);
        const tx = document.getElementById('textX');
        const ty = document.getElementById('textY');
        const txVal = document.getElementById('textXValue');
        const tyVal = document.getElementById('textYValue');
        if (tx && txVal) { tx.value = editorFeatures.textOverlay.x; txVal.textContent = tx.value; }
        if (ty && tyVal) { ty.value = editorFeatures.textOverlay.y; tyVal.textContent = ty.value; }
        drawImage();
        e.preventDefault();
    }

    function onUp(e) {
        if (isDragging) {
            isDragging = false;
        }
    }

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
}

function setupSliders() {
    const sliders = ['brightness', 'contrast', 'saturation'];
    sliders.forEach(slider => {
        const sliderElement = document.getElementById(`${slider}Slider`);
        const valueElement = document.getElementById(`${slider}Value`);

        if (sliderElement && valueElement) {
            sliderElement.addEventListener('input', function () {
                adjustments[slider] = parseInt(this.value);
                valueElement.textContent = `${this.value}%`;
                drawImage();
            });
            sliderElement.addEventListener('change', function () {
                saveCurrentAdjustments();
                pushSnapshotForCurrentImage();
            });
        }
    });
}

function setupDragAndDrop() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('photoInput');

    if (!dropArea || !fileInput) {
        console.warn('setupDragAndDrop: missing elements', { dropAreaFound: !!dropArea, fileInputFound: !!fileInput });
        return;
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('drag-over');
    }

    function unhighlight() {
        dropArea.classList.remove('drag-over');
    }

    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect, false);
    console.debug('setupDragAndDrop: listeners attached for dropArea and file input');
}

function handleFileSelect(e) {
    const files = e.target.files;
    console.debug('handleFileSelect: files selected', files && files.length);
    processFiles(files);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    console.debug('handleDrop: files dropped', files && files.length);
    processFiles(files);
}

function processFiles(files) {
    if (!files || files.length === 0) {
        console.warn('processFiles: no files to process');
        return;
    }

    Array.from(files).forEach(file => {
        try {
            if (file.type && file.type.match('image.*')) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    console.debug('processFiles: file read complete', file.name);
                    addImageToGallery(e.target.result, file.name);
                };
                reader.onerror = function (err) {
                    console.error('processFiles: FileReader error', err);
                };
                reader.readAsDataURL(file);
            } else {
                console.warn('processFiles: skipped non-image file', file.name, file.type);
            }
        } catch (err) {
            console.error('processFiles: error processing file', file, err);
        }
    });
}

function addImageToGallery(dataUrl, filename) {
    const image = new Image();
    image.onload = function () {
        try {
            const newImage = {
                id: Date.now() + Math.random(),
                src: dataUrl,
                name: filename,
                original: dataUrl,
                baseOriginal: dataUrl,
                adjustments: { ...adjustments },
                filter: 'none',
                history: [dataUrl],
                redo: []
            };

            uploadedImages.push(newImage);
            originalImages.push(dataUrl);
            updateImageGallery();
            updateUploadCount();

            if (uploadedImages.length === 1) {
                selectImage(0);
                setTimeout(() => {
                    pushSnapshotForCurrentImage();
                    updateUndoRedoButtons();
                }, 300);
            }
        } catch (err) {
            console.error('addImageToGallery: failed to add image', filename, err);
        }
    };
    image.src = dataUrl;
}

function updateImageGallery() {
    const container = document.getElementById('uploadedImages');
    if (!container) return;

    container.innerHTML = uploadedImages.map((image, index) => `
        <div class="uploaded-thumbnail ${index === currentImageIndex ? 'active' : ''}">
            <div class="thumb-remove" onclick="removeUploadedImage(event, ${index})">&times;</div>
            <div class="thumb-click" onclick="selectImage(${index})">
                <img src="${image.src}" alt="${image.name}">
                <div class="thumb-overlay">
                    <span class="thumb-name">${image.name.substring(0, 10)}...</span>
                </div>
            </div>
        </div>
    `).join('');
}

function removeUploadedImage(e, index) {
    try {
        e.stopPropagation();
    } catch (err) { }

    if (index < 0 || index >= uploadedImages.length) return;

    const wasCurrent = index === currentImageIndex;
    uploadedImages.splice(index, 1);

    if (uploadedImages.length === 0) {
        currentImageIndex = -1;
        const overlay = document.getElementById('canvasOverlay');
        if (overlay) overlay.style.display = 'block';
        updateImageGallery();
        updateUploadCount();
        return;
    }

    if (wasCurrent) {
        const newIndex = Math.min(index, uploadedImages.length - 1);
        selectImage(newIndex);
    } else {
        if (currentImageIndex > index) currentImageIndex--;
        updateImageGallery();
    }

    updateUploadCount();
}

function updateUploadCount() {
    const countElement = document.getElementById('uploadCount');
    if (countElement) {
        countElement.textContent = uploadedImages.length;
    }
}

function selectImage(index) {
    if (index < 0 || index >= uploadedImages.length) return;

    currentImageIndex = index;
    const imageData = uploadedImages[index];

    adjustments = { ...imageData.adjustments };
    currentFilter = imageData.filter;

    updateSliderValues();
    updateImageGallery();

    const overlay = document.getElementById('canvasOverlay');
    if (overlay) overlay.style.display = 'none';

    drawImage();
}

function updateSliderValues() {
    const sliders = ['brightness', 'contrast', 'saturation'];
    sliders.forEach(slider => {
        const sliderElement = document.getElementById(`${slider}Slider`);
        const valueElement = document.getElementById(`${slider}Value`);

        if (sliderElement && valueElement) {
            sliderElement.value = adjustments[slider];
            valueElement.textContent = `${adjustments[slider]}%`;
        }
    });
}

function adjustBrightness(amount) {
    adjustments.brightness = Math.max(0, Math.min(200, adjustments.brightness + amount));
    updateSliderValues();
    drawImage();
    saveCurrentAdjustments();
    pushSnapshotForCurrentImage();
}

function adjustContrast(amount) {
    adjustments.contrast = Math.max(0, Math.min(200, adjustments.contrast + amount));
    updateSliderValues();
    drawImage();
    saveCurrentAdjustments();
    pushSnapshotForCurrentImage();
}

function adjustSaturation(amount) {
    adjustments.saturation = Math.max(0, Math.min(200, adjustments.saturation + amount));
    updateSliderValues();
    drawImage();
    saveCurrentAdjustments();
    pushSnapshotForCurrentImage();
}

function rotateImage(degrees) {
    adjustments.rotation = (adjustments.rotation + degrees) % 360;
    drawImage();
    saveCurrentAdjustments();
    pushSnapshotForCurrentImage();
}

function flipHorizontal() {
    adjustments.flipHorizontal = !adjustments.flipHorizontal;
    drawImage();
    saveCurrentAdjustments();
    pushSnapshotForCurrentImage();
}

function flipVertical() {
    adjustments.flipVertical = !adjustments.flipVertical;
    drawImage();
    saveCurrentAdjustments();
    pushSnapshotForCurrentImage();
}

function applyFilter(filter) {
    currentFilter = filter;
    drawImage();
    saveCurrentAdjustments();
    pushSnapshotForCurrentImage();
}

function saveCurrentAdjustments() {
    if (currentImageIndex !== -1) {
        uploadedImages[currentImageIndex].adjustments = { ...adjustments };
        uploadedImages[currentImageIndex].filter = currentFilter;

        const fullSizeSnapshot = canvas.toDataURL('image/png');

        const thumbnailCanvas = document.createElement('canvas');
        const tempCtx = thumbnailCanvas.getContext('2d');
        const img = new Image();

        img.onload = function () {
            var maxThumbSize = 400;
            var thumbW = img.width;
            var thumbH = img.height;
            if (thumbW > maxThumbSize || thumbH > maxThumbSize) {
                var thumbRatio = Math.min(maxThumbSize / thumbW, maxThumbSize / thumbH);
                thumbW = Math.round(thumbW * thumbRatio);
                thumbH = Math.round(thumbH * thumbRatio);
            }
            thumbnailCanvas.width = thumbW;
            thumbnailCanvas.height = thumbH;
            tempCtx.save();

            tempCtx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;

            tempCtx.translate(thumbnailCanvas.width / 2, thumbnailCanvas.height / 2);
            tempCtx.rotate((adjustments.rotation * Math.PI) / 180);

            if (adjustments.flipHorizontal) tempCtx.scale(-1, 1);
            if (adjustments.flipVertical) tempCtx.scale(1, -1);

            tempCtx.translate(-thumbnailCanvas.width / 2, -thumbnailCanvas.height / 2);

            if (currentFilter === 'grayscale') {
                tempCtx.filter += ' grayscale(100%)';
            } else if (currentFilter === 'sepia') {
                tempCtx.filter += ' sepia(100%)';
            } else if (currentFilter === 'vintage') {
                tempCtx.filter += ' sepia(80%) contrast(120%) brightness(90%)';
            } else if (currentFilter === 'cool') {
                tempCtx.filter += ' contrast(110%) saturate(80%)';
            } else if (currentFilter === 'warm') {
                tempCtx.filter += ' contrast(110%) saturate(120%)';
            }

            tempCtx.drawImage(img, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
            tempCtx.restore();

            tempCtx.save();
            tempCtx.font = Math.max(10, Math.round(thumbW * 0.04)) + 'px Arial';
            tempCtx.fillStyle = 'rgba(255,255,255,0.7)';
            tempCtx.textAlign = 'right';
            tempCtx.fillText('FOTOCENTER', thumbnailCanvas.width - 6, thumbnailCanvas.height - 6);
            tempCtx.restore();

            uploadedImages[currentImageIndex].src = thumbnailCanvas.toDataURL();
            updateImageGallery();

            const imgObj = uploadedImages[currentImageIndex];
            imgObj.history = imgObj.history || [];
            const last = imgObj.history[imgObj.history.length - 1];
            if (last !== fullSizeSnapshot) {
                imgObj.history.push(fullSizeSnapshot);
                if (imgObj.history.length > 30) imgObj.history.shift();
                imgObj.redo = [];
            }
            updateUndoRedoButtons();
        };
        img.src = uploadedImages[currentImageIndex].original;
    }
}

function pushSnapshotForCurrentImage() {
    if (currentImageIndex === -1 || !canvas) return;

    const imgObj = uploadedImages[currentImageIndex];
    const snapshot = canvas.toDataURL('image/png');

    if (!imgObj.history) imgObj.history = [];
    if (!imgObj.redo) imgObj.redo = [];

    if (imgObj.history[imgObj.history.length - 1] !== snapshot) {
        imgObj.history.push(snapshot);
        imgObj.redo = [];
        console.log('📸 History saved. Length:', imgObj.history.length);
    }

    updateUndoRedoButtons();
}

function undo() {
    if (currentImageIndex === -1) {
        console.log('⛔ No image selected');
        return;
    }

    const imgObj = uploadedImages[currentImageIndex];
    if (!imgObj.history || imgObj.history.length <= 1) {
        console.log('⛔ Nothing to undo');
        return;
    }

    console.log('↩️ Undo called. Current history length:', imgObj.history.length);

    const current = canvas.toDataURL('image/png');
    imgObj.redo.push(current);

    imgObj.history.pop();
    const previous = imgObj.history[imgObj.history.length - 1];

    imgObj.original = previous;

    const img = new Image();
    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        console.log('✅ Undo successful. New history length:', imgObj.history.length);
    };
    img.src = previous;

    updateUndoRedoButtons();
}

function redo() {
    if (currentImageIndex === -1) {
        console.log('⛔ No image selected');
        return;
    }

    const imgObj = uploadedImages[currentImageIndex];
    if (!imgObj.redo || imgObj.redo.length === 0) {
        console.log('⛔ Nothing to redo');
        return;
    }

    console.log('↪️ Redo called. Redo stack length:', imgObj.redo.length);

    const next = imgObj.redo.pop();

    const current = canvas.toDataURL('image/png');
    imgObj.history.push(current);

    imgObj.original = next;

    const img = new Image();
    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        console.log('✅ Redo successful');
    };
    img.src = next;

    updateUndoRedoButtons();
}

function resetImage() {
    if (currentImageIndex === -1) return;

    const imgObj = uploadedImages[currentImageIndex];

    adjustments = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false
    };
    currentFilter = 'none';

    imgObj.original = imgObj.baseOriginal;

    imgObj.history = [imgObj.baseOriginal];
    imgObj.redo = [];

    const img = new Image();
    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        updateSliderValues();
        updateUndoRedoButtons();
        console.log('✅ Reset complete - back to original');
    };
    img.src = imgObj.baseOriginal;
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    let canUndo = false;
    let canRedo = false;

    if (currentImageIndex !== -1) {
        const imgObj = uploadedImages[currentImageIndex];
        if (imgObj) {
            canUndo = (imgObj.history && imgObj.history.length > 1);
            canRedo = (imgObj.redo && imgObj.redo.length > 0);
        }
    }

    if (!canUndo) canUndo = undoStack.length > 0;
    if (!canRedo) canRedo = redoStack.length > 0;

    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;

    console.log(`🔄 Undo: ${canUndo ? 'enabled' : 'disabled'}, Redo: ${canRedo ? 'enabled' : 'disabled'}`);
}

function drawImage() {
    if (currentImageIndex === -1 || !canvas || !ctx) return;

    const image = uploadedImages[currentImageIndex];
    const img = new Image();

    img.onload = function () {
        console.log('📸 Drawing image. Product:', currentProduct);
        console.log('Image dimensions:', img.width, 'x', img.height);

        ctx.save();

        if (!cropTool.active) {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((adjustments.rotation * Math.PI) / 180);

        if (adjustments.flipHorizontal) ctx.scale(-1, 1);
        if (adjustments.flipVertical) ctx.scale(1, -1);

        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        let filterString = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
        if (currentFilter !== 'none' && editorFeatures.filters[currentFilter]) {
            filterString += ' ' + editorFeatures.filters[currentFilter];
        }
        ctx.filter = filterString;

        if (cropTool.active) {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);

            cropTool.imageX = 0;
            cropTool.imageY = 0;
            cropTool.imageWidth = canvas.width;
            cropTool.imageHeight = canvas.height;
        } else {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);

            cropTool.imageX = 0;
            cropTool.imageY = 0;
            cropTool.imageWidth = canvas.width;
            cropTool.imageHeight = canvas.height;
        }

        ctx.restore();

        if (editorFeatures.textOverlay.active) {
            const text = editorFeatures.textOverlay;
            ctx.save();
            ctx.font = `${text.size}px ${text.font}`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'center';
            let xPos = text.x;
            let yPos = text.y;
            if (xPos <= 100) xPos = Math.round((xPos / 100) * canvas.width);
            if (yPos <= 100) yPos = Math.round((yPos / 100) * canvas.height);
            ctx.fillText(text.text, xPos, yPos);
            ctx.restore();
        }

        if (cropTool.active) {
            console.log('✂️ Crop active, updating handles');
            setTimeout(() => {
                setupCropHandles();
            }, 50);
        }
    };

    img.src = image.original;
}

// ============== DROPDOWN MENU ==============
function setupDropdownMenu() {
    const dropdownBtn = document.getElementById('productDropdownBtn');
    const dropdownMenu = document.getElementById('productDropdownMenu');

    if (!dropdownBtn || !dropdownMenu) return;

    const productTypes = ['photocards', 'calendar', 'photobook', 'canvas', 'mousepads', 'doublecards'];

    dropdownMenu.innerHTML = productTypes.map(type => {
        const icon = productIcons[type] || '📷';
        const name = productDisplayNames[type] || type;
        const isActive = currentProduct === type ? 'active' : '';

        return `
            <div class="dropdown-item ${isActive}" data-product="${type}">
                <span>${name}</span>
                <span class="item-icon">${icon}</span>
            </div>
        `;
    }).join('');

    dropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const productType = this.getAttribute('data-product');

            dropdownMenu.querySelectorAll('.dropdown-item').forEach(el => {
                el.classList.remove('active');
            });
            this.classList.add('active');

            updateProductBadge(productType);

            dropdownMenu.classList.remove('show');

            selectProduct(productType);
        });
    });

    document.addEventListener('click', function () {
        dropdownMenu.classList.remove('show');
    });
}

function updateProductBadge(productType) {
    const badge = document.getElementById('currentProductBadge');
    if (!badge) return;

    if (productType && productDisplayNames[productType]) {
        const icon = productIcons[productType] || '📷';
        const name = productDisplayNames[productType];
        badge.innerHTML = `<span class="badge-text">${icon} ${name}</span>`;
    } else {
        badge.innerHTML = `<span class="badge-text">None</span>`;
    }
}

function selectProduct(type) {
    currentProduct = type;
    window.currentProduct = type;

    document.querySelectorAll('.product-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-product') === type);
    });

    updateProductBadge(type);

    updatePrintOptions(type);

    if (templates[type]) {
        templateImage = new Image();
        templateImage.onload = function () {
            drawImage();
        };
        templateImage.src = templates[type];
    } else {
        templateImage = null;
        drawImage();
    }
}

// ============== PRINT OPTIONS ==============
let currentQuantity = 1;
let basePricePerUnit = 25;

function updateQuantity(change) {
    currentQuantity = Math.max(1, currentQuantity + change);
    document.getElementById('quantityDisplay').textContent = currentQuantity;
    calculatePrice();
}

window.calculatePrice = function calculatePrice() {
    console.log('💰 Calculating price in USD...');

    const productType = window.currentProduct || 'photocards';
    console.log('1. Product type:', productType);

    const selectedSize = document.querySelector('input[name="advancedPrintSize"]:checked');
    console.log('2. Selected size element:', selectedSize);

    let basePriceUSD = 0.45;

    if (selectedSize) {
        const sizeValue = selectedSize.value;
        console.log('3. Size value:', sizeValue);

        if (sizeValue === 'custom') {
            const widthEl = document.getElementById('customWidth');
            const heightEl = document.getElementById('customHeight');
            const width = parseFloat(widthEl?.getAttribute('data-inches') || widthEl?.value) || 8;
            const height = parseFloat(heightEl?.getAttribute('data-inches') || heightEl?.value) || 10;
            const area = width * height;
            basePriceUSD = Math.max(0.45, Math.round(area * 0.009 * 100) / 100);
            console.log('4. Custom size calculation:', { width, height, area, basePriceUSD });
        } else {
            const options = window.printOptionsConfig?.[productType] || window.printOptionsConfig?.photocards || [];
            console.log('4. Options for this product:', options);

            const option = options.find(opt => opt.value === sizeValue);
            console.log('5. Found option:', option);

            basePriceUSD = option ? option.priceUSD : 0.45;
            console.log('6. Calculated basePriceUSD:', basePriceUSD);
        }
    } else {
        console.log('3. No size selected, using default');
    }

    console.log('7. Final basePriceUSD before paper:', basePriceUSD);

    let paperUpgradeUSD = 0;
    const selectedPaper = document.querySelector('input[name="paperType"]:checked');
    console.log('8. Selected paper element:', selectedPaper);
    console.log('9. Selected paper value:', selectedPaper?.value);

    if (selectedPaper) {
        const paperValue = selectedPaper.value;
        console.log('10. Paper value:', paperValue);

        switch (paperValue) {
            case 'glossy':
                paperUpgradeUSD = 0.18;
                console.log('11. Glossy selected: $0.18');
                break;
            case 'matte':
                paperUpgradeUSD = 0.27;
                console.log('11. Matte selected: $0.27');
                break;
            case 'premium':
                paperUpgradeUSD = 0.45;
                console.log('11. Premium selected: $0.45');
                break;
            default:
                paperUpgradeUSD = 0;
                console.log('11. Standard selected: $0.00');
        }
    } else {
        console.log('10. No paper selected, defaulting to 0');
    }
    console.log('12. Final paperUpgradeUSD:', paperUpgradeUSD);

    const quantity = parseInt(document.getElementById('quantityDisplay')?.textContent || '1');
    console.log('13. Quantity:', quantity);

    const priceBeforeQuantity = basePriceUSD + paperUpgradeUSD;
    const totalPriceUSD = priceBeforeQuantity * quantity;

    console.log(`14. 📏 Base: $${basePriceUSD.toFixed(2)}, 📄 Paper: $${paperUpgradeUSD.toFixed(2)}, 🔢 Qty: ${quantity}, 💰 Total: $${totalPriceUSD.toFixed(2)}`);

    document.getElementById('basePrice')?.setAttribute('data-usd', basePriceUSD);
    document.getElementById('paperUpgradePrice')?.setAttribute('data-usd', paperUpgradeUSD);
    document.getElementById('quantityMultiplier')?.setAttribute('data-usd', priceBeforeQuantity * quantity);
    document.getElementById('advancedTotalPrice')?.setAttribute('data-usd', totalPriceUSD);
    document.getElementById('finalPrice')?.setAttribute('data-usd', totalPriceUSD);


    document.getElementById('basePrice').textContent = formatPrice(basePriceUSD);
    document.getElementById('paperUpgradePrice').textContent = formatPrice(paperUpgradeUSD);
    document.getElementById('quantityMultiplier').textContent = formatPrice(priceBeforeQuantity * quantity);
    document.getElementById('advancedTotalPrice').textContent = formatPrice(totalPriceUSD);
    document.getElementById('finalPrice').textContent = formatPrice(totalPriceUSD);
}

function onSizeSelect() {
    const selectedSize = document.querySelector('input[name="advancedPrintSize"]:checked');
    if (!selectedSize) return;

    const customSizeContainer = document.getElementById('customSizeContainer');

    if (selectedSize.value === 'custom') {
        customSizeContainer.style.display = 'block';
        document.getElementById('customWidth').disabled = false;
        document.getElementById('customHeight').disabled = false;
        document.getElementById('customUnit').disabled = false;

        updateCustomSizeUnit();
    } else {
        customSizeContainer.style.display = 'none';
        document.getElementById('customWidth').disabled = true;
        document.getElementById('customHeight').disabled = true;
        document.getElementById('customUnit').disabled = true;
    }

    calculatePrice();
}

function updatePrintOptions(productType) {
    console.log('Updating print options for:', productType);
    const container = document.getElementById('sizeOptionsContainer');

    if (!container) {
        console.error('Size options container not found!');
        return;
    }

    const options = printOptionsConfig[productType] || printOptionsConfig.photocards;
    console.log('Options:', options);

    let html = '';
    options.forEach(opt => {
        const usdPrice = opt.priceUSD.toFixed(2);
        html += `
            <label class="print-size-btn small">
                <input type="radio" name="advancedPrintSize" value="${opt.value}" onchange="onSizeSelect()">
                <span class="size-label">${opt.value}"</span>
                <span class="size-price" data-usd="${usdPrice}">${formatPrice(opt.priceUSD)}</span>
            </label>
        `;
    });

    html += `
        <label class="print-size-btn small custom">
            <input type="radio" name="advancedPrintSize" value="custom" onchange="onSizeSelect()">
            <span class="size-label">Custom</span>
        </label>
    `;

    container.innerHTML = html;

    const firstRadio = container.querySelector('input[type="radio"]');
    if (firstRadio) {
        firstRadio.checked = true;
    }

    if (typeof updateUnitDisplay === 'function') {
        updateUnitDisplay();
    }

    if (typeof calculatePrice === 'function') {
        calculatePrice();
    }
}

function initPrintOptions() {
    const advancedInputs = ['customWidth', 'customHeight', 'customUnit'];
    advancedInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function () {
                if (currentUnit === 'inches') {
                    this.setAttribute('data-inches', this.value);
                }
                calculatePrice();
            });
        }
    });

    document.querySelectorAll('input[name="paperType"]').forEach(radio => {
        radio.addEventListener('change', calculatePrice);
    });

    updatePrintOptions(currentProduct || 'photocards');
}

window.addPhotoToCart = function () {
    if (uploadedImages.length === 0) {
        alert('Please upload at least one photo first.');
        return;
    }

    // Recalculate price to ensure it's up-to-date
    calculatePrice();

    let size, paperType = 'standard', sizeMode = 'fill', isCustom = false;
    let customWidth = null, customHeight = null, customUnit = 'inches';

    const sizeModeRadio = document.querySelector('input[name="sizeMode"]:checked');
    sizeMode = sizeModeRadio ? sizeModeRadio.value : 'fill';

    const paperTypeRadio = document.querySelector('input[name="paperType"]:checked');
    paperType = paperTypeRadio ? paperTypeRadio.value : 'standard';

    const selectedSize = document.querySelector('input[name="advancedPrintSize"]:checked');
    size = selectedSize ? selectedSize.value : '4x6';

    if (size === 'custom') {
        isCustom = true;
        const widthInput = document.getElementById('customWidth');
        const heightInput = document.getElementById('customHeight');

        customWidth = widthInput.getAttribute('data-inches') || widthInput.value;
        customHeight = heightInput.getAttribute('data-inches') || heightInput.value;
        customUnit = 'inches';
        size = `${customWidth} x ${customHeight} ${customUnit}`;
    }

    const finalPriceUSD = parseFloat(document.getElementById('finalPrice').getAttribute('data-usd'));
    const quantity = parseInt(document.getElementById('quantityDisplay').textContent || '1');
    const pricePerPhotoUSD = finalPriceUSD / quantity;

    const productName = productDisplayNames[currentProduct] || 'Photo';

    const photosData = uploadedImages.map(img => ({
        name: img.name,
        thumbnail: img.src,
    }));

    // Full image data saved to IndexedDB (not localStorage) to avoid quota issues
    const fullPhotosData = uploadedImages.map(img => ({
        name: img.name,
        thumbnail: img.src,
        original: img.original,
        baseOriginal: img.baseOriginal,
        adjustments: img.adjustments ? { ...img.adjustments } : null,
        filter: img.filter || 'none'
    }));

    // Capture a proper display image from the canvas (not the tiny thumbnail)
    var canvasDisplayImage = null;
    if (canvas && canvas.width > 0) {
        var dispCanvas = document.createElement('canvas');
        var dispCtx = dispCanvas.getContext('2d');
        var maxDisp = 500;
        var dw = canvas.width;
        var dh = canvas.height;
        if (dw > maxDisp || dh > maxDisp) {
            var dr = Math.min(maxDisp / dw, maxDisp / dh);
            dw = Math.round(dw * dr);
            dh = Math.round(dh * dr);
        }
        dispCanvas.width = dw;
        dispCanvas.height = dh;
        dispCtx.drawImage(canvas, 0, 0, dw, dh);
        canvasDisplayImage = dispCanvas.toDataURL('image/jpeg', 0.7);
    }

    const cartItem = {
        id: 'photo-' + Date.now(),
        type: 'photo',
        productType: currentProduct,
        productName: productName,
        name: `${productName} (${size})`,
        size: size,
        photos: photosData,
        photoCount: uploadedImages.length,
        displayImage: canvasDisplayImage || uploadedImages[0]?.src || null,
        price: formatPrice(finalPriceUSD), // Formatted total price for display
        basePriceUSD: pricePerPhotoUSD, // Price per unit in USD
        quantity: quantity,
        paperType: paperType,
        sizeMode: sizeMode,
        isCustom: isCustom,
        customDimensions: isCustom ? { width: customWidth, height: customHeight, unit: customUnit } : null,
        originalName: uploadedImages[0]?.name || 'photo',
        timestamp: new Date().toISOString(),
        selected: true
    };

    // If editing an existing cart item, replace it instead of adding new
    if (window._editingCartIndex !== null && window._editingCartIndex !== undefined) {
        var insertIndex = Math.min(window._editingCartIndex, shoppingCart.length);
        cartItem.addedAt = new Date().toISOString();
        shoppingCart.splice(insertIndex, 0, cartItem);
        updateCartStorage();
        updateCartUI();
        showSuccessModal();
        updateCartHover();
    } else {
        addToCart(cartItem);
    }

    // Save full image data for edit feature
    // 1. Global map (instant, same session)
    window._cartImageData = window._cartImageData || {};
    window._cartImageData[cartItem.id] = fullPhotosData;
    // 2. IndexedDB (backup for page refresh)
    CartImageStore.save(cartItem.id, fullPhotosData);
    // 3. In-memory on cart item
    cartItem._fullPhotosData = fullPhotosData;

    // Reset editor state
    uploadedImages = [];
    originalImages = [];
    currentImageIndex = -1;
    updateImageGallery();
    const overlay = document.getElementById('canvasOverlay');
    if (overlay) overlay.style.display = 'block';
    document.getElementById('uploadCount').textContent = '0';
    currentQuantity = 1;
    document.getElementById('quantityDisplay').textContent = '1';

    // Reset file input so the same file can be re-uploaded
    const fileInput = document.getElementById('photoInput');
    if (fileInput) fileInput.value = '';

    calculatePrice();

    // Clear editing state
    window._editingCartIndex = null;

    console.log('✨ Editor reset complete! Item added to cart.');
};

// ============== EDIT CART ITEM ==============
function editCartItem(index) {
    var item = shoppingCart[index];
    if (!item) return;

    // Store the cart index so addPhotoToCart can replace instead of adding new
    window._editingCartIndex = index;

    var itemId = item.id;

    // Grab full photos data from ALL sources BEFORE removing from cart
    window._cartImageData = window._cartImageData || {};
    var inMemoryPhotos = window._cartImageData[itemId] || item._fullPhotosData || null;
    // Clean up global map
    delete window._cartImageData[itemId];

    // Remove item from cart
    shoppingCart.splice(index, 1);
    updateCartStorage();
    updateCartUI();
    updateCartHover();

    // Navigate to editor
    window._editorWelcomeShownByButton = true;
    navigateTo('photos');

    setTimeout(function() {
        // Restore product type
        if (item.productType && typeof selectProduct === 'function') {
            selectProduct(item.productType);
        }

        // Use in-memory data if available (fastest, most reliable)
        if (inMemoryPhotos && inMemoryPhotos.length > 0) {
            console.log('✏️ Edit: using in-memory photos data (' + inMemoryPhotos.length + ' photos)');
            CartImageStore.remove(itemId);
            restorePhotosToEditor(inMemoryPhotos, item);
        } else {
            // Fallback: try IndexedDB
            console.log('✏️ Edit: no in-memory data, trying IndexedDB...');
            CartImageStore.load(itemId).then(function(dbPhotos) {
                CartImageStore.remove(itemId);
                var photosList = dbPhotos || item.photos || [];
                console.log('✏️ Edit: IndexedDB returned ' + (dbPhotos ? dbPhotos.length + ' photos' : 'null, using cart photos'));
                restorePhotosToEditor(photosList, item);
            });
        }
    }, 300);
}

function restorePhotosToEditor(photosList, item) {
    uploadedImages = [];
    originalImages = [];
    currentImageIndex = -1;

    if (!photosList || photosList.length === 0) {
        console.warn('No photos found to restore.');
        return;
    }

    var loadedCount = 0;
    var totalPhotos = photosList.length;

    photosList.forEach(function(photo, photoIndex) {
        var imgSrc = photo.original || photo.baseOriginal || photo.thumbnail;
        if (!imgSrc) {
            loadedCount++;
            return;
        }

        var testImg = new Image();
        testImg.onload = function() {
            var fullSrc = photo.original || photo.baseOriginal || imgSrc;

            // Generate a proper-sized gallery thumbnail from the full-res image
            var thumbCanvas = document.createElement('canvas');
            var thumbCtx = thumbCanvas.getContext('2d');
            var maxThumb = 300;
            var tw = testImg.width;
            var th = testImg.height;
            if (tw > maxThumb || th > maxThumb) {
                var ratio = Math.min(maxThumb / tw, maxThumb / th);
                tw = Math.round(tw * ratio);
                th = Math.round(th * ratio);
            }
            thumbCanvas.width = tw;
            thumbCanvas.height = th;
            thumbCtx.drawImage(testImg, 0, 0, tw, th);
            var betterThumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);

            var restoredImage = {
                id: Date.now() + Math.random(),
                src: betterThumbnail,
                name: photo.name || 'Photo ' + (photoIndex + 1),
                original: fullSrc,
                baseOriginal: photo.baseOriginal || fullSrc,
                adjustments: photo.adjustments ? {
                    brightness: photo.adjustments.brightness || 100,
                    contrast: photo.adjustments.contrast || 100,
                    saturation: photo.adjustments.saturation || 100,
                    rotation: photo.adjustments.rotation || 0,
                    flipHorizontal: photo.adjustments.flipHorizontal || false,
                    flipVertical: photo.adjustments.flipVertical || false
                } : {
                    brightness: 100, contrast: 100, saturation: 100,
                    rotation: 0, flipHorizontal: false, flipVertical: false
                },
                filter: photo.filter || 'none',
                history: [photo.baseOriginal || fullSrc],
                redo: []
            };

            uploadedImages.push(restoredImage);
            originalImages.push(restoredImage.original);
            loadedCount++;

            if (loadedCount === totalPhotos) {
                finishEditRestore(item);
            }
        };
        testImg.onerror = function() {
            console.warn('Failed to load image for edit restore:', photo.name);
            loadedCount++;
            if (loadedCount === totalPhotos) {
                finishEditRestore(item);
            }
        };
        testImg.src = imgSrc;
    });
}

function finishEditRestore(item) {
    updateImageGallery();
    updateUploadCount();

    // Select the first image and restore its adjustments
    if (uploadedImages.length > 0) {
        // Ensure canvas is initialized before drawing
        if (!canvas || !ctx) {
            setupPhotoEditor();
        }

        selectImage(0);

        var firstImg = uploadedImages[0];
        adjustments = { ...firstImg.adjustments };
        currentFilter = firstImg.filter || 'none';
        updateSliderValues();

        // Small delay to ensure canvas container is fully rendered after page switch
        setTimeout(function() {
            drawImage();
        }, 100);
    }

    // Restore print options: size
    if (item.size && item.size !== 'custom') {
        var sizeRadio = document.querySelector('input[name="advancedPrintSize"][value="' + item.size + '"]');
        if (sizeRadio) {
            sizeRadio.checked = true;
            onSizeSelect();
        }
    } else if (item.isCustom && item.customDimensions) {
        var customRadio = document.querySelector('input[name="advancedPrintSize"][value="custom"]');
        if (customRadio) {
            customRadio.checked = true;
            onSizeSelect();
            var widthInput = document.getElementById('customWidth');
            var heightInput = document.getElementById('customHeight');
            if (widthInput) {
                widthInput.value = item.customDimensions.width;
                widthInput.setAttribute('data-inches', item.customDimensions.width);
            }
            if (heightInput) {
                heightInput.value = item.customDimensions.height;
                heightInput.setAttribute('data-inches', item.customDimensions.height);
            }
        }
    }

    // Restore paper type
    if (item.paperType) {
        var paperRadio = document.querySelector('input[name="paperType"][value="' + item.paperType + '"]');
        if (paperRadio) paperRadio.checked = true;
    }

    // Restore size mode
    if (item.sizeMode) {
        var modeRadio = document.querySelector('input[name="sizeMode"][value="' + item.sizeMode + '"]');
        if (modeRadio) modeRadio.checked = true;
    }

    // Restore quantity
    if (item.quantity) {
        currentQuantity = item.quantity;
        var qtyDisplay = document.getElementById('quantityDisplay');
        if (qtyDisplay) qtyDisplay.textContent = item.quantity;
    }

    calculatePrice();

    console.log('✅ Cart item restored to editor for editing.');
}

// ============== CROP TOOL ==============
function setupCropHandles() {
    console.log('setupCropHandles called');
    if (!canvas) {
        console.log('Canvas not ready');
        return;
    }

    removeCropHandles();

    const container = document.querySelector('.canvas-container');
    if (!container) {
        console.log('Canvas container not found');
        return;
    }

    if (!cropTool.active) {
        console.log('Crop tool not active');
        return;
    }

    container.style.position = 'relative';

    const containerRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    console.log('Container rect:', containerRect);
    console.log('Canvas rect:', canvasRect);

    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;

    console.log('Scale factors:', { scaleX, scaleY });

    const cropCanvasX = cropTool.imageX + (cropTool.x / 100) * cropTool.imageWidth;
    const cropCanvasY = cropTool.imageY + (cropTool.y / 100) * cropTool.imageHeight;
    const cropCanvasW = (cropTool.width / 100) * cropTool.imageWidth;
    const cropCanvasH = (cropTool.height / 100) * cropTool.imageHeight;

    const screenX = canvasRect.left + (cropCanvasX * scaleX);
    const screenY = canvasRect.top + (cropCanvasY * scaleY);
    const screenW = cropCanvasW * scaleX;
    const screenH = cropCanvasH * scaleY;

    const relX = screenX - containerRect.left;
    const relY = screenY - containerRect.top;

    console.log('Crop box pixels (relative to container):', { relX, relY, screenW, screenH });

    const cropWrapper = document.createElement('div');
    cropWrapper.className = 'crop-wrapper';
    cropWrapper.style.position = 'absolute';
    cropWrapper.style.top = '0';
    cropWrapper.style.left = '0';
    cropWrapper.style.width = '100%';
    cropWrapper.style.height = '100%';
    cropWrapper.style.pointerEvents = 'none';
    cropWrapper.style.zIndex = '10000';
    container.appendChild(cropWrapper);

    const cropBox = document.createElement('div');
    cropBox.className = 'crop-box';
    cropBox.style.position = 'absolute';
    cropBox.style.left = relX + 'px';
    cropBox.style.top = relY + 'px';
    cropBox.style.width = screenW + 'px';
    cropBox.style.height = screenH + 'px';
    cropBox.style.border = '2px solid white';
    cropBox.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.5)';
    cropBox.style.cursor = 'move';
    cropBox.style.pointerEvents = 'auto';
    cropBox.style.zIndex = '10002';
    cropBox.setAttribute('data-crop-box', 'true');
    cropWrapper.appendChild(cropBox);

    cropBox.addEventListener('mousedown', startCropMove);
    cropBox.addEventListener('touchstart', startCropMove, { passive: false });

    const handleSize = 24;
    const handlePositions = [
        { pos: 'nw', cursor: 'nw-resize', left: relX, top: relY },
        { pos: 'n', cursor: 'n-resize', left: relX + screenW / 2, top: relY },
        { pos: 'ne', cursor: 'ne-resize', left: relX + screenW, top: relY },
        { pos: 'e', cursor: 'e-resize', left: relX + screenW, top: relY + screenH / 2 },
        { pos: 'se', cursor: 'se-resize', left: relX + screenW, top: relY + screenH },
        { pos: 's', cursor: 's-resize', left: relX + screenW / 2, top: relY + screenH },
        { pos: 'sw', cursor: 'sw-resize', left: relX, top: relY + screenH },
        { pos: 'w', cursor: 'w-resize', left: relX, top: relY + screenH / 2 }
    ];

    handlePositions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `crop-handle ${pos.pos}`;
        handle.style.position = 'absolute';
        handle.style.width = handleSize + 'px';
        handle.style.height = handleSize + 'px';
        handle.style.background = 'white';
        handle.style.border = '3px solid #ff6b35';
        handle.style.borderRadius = '50%';
        handle.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
        handle.style.zIndex = '10003';
        handle.style.cursor = pos.cursor;
        handle.style.pointerEvents = 'auto';
        handle.style.left = (pos.left - handleSize / 2) + 'px';
        handle.style.top = (pos.top - handleSize / 2) + 'px';

        handle.addEventListener('mousedown', (e) => startCropResize(e, pos.pos));
        handle.addEventListener('touchstart', (e) => startCropResize(e, pos.pos), { passive: false });

        cropWrapper.appendChild(handle);
    });

    console.log('All crop handles created');
}

function removeCropHandles() {
    document.querySelectorAll('.crop-wrapper').forEach(el => el.remove());
}

function updateCropHandlesPosition() {
    if (!canvas || !cropTool.active) return;

    const container = document.querySelector('.canvas-container');
    if (!container) return;

    const wrapper = container.querySelector('.crop-wrapper');
    if (!wrapper) return;

    const containerRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;

    const cropCanvasX = cropTool.imageX + (cropTool.x / 100) * cropTool.imageWidth;
    const cropCanvasY = cropTool.imageY + (cropTool.y / 100) * cropTool.imageHeight;
    const cropCanvasW = (cropTool.width / 100) * cropTool.imageWidth;
    const cropCanvasH = (cropTool.height / 100) * cropTool.imageHeight;

    const screenX = canvasRect.left + (cropCanvasX * scaleX);
    const screenY = canvasRect.top + (cropCanvasY * scaleY);
    const screenW = cropCanvasW * scaleX;
    const screenH = cropCanvasH * scaleY;

    const relX = screenX - containerRect.left;
    const relY = screenY - containerRect.top;

    const cropBox = wrapper.querySelector('[data-crop-box]');
    if (cropBox) {
        cropBox.style.left = relX + 'px';
        cropBox.style.top = relY + 'px';
        cropBox.style.width = screenW + 'px';
        cropBox.style.height = screenH + 'px';
    }

    const handlePositions = {
        'nw': [relX, relY],
        'n': [relX + screenW / 2, relY],
        'ne': [relX + screenW, relY],
        'e': [relX + screenW, relY + screenH / 2],
        'se': [relX + screenW, relY + screenH],
        's': [relX + screenW / 2, relY + screenH],
        'sw': [relX, relY + screenH],
        'w': [relX, relY + screenH / 2]
    };

    wrapper.querySelectorAll('.crop-handle').forEach(handle => {
        const posClass = Array.from(handle.classList).find(c =>
            ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].includes(c)
        );
        if (posClass && handlePositions[posClass]) {
            const [hx, hy] = handlePositions[posClass];
            handle.style.left = (hx - 12) + 'px';
            handle.style.top = (hy - 12) + 'px';
        }
    });
}

function startCropResize(e, handle) {
    e.preventDefault();
    e.stopPropagation();
    cropTool.resizing = true;
    cropTool.handle = handle;

    const pt = getEventClient(e);
    cropTool.startX = pt.clientX;
    cropTool.startY = pt.clientY;
    cropTool.startCropX = cropTool.x;
    cropTool.startCropY = cropTool.y;
    cropTool.startCropWidth = cropTool.width;
    cropTool.startCropHeight = cropTool.height;

    window.addEventListener('mousemove', onCropResize);
    window.addEventListener('mouseup', onCropResizeEnd);
    window.addEventListener('touchmove', onCropResize, { passive: false });
    window.addEventListener('touchend', onCropResizeEnd);
}

function onCropResize(e) {
    if (!cropTool.resizing) return;
    e.preventDefault();

    const pt = getEventClient(e);
    const rect = canvas.getBoundingClientRect();

    const dx = ((pt.clientX - cropTool.startX) / cropTool.imageWidth) * 100;
    const dy = ((pt.clientY - cropTool.startY) / cropTool.imageHeight) * 100;

    let newX = cropTool.startCropX;
    let newY = cropTool.startCropY;
    let newWidth = cropTool.startCropWidth;
    let newHeight = cropTool.startCropHeight;

    const handle = cropTool.handle;

    if (handle.includes('e')) newWidth += dx;
    if (handle.includes('w')) {
        newX += dx;
        newWidth -= dx;
    }
    if (handle.includes('s')) newHeight += dy;
    if (handle.includes('n')) {
        newY += dy;
        newHeight -= dy;
    }

    if (newWidth < 10) newWidth = 10;
    if (newHeight < 10) newHeight = 10;
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + newWidth > 100) newX = 100 - newWidth;
    if (newY + newHeight > 100) newY = 100 - newHeight;

    cropTool.x = newX;
    cropTool.y = newY;
    cropTool.width = newWidth;
    cropTool.height = newHeight;

    updateCropHandlesPosition();
    drawImage();
}

function onCropResizeEnd() {
    cropTool.resizing = false;
    window.removeEventListener('mousemove', onCropResize);
    window.removeEventListener('mouseup', onCropResizeEnd);
    window.removeEventListener('touchmove', onCropResize);
    window.removeEventListener('touchend', onCropResizeEnd);
}

function startCropMove(e) {
    e.preventDefault();
    e.stopPropagation();
    cropTool.moving = true;

    const pt = getEventClient(e);
    cropTool.startX = pt.clientX;
    cropTool.startY = pt.clientY;
    cropTool.startCropX = cropTool.x;
    cropTool.startCropY = cropTool.y;

    window.addEventListener('mousemove', onCropMove);
    window.addEventListener('mouseup', onCropMoveEnd);
    window.addEventListener('touchmove', onCropMove, { passive: false });
    window.addEventListener('touchend', onCropMoveEnd);
}

function onCropMove(e) {
    if (!cropTool.moving) return;
    e.preventDefault();

    const pt = getEventClient(e);
    const rect = canvas.getBoundingClientRect();

    const dx = ((pt.clientX - cropTool.startX) / cropTool.imageWidth) * 100;
    const dy = ((pt.clientY - cropTool.startY) / cropTool.imageHeight) * 100;

    let newX = cropTool.startCropX + dx;
    let newY = cropTool.startCropY + dy;

    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + cropTool.width > 100) newX = 100 - cropTool.width;
    if (newY + cropTool.height > 100) newY = 100 - cropTool.height;

    cropTool.x = newX;
    cropTool.y = newY;

    updateCropHandlesPosition();
    drawImage();
}

function onCropMoveEnd() {
    cropTool.moving = false;
    window.removeEventListener('mousemove', onCropMove);
    window.removeEventListener('mouseup', onCropMoveEnd);
    window.removeEventListener('touchmove', onCropMove);
    window.removeEventListener('touchend', onCropMoveEnd);
}

function toggleCrop() {
    console.log('🔧 Toggle crop. Current state:', cropTool.active);
    cropTool.active = !cropTool.active;
    console.log('New crop state:', cropTool.active);

    if (cropTool.active) {
        cropTool.x = 0;
        cropTool.y = 0;
        cropTool.width = 100;
        cropTool.height = 100;
        console.log('Crop initialized:', cropTool);
        console.log('Current image position:', {
            x: cropTool.imageX,
            y: cropTool.imageY,
            w: cropTool.imageWidth,
            h: cropTool.imageHeight
        });

        showCropControls();

        setTimeout(() => {
            console.log('Setting up crop handles...');
            setupCropHandles();
        }, 100);
    } else {
        console.log('Removing crop handles');
        removeCropHandles();
        hideCropControls();
    }

    drawImage();
}

function showCropControls() {
    const cropControls = `
        <div class="tool-group">
            <label>Crop Image</label>
            <div class="button-group">
                <button onclick="applyCrop()" class="tool-btn" style="background: #28a745; color: white;">Apply Crop</button>
                <button onclick="cancelCrop()" class="tool-btn" style="background: #dc3545; color: white;">Cancel</button>
            </div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">
                Drag corners to resize • Drag inside box to move
            </p>
        </div>
    `;

    const editorTools = document.querySelector('.editor-tools');
    if (editorTools) {
        const existingCropControls = document.getElementById('cropControls');
        if (existingCropControls) existingCropControls.remove();

        const cropDiv = document.createElement('div');
        cropDiv.id = 'cropControls';
        cropDiv.innerHTML = cropControls;
        editorTools.appendChild(cropDiv);
    }
}

function hideCropControls() {
    const cropControls = document.getElementById('cropControls');
    if (cropControls) {
        cropControls.remove();
    }
}

function applyCrop() {
    if (currentImageIndex === -1 || !cropTool.active) return;

    pushSnapshotForCurrentImage();

    const image = uploadedImages[currentImageIndex];
    const img = new Image();

    img.onload = function () {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        const sx = (cropTool.x / 100) * img.width;
        const sy = (cropTool.y / 100) * img.height;
        const sWidth = (cropTool.width / 100) * img.width;
        const sHeight = (cropTool.height / 100) * img.height;

        tempCanvas.width = sWidth;
        tempCanvas.height = sHeight;

        tempCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

        image.original = tempCanvas.toDataURL();

        cropTool.active = false;
        removeCropHandles();
        hideCropControls();

        drawImage();
        saveCurrentAdjustments();

        setTimeout(() => {
            pushSnapshotForCurrentImage();
            console.log('✅ Crop applied and saved to history');
        }, 100);

        console.log('✅ Crop applied');
    };

    img.src = image.original;
}

function cancelCrop() {
    cropTool.active = false;
    removeCropHandles();
    hideCropControls();
    drawImage();
}

function toggleTextOverlay() {
    editorFeatures.textOverlay.active = !editorFeatures.textOverlay.active;
    if (editorFeatures.textOverlay.active) {
        showTextControls();
    } else {
        hideTextControls();
    }
    drawImage();
}

function showTextControls() {
    const textControls = `
        <div class="tool-group">
            <label>Text Overlay</label>
            <input type="text" id="textInput" value="Add Text" class="text-input">
            <div class="slider-container">
                <span>Font Size: </span>
                <input type="range" min="10" max="100" value="20" id="textSize">
                <span id="textSizeValue">20px</span>
            </div>
            <div class="slider-container">
                <span>X: </span>
                <input type="range" min="0" max="1000" value="50" id="textX">
                <span id="textXValue">50</span>
            </div>
            <div class="slider-container">
                <span>Y: </span>
                <input type="range" min="0" max="1000" value="50" id="textY">
                <span id="textYValue">50</span>
            </div>
            <input type="color" id="textColor" value="#ffffff">
            <button onclick="updateText()" class="tool-btn">Update Text</button>
        </div>
    `;

    const editorTools = document.querySelector('.editor-tools');
    if (editorTools) {
        const existingTextControls = document.getElementById('textControls');
        if (existingTextControls) existingTextControls.remove();

        const textDiv = document.createElement('div');
        textDiv.id = 'textControls';
        textDiv.innerHTML = textControls;
        editorTools.appendChild(textDiv);

        const textInput = document.getElementById('textInput');
        const textSize = document.getElementById('textSize');
        const textSizeValue = document.getElementById('textSizeValue');
        const textColor = document.getElementById('textColor');
        const textX = document.getElementById('textX');
        const textY = document.getElementById('textY');
        const textXValue = document.getElementById('textXValue');
        const textYValue = document.getElementById('textYValue');

        if (textInput) {
            textInput.value = editorFeatures.textOverlay.text || '';
            textInput.addEventListener('input', function () {
                editorFeatures.textOverlay.text = this.value;
                drawImage();
            });
        }

        if (textSize && textSizeValue) {
            textSize.value = editorFeatures.textOverlay.size || 20;
            textSizeValue.textContent = textSize.value + 'px';
            textSize.addEventListener('input', function () {
                textSizeValue.textContent = this.value + 'px';
                editorFeatures.textOverlay.size = parseInt(this.value);
                drawImage();
            });
        }

        if (textColor) {
            textColor.value = editorFeatures.textOverlay.color || '#ffffff';
            textColor.addEventListener('input', function () {
                editorFeatures.textOverlay.color = this.value;
                drawImage();
            });
        }

        if (textX && textXValue) {
            textX.value = editorFeatures.textOverlay.x || 50;
            textXValue.textContent = textX.value;
            textX.addEventListener('input', function () {
                textXValue.textContent = this.value;
                editorFeatures.textOverlay.x = parseInt(this.value);
                drawImage();
            });
        }

        if (textY && textYValue) {
            textY.value = editorFeatures.textOverlay.y || 50;
            textYValue.textContent = textY.value;
            textY.addEventListener('input', function () {
                textYValue.textContent = this.value;
                editorFeatures.textOverlay.y = parseInt(this.value);
                drawImage();
            });
        }
    }
}

function hideTextControls() {
    const textControls = document.getElementById('textControls');
    if (textControls) {
        textControls.remove();
    }
}

function updateText() {
    drawImage();
}

function reduceRedEye() {
    if (currentImageIndex === -1) return;

    alert('Red-eye reduction applied (simulated). In a real app, this would analyze and fix red-eye areas.');

    const image = uploadedImages[currentImageIndex];
    const img = new Image();

    img.onload = function () {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (r > 150 && g < 100 && b < 100) {
                data[i] = r * 0.7;
                data[i + 1] = g * 1.1;
                data[i + 2] = b * 1.1;
            }
        }

        tempCtx.putImageData(imageData, 0, 0);

        image.original = tempCanvas.toDataURL();
        drawImage();
        saveCurrentAdjustments();
        pushSnapshotForCurrentImage();
    };

    img.src = image.original;
}

function autoEnhance() {
    if (currentImageIndex === -1) return;

    pushSnapshotForCurrentImage();

    adjustments = {
        brightness: 110,
        contrast: 110,
        saturation: 110,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false
    };

    updateSliderValues();
    drawImage();
    saveCurrentAdjustments();
    pushSnapshotForCurrentImage();
    alert('Auto-enhance applied!');
}

function saveImage() {
    if (currentImageIndex === -1) {
        alert('Please select an image first.');
        return;
    }

    saveCurrentAdjustments();
    alert('Edits saved successfully!');
}

function downloadImage() {
    if (currentImageIndex === -1) {
        alert('Please select an image first.');
        return;
    }

    const link = document.createElement('a');
    link.download = `edited-${uploadedImages[currentImageIndex].name}`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
}

// showSuccessModal / closeModal are implemented earlier with wiring to ensure
// the success modal closes before navigation. (Duplicate simple definitions
// removed to avoid overriding the wired implementation.)

function setupEventListeners() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        cartModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeCartModal();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
            closeCartModal();
        }
    });
}

function initPhotoMode() {
    switchPhotoMode('upload');
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    }).then(r => r.json()).then(data => {
        if (data && data.success) {
            alert('Login successful! Welcome back.');
            navigateTo('home');
            updateLoginStatus();
        } else {
            alert('Login failed: ' + (data.error || 'Unknown'));
        }
    }).catch(err => { console.error(err); alert('Login request failed'); });
}

function handleSignUp(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    if (password !== confirm) {
        alert('Passwords do not match!');
        return;
    }

    fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    }).then(r => r.json()).then(data => {
        if (data && data.success) {
            alert('Account created successfully! Welcome to FOTOCENTER.');
            navigateTo('home');
            updateLoginStatus();
        } else {
            alert('Signup failed: ' + (data.error || 'Unknown'));
        }
    }).catch(err => { console.error(err); alert('Signup request failed'); });
}

function signUpWithGoogle() {
    const popup = window.open('/auth/google', '_blank', 'width=600,height=700');
    alert('A popup will open for Google sign-up. Complete the flow in the popup and return to the site.');
}

function updateLoginStatus() {
    const loginLink = document.querySelector('.login-link');
    fetch('/api/me').then(r => r.json()).then(data => {
        const user = data && data.user;
        if (user && loginLink) {
            loginLink.textContent = 'Log out';
            loginLink.onclick = function () {
                fetch('/api/logout', { method: 'POST' }).then(() => {
                    updateLoginStatus();
                    navigateTo('home');
                }).catch(() => { updateLoginStatus(); navigateTo('home'); });
                return false;
            };
        } else if (loginLink) {
            loginLink.textContent = 'Log in';
            loginLink.onclick = function () {
                openLoginModal();
                return false;
            };
        }
    }).catch(err => {
        if (loginLink) {
            loginLink.textContent = 'Log in';
            loginLink.onclick = function () { openLoginModal(); return false; };
        }
    });
}

function selectFaqQuestion(type) {
    let question = '';
    let answer = '';

    switch (type) {
        case 'pricing':
            question = 'What are your prices?';
            answer = chatAI.getResponse('pricing');
            break;
        case 'delivery':
            question = 'How long does delivery take?';
            answer = chatAI.getResponse('delivery');
            break;
        case 'upload':
            question = 'How do I upload photos?';
            answer = chatAI.getResponse('upload');
            break;
        case 'quality':
            question = 'What is your print quality like?';
            answer = chatAI.getResponse('quality');
            break;
        case 'editing':
            question = 'Can I edit my photos?';
            answer = chatAI.getResponse('editing');
            break;
        case 'payment':
            question = 'What payment methods do you accept?';
            answer = chatAI.getResponse('payment');
            break;
        case 'sizes':
            question = 'What sizes do you offer?';
            answer = chatAI.getResponse('sizes');
            break;
        case 'refund':
            question = 'What is your refund policy?';
            answer = chatAI.getResponse('refund');
            break;
    }

    addMessage(question, 'user');

    setTimeout(() => {
        addMessage(answer, 'bot');
    }, 500);
}

function setupFaqScroll() {
    const faqScrollContainer = document.querySelector('.faq-scroll-container');
    const leftIndicator = document.querySelector('.faq-scroll-indicator.left');
    const rightIndicator = document.querySelector('.faq-scroll-indicator.right');

    if (!faqScrollContainer || !leftIndicator || !rightIndicator) return;

    function updateIndicators() {
        const scrollLeft = faqScrollContainer.scrollLeft;
        const maxScroll = faqScrollContainer.scrollWidth - faqScrollContainer.clientWidth;

        leftIndicator.style.opacity = scrollLeft > 0 ? '1' : '0';
        rightIndicator.style.opacity = scrollLeft < maxScroll - 1 ? '1' : '0';
    }

    leftIndicator.addEventListener('click', () => {
        faqScrollContainer.scrollBy({ left: -100, behavior: 'smooth' });
    });

    rightIndicator.addEventListener('click', () => {
        faqScrollContainer.scrollBy({ left: 100, behavior: 'smooth' });
    });

    faqScrollContainer.addEventListener('scroll', updateIndicators);

    setTimeout(updateIndicators, 100);
}

// ============== CALENDAR FUNCTIONS ==============
function switchCalendarsMode(mode) {
    const uploadBtn = document.getElementById('calendarsUploadModeBtn');
    const productsBtn = document.getElementById('calendarsProductsModeBtn');
    const uploadView = document.getElementById('calendarsUploadView');
    const productsView = document.getElementById('calendarsProductsView');

    if (mode === 'upload') {
        uploadBtn.classList.add('active');
        productsBtn.classList.remove('active');
        uploadView.style.display = 'block';
        productsView.style.display = 'none';
    } else {
        uploadBtn.classList.remove('active');
        productsBtn.classList.add('active');
        uploadView.style.display = 'none';
        productsView.style.display = 'block';
        displayCalendarProducts();
    }
}

function initializeCalendarPreview() {
    const monthGrid = document.querySelector('.calendar-month-grid');
    if (!monthGrid) return;

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    monthGrid.innerHTML = months.map(month => `
        <div class="calendar-month" onclick="selectCalendarMonth('${month}')">
            <div class="month-name">${month}</div>
            <div class="month-image">📷</div>
        </div>
    `).join('');

    setupCalendarUpload();
    updateCalendarPrice();
}

function setupCalendarUpload() {
    const dropArea = document.getElementById('calendarsDropArea');
    const fileInput = document.getElementById('calendarsPhotoInput');

    if (!dropArea || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('drag-over');
    }

    function unhighlight() {
        dropArea.classList.remove('drag-over');
    }

    dropArea.addEventListener('drop', handleCalendarDrop, false);
    fileInput.addEventListener('change', handleCalendarFileSelect, false);
}

function handleCalendarFileSelect(e) {
    const files = e.target.files;
    processCalendarFiles(files);
}

function handleCalendarDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    processCalendarFiles(files);
}

function processCalendarFiles(files) {
    Array.from(files).forEach((file, index) => {
        if (file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                addCalendarImageToGallery(e.target.result, file.name, index);
            };
            reader.readAsDataURL(file);
        }
    });
}

function addCalendarImageToGallery(dataUrl, filename, index) {
    const image = new Image();
    image.onload = function () {
        calendarImages.push({
            id: Date.now() + Math.random(),
            src: dataUrl,
            name: filename,
            monthIndex: index % 12
        });

        updateCalendarImageGallery();
        updateCalendarUploadCount();

        if (index < 12) {
            updateMonthPreview(index, dataUrl);
        }
    };
    image.src = dataUrl;
}

function updateCalendarImageGallery() {
    const container = document.getElementById('calendarsUploadedImages');
    if (!container) return;

    container.innerHTML = calendarImages.map((image, index) => `
        <div class="uploaded-thumbnail ${index === calendarCurrentImageIndex ? 'active' : ''}" 
             onclick="selectCalendarImage(${index})">
            <img src="${image.src}" alt="${image.name}">
            <div class="thumb-overlay">
                <span class="thumb-name">Month ${(image.monthIndex + 1)} - ${image.name.substring(0, 10)}...</span>
            </div>
        </div>
    `).join('');
}

function selectCalendarImage(index) {
    calendarCurrentImageIndex = index;
    updateCalendarImageGallery();
}

function updateCalendarUploadCount() {
    const countElement = document.getElementById('calendarsUploadCount');
    if (countElement) {
        countElement.textContent = calendarImages.length;
    }
}

function updateMonthPreview(monthIndex, imageUrl) {
    const months = document.querySelectorAll('.calendar-month');
    if (months[monthIndex]) {
        const monthImage = months[monthIndex].querySelector('.month-image');
        if (monthImage) {
            monthImage.innerHTML = `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            monthImage.style.background = 'none';
        }
    }
}

function selectCalendarMonth(monthName) {
    alert(`Selected ${monthName}. You can upload a photo for this month.`);
}

function updateCalendarPrice() {
    const calendarType = document.getElementById('calendarType').value;
    const size = document.getElementById('calendarSize').value;
    const paperType = document.getElementById('paperType').value;
    const bindingType = document.getElementById('bindingType').value;
    const quantity = parseInt(document.getElementById('calendarQuantity').value) || 1;

    const basePricesUSD = { 'desk': 14.40, 'wall': 11.70, 'mini': 6.30, 'photo': 16.20 };
    const sizeAdjustmentsUSD = { '8x10': 0, '12x12': 3.60, '8.5x11': 1.80, '11x17': 5.40 };
    const paperAdjustmentsUSD = { 'glossy': 0, 'matte': 1.80, 'premium': 3.60 };
    const bindingAdjustmentsUSD = { 'spiral': 0, 'wire': 0.90, 'hardcover': 5.40 };

    const basePriceUSD = basePricesUSD[calendarType] || 14.40;
    const optionsPriceUSD = (sizeAdjustmentsUSD[size] || 0) + (paperAdjustmentsUSD[paperType] || 0) + (bindingAdjustmentsUSD[bindingType] || 0);
    const totalUnitPriceUSD = basePriceUSD + optionsPriceUSD;
    const totalPriceUSD = totalUnitPriceUSD * quantity;

    const basePriceEl = document.getElementById('basePrice');
    const optionsPriceEl = document.getElementById('optionsPrice');
    const totalTextEl = document.getElementById('calendarTotalPrice');
    const finalPriceEl = document.getElementById('calendarFinalPrice');

    if(basePriceEl) {
        basePriceEl.setAttribute('data-usd', basePriceUSD.toFixed(2));
        basePriceEl.textContent = formatPrice(basePriceUSD);
    }
    if(optionsPriceEl) {
        optionsPriceEl.setAttribute('data-usd', optionsPriceUSD.toFixed(2));
        optionsPriceEl.textContent = formatPrice(optionsPriceUSD);
    }
    if(totalTextEl) {
        totalTextEl.setAttribute('data-usd', totalPriceUSD.toFixed(2));
        totalTextEl.textContent = formatPrice(totalPriceUSD);
    }
     if(finalPriceEl) {
        finalPriceEl.setAttribute('data-usd', totalPriceUSD.toFixed(2));
        finalPriceEl.textContent = formatPrice(totalPriceUSD);
    }

    return totalUnitPriceUSD;
}

function updateCalendarQuantity(change) {
    const quantityInput = document.getElementById('calendarQuantity');
    let quantity = parseInt(quantityInput.value) || 1;
    quantity = Math.max(1, quantity + change);
    quantityInput.value = quantity;
    updateCalendarPrice();
}

function updateCalendarPreview() {
    updateCalendarPrice();
}

function displayCalendarProducts() {
    const grid = document.getElementById('calendarsProductsGrid');
    if (!grid) return;

    const groupedCalendars = {};
    calendarProducts.forEach(product => {
        if (!groupedCalendars[product.type]) {
            groupedCalendars[product.type] = [];
        }
        groupedCalendars[product.type].push(product);
    });

    let html = '';

    Object.keys(groupedCalendars).forEach(type => {
        const typeName = getCalendarTypeName(type);
        html += `
            <div class="calendar-type-section">
                <h3 data-i18n="calendar_type_${type}" style="margin: 2rem 0 1rem 0; color: var(--text); border-bottom: 2px solid var(--accent); padding-bottom: 0.5rem;">${typeName}</h3>
                <div class="calendar-samples">
        `;

        groupedCalendars[type].forEach(product => {
            const usdPrice = product.priceUSD;
            html += `
                <div class="calendar-product-card">
                    ${product.badge ? `<div class="calendar-badge" data-i18n="badge_${product.badge.toLowerCase()}">${product.badge}</div>` : ''}
                    <div class="calendar-product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Calendar+Image'">
                    </div>
                    <div class="calendar-product-info">
                        <h3 data-i18n="product_cal_${product.id}_name">${product.name}</h3>
                        <div class="calendar-product-type">
                            <span data-i18n="calendar_type_${type}">📅 ${typeName}</span>
                        </div>
                        <p class="calendar-product-desc" data-i18n="product_cal_${product.id}_desc">${product.description}</p>
                        <div class="calendar-features">
                            ${product.features.map(feature => `<span class="feature-tag" data-i18n="feature_${feature.toLowerCase().replace(/ /g, '_')}">${feature}</span>`).join('')}
                        </div>
                        <div class="calendar-product-footer">
                            <span class="calendar-price" data-usd="${usdPrice.toFixed(2)}">${formatPrice(usdPrice)}</span>
                            <button class="calendar-add-btn" onclick="addCalendarProductToCart(${product.id})">
                                <span data-i18n="add_to_cart_btn_icon">🛒</span>
                                <span data-i18n="add_to_cart_btn">Add to Cart</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
    updateAllText();
}

function getCalendarTypeName(type) {
    const typeNames = {
        'desk': 'Desk Calendars',
        'wall': 'Wall Calendars',
        'mini': 'Mini Calendars',
        'photo': 'Photo Calendars'
    };
    return typeNames[type] || 'Calendars';
}

function addCalendarProductToCart(productId) {
    const product = calendarProducts.find(p => p.id === productId);
    if (!product) return;

    const cartItem = {
        id: productId,
        type: 'calendar',
        productType: 'calendar',
        productName: product.name,
        name: product.name,
        image: product.image,
        basePriceUSD: product.priceUSD,
        quantity: 1,
        selected: true,
        sizeMode: 'fill',
        photoCount: 1,
        photos: [{ thumbnail: product.image, name: product.name }]
    };

    addToCart(cartItem);
    showSuccessModal();
}

function addCustomCalendarToCart() {
    if (calendarImages.length === 0) {
        alert('Please upload at least one photo for your calendar.');
        return;
    }

    const calendarType = document.getElementById('calendarType').value;
    const size = document.getElementById('calendarSize').value;
    const paperType = document.getElementById('paperType').value;
    const bindingType = document.getElementById('bindingType').value;
    const startMonth = document.getElementById('startMonth').value;
    const quantity = parseInt(document.getElementById('calendarQuantity').value) || 1;
    const unitPriceUSD = updateCalendarPrice();
    const totalPriceUSD = unitPriceUSD * quantity;

    const cartItem = {
        id: 'custom-calendar-' + Date.now(),
        type: 'custom-calendar',
        productType: 'calendar',
        productName: `Custom ${getCalendarTypeName(calendarType)}`,
        name: `Custom ${getCalendarTypeName(calendarType)} (${size})`,
        displayImage: calendarImages[0]?.src,
        price: formatPrice(totalPriceUSD),
        basePriceUSD: unitPriceUSD,
        size: size,
        paperType: paperType,
        sizeMode: 'fill',
        photoCount: calendarImages.length,
        photos: calendarImages.map(img => ({
            thumbnail: img.src,
            name: img.name
        })),
        quantity: quantity,
        selected: true
    };

    addToCart(cartItem);
    showSuccessModal();
}

function viewCalendarSample(productId) {
    const product = calendarProducts.find(p => p.id === productId);
    if (!product) return;

    alert(`Preview of ${product.name}. In a full implementation, this would show a detailed preview modal.`);
}

function getCalendarBestFor(type) {
    const bestFor = {
        'desk': 'Office desks, home offices',
        'wall': 'Home decoration, kitchens, offices',
        'mini': 'Refrigerators, wallets, small spaces',
        'photo': 'Gifts, family memories, special occasions'
    };
    return bestFor[type] || 'General use';
}

function switchCardsMode(mode) {
    const uploadBtn = document.getElementById('cardsUploadModeBtn');
    const productsBtn = document.getElementById('cardsProductsModeBtn');
    const uploadView = document.getElementById('cardsUploadView');
    const productsView = document.getElementById('cardsProductsView');

    if (mode === 'upload') {
        uploadBtn.classList.add('active');
        productsBtn.classList.remove('active');
        uploadView.style.display = 'block';
        productsView.style.display = 'none';
    } else {
        uploadBtn.classList.remove('active');
        productsBtn.classList.add('active');
        uploadView.style.display = 'none';
        productsView.style.display = 'block';
        displayCardsProducts();
    }
}

function displayCardsProducts() {
    const grid = document.getElementById('cardsProductsGrid');
    if (!grid) return;

    const cardProducts = [
        { id: 201, name: "Standard Photo Card", priceUSD: 2.70, image: "https://i5.walmartimages.com/seo/48-Pack-Photo-Frame-Cards-with-Envelopes-Notecards-for-4x6-Picture-Insert-Ivory_5339c47e-9e2e-4d17-bbcc-46da7d0288fb.88480b050f2d7e488cd5a07e5e90cfb5.jpeg", description: "5x7 inch photo card with envelope" },
        { id: 202, name: "Premium Photo Card", priceUSD: 4.50, image: "https://framkallning.fotocenter.se/templates2/categories/FOLDEDCARDS/mobile_image.png", description: "8x10 inch premium card with matte finish" },
        { id: 203, name: "Folded Greeting Card", priceUSD: 6.30, image: "https://th.bing.com/th/id/OIP.2JQJy-hTVtAdeD9wR7SFZgHaHa?w=188&h=188&c=7&r=0&o=7&pid=1.7&rm=3", description: "Folded card with multiple photo slots" },
        { id: 204, name: "Holiday Card Pack", priceUSD: 10.80, image: "https://th.bing.com/th/id/OIP.qtYORFPfMvfnjzqE2NZ7bQHaHa?w=197&h=197&c=7&r=0&o=7&pid=1.7&rm=3", description: "Pack of 10 holiday-themed cards" }
    ];

    grid.innerHTML = cardProducts.map(product => {
        const usdPrice = product.priceUSD;
        return `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
            </div>
            <div class="product-info">
                <h3 data-i18n="product_card_${product.id}_name">${product.name}</h3>
                <p class="product-desc" data-i18n="product_card_${product.id}_desc">${product.description}</p>
                <div class="product-footer">
                    <span class="price" data-usd="${usdPrice.toFixed(2)}">${formatPrice(usdPrice)}</span>
                    <button class="add-btn" onclick="addToCartProduct(${product.id})">Add to Cart</button>
                </div>
            </div>
        </div>
    `}).join('');
    updateAllText();
}

function adjustCardsBrightness(amount) {
    alert('Card editor would work similarly to photo editor. Full implementation would be similar to adjustBrightness()');
}

function adjustCardsContrast(amount) {
    alert('Card editor function placeholder');
}

function adjustCardsSaturation(amount) {
    alert('Card editor function placeholder');
}

function rotateCardsImage(degrees) {
    alert('Card editor function placeholder');
}

function flipCardsHorizontal() {
    alert('Card editor function placeholder');
}

function flipCardsVertical() {
    alert('Card editor function placeholder');
}

function applyCardsFilter(filter) {
    alert('Card editor function placeholder');
}

function resetCardsImage() {
    alert('Card editor function placeholder');
}

function saveCardsImage() {
    alert('Card editor function placeholder');
}

function downloadCardsImage() {
    alert('Card editor function placeholder');
}

function addCardsToCart() {
    const selectedSize = document.querySelector('input[name="cardsSize"]:checked');
    if (!selectedSize) {
        alert('Please select a card size.');
        return;
    }

    const size = selectedSize.value;
    const priceUSD = getCardPriceForSize(size);

    const cartItem = {
        id: 'card-' + Date.now(),
        type: 'card',
        productType: 'photocards',
        productName: 'Photo Card',
        name: `Photo Card (${size})`,
        image: 'https://via.placeholder.com/200x150?text=Photo+Card',
        price: formatPrice(priceUSD),
        basePriceUSD: priceUSD,
        size: size,
        quantity: 1,
        selected: true,
        sizeMode: 'fill',
        photoCount: 1,
        photos: [{ thumbnail: 'https://via.placeholder.com/200x150?text=Photo+Card', name: 'Photo Card' }]
    };

    addToCart(cartItem);
}

function getCardPriceForSize(size) {
    const prices = {
        '5x7': 2.70,
        '8x10': 4.50,
        'folded': 6.30
    };
    return prices[size] || 2.70;
}

// ============== SEARCH BAR ==============
let lastSearchQuery = localStorage.getItem('lastSearch') || 'canvas prints...';

function initSearchBar() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.placeholder = lastSearchQuery;

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.value.trim();
            if (query) {
                performSearch(query);
            } else {
                navigateTo('shop');
            }
        }
    });

    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.addEventListener('click', function () {
            const query = searchInput.value.trim();
            if (query) {
                performSearch(query);
            }
        });
    }

    console.log('Search bar initialized');
}

function performSearch(query) {
    console.log('Performing search for:', query);

    if (!query) return;

    localStorage.setItem('lastSearch', query);
    document.getElementById('searchInput').placeholder = query;

    navigateTo('shop');

    setTimeout(() => {
        filterProducts(query);
    }, 300);
}

function filterProducts(query) {
    console.log('Filtering products for:', query);

    const shopGrid = document.getElementById('shopProductsGrid');
    if (!shopGrid) {
        console.log('Shop grid not found');
        return;
    }

    if (!shopGrid.hasChildNodes() || shopGrid.children.length === 0) {
        console.log('No products in grid, rendering first...');
        renderShopProducts();
        setTimeout(() => filterProducts(query), 200);
        return;
    }

    const productCards = shopGrid.querySelectorAll('.product-card');
    console.log('Found', productCards.length, 'product cards');

    if (productCards.length === 0) return;

    const searchTerm = query.toLowerCase();
    let matchCount = 0;

    const existingNoResults = shopGrid.querySelector('.no-results-message');
    if (existingNoResults) existingNoResults.remove();

    const searchInfo = document.getElementById('searchResultsInfo');
    const searchText = document.getElementById('searchResultsText');

    if (searchInfo && searchText) {
        searchInfo.style.display = 'flex';
    }

    productCards.forEach(card => {
        const title = card.querySelector('h3, h4')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.product-desc, p')?.textContent.toLowerCase() || '';
        const priceText = card.querySelector('.price')?.textContent.toLowerCase() || '';

        if (title.includes(searchTerm) || desc.includes(searchTerm) || priceText.includes(searchTerm)) {
            card.classList.add('search-highlight');
            card.classList.remove('search-dim');
            matchCount++;
            console.log('Match found:', title);
        } else {
            card.classList.add('search-dim');
            card.classList.remove('search-highlight');
        }
    });

    console.log('Total matches:', matchCount);

    if (searchText) {
        searchText.innerHTML = `Found <span>${matchCount}</span> result${matchCount !== 1 ? 's' : ''} for: <span>"${query}"</span>`;
    }

    if (matchCount === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results-message';
        noResults.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text);">😕 No products found</h3>
                <p>Try searching for: photo cards, calendar, canvas, photo book, mouse pads, double cards</p>
            </div>
        `;
        shopGrid.appendChild(noResults);
    }
}

function clearSearch() {
    console.log('Clearing search');

    const shopGrid = document.getElementById('shopProductsGrid');
    if (!shopGrid) return;

    shopGrid.querySelectorAll('.product-card').forEach(card => {
        card.classList.remove('search-highlight', 'search-dim');
    });

    const noResults = shopGrid.querySelector('.no-results-message');
    if (noResults) noResults.remove();

    const searchInfo = document.getElementById('searchResultsInfo');
    if (searchInfo) {
        searchInfo.style.display = 'none';
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
}

window.performSearch = performSearch;
window.clearSearch = clearSearch;

// ============== ORDER PROCESSING ==============

function generateConditionFile(orderData) {
    let content = `[OutDevice]\n    DeviceName= SP-1500sRGB\n\n`;
    content += `[ImageList]\n    ImageCnt=${orderData.photos.length}\n`;

    orderData.photos.forEach((photo, index) => {
        content += `    ${index + 1}=${index + 1}.jpg\n`;
    });

    orderData.photos.forEach((photo, index) => {
        content += `\n[${index + 1}.jpg]\n`;
        content += `    SizeName=${photo.size || '102C'}\n`;
        content += `    PrintCnt=${photo.quantity || 1}\n`;
        content += `    BackPrint=FILE\n`;
        content += `    BackPrintLine2=${orderData.orderId}\n`;
        content += `    Resize=${photo.resize || 'FITIN'}\n`;
        content += `    DSC_Chk=FALSE\n`;
    });

    return content;
}

function generateEndFile(orderData) {
    return `[Order Complete]
    OrderID=${orderData.orderId}
    Username=${orderData.username}
    OrderCount=${orderData.orderCount}
    TotalPhotos=${orderData.photos.length}
    Timestamp=${new Date().toLocaleString()}
    Status=READY_FOR_PRINT
    `;
}

function generateReceiptFile(orderData) {
    const filenameCount = {};

    let receipt = "=".repeat(60) + "\n";
    receipt += "                    FOTOCENTER ORDER RECEIPT\n";
    receipt += "=".repeat(60) + "\n\n";
    receipt += `Order ID: ${orderData.orderId}\n`;
    receipt += `Customer: ${orderData.username}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Order #: ${orderData.orderCount}\n\n`;

    receipt += "-".repeat(60) + "\n";
    receipt += "Item                          Price    Size       Paper Type\n";
    receipt += "-".repeat(60) + "\n";

    let totalAmount = 0;

    orderData.photos.forEach((photo, index) => {
        let displayName = photo.originalName || `Photo_${index + 1}`;
        if (filenameCount[displayName]) {
            filenameCount[displayName]++;
            const nameParts = displayName.split('.');
            if (nameParts.length > 1) {
                displayName = nameParts[0] + '_' + filenameCount[displayName] + '.' + nameParts[1];
            } else {
                displayName = displayName + '_' + filenameCount[displayName];
            }
        } else {
            filenameCount[displayName] = 1;
        }

        if (displayName.length > 25) {
            displayName = displayName.substring(0, 22) + "...";
        }

        let sizeDisplay = photo.size || '4x6';
        if (photo.isCustom) {
            sizeDisplay = `${photo.customWidth}x${photo.customHeight} ${photo.customUnit}`;
        }

        let paperType = photo.paperType || 'Standard';
        if (paperType === 'glossy') paperType = 'Glossy';
        if (paperType === 'matte') paperType = 'Matte';

        const price = parseFloat(photo.price || 25) * (photo.quantity || 1);
        totalAmount += price;

        const line = `${displayName.padEnd(25)} $${price.toFixed(2).padStart(7)} ${sizeDisplay.padEnd(10)} ${paperType}`;
        receipt += line + "\n";
    });

    receipt += "-".repeat(60) + "\n";
    receipt += `\nTotal Amount: $${totalAmount.toFixed(2)}\n`;
    receipt += `Total Items: ${orderData.photos.length}\n\n`;
    receipt += "=".repeat(60) + "\n";
    receipt += "Thank you for choosing FOTOCENTER!\n";
    receipt += "=".repeat(60) + "\n";

    return receipt;
}

// ============== PDF RECEIPT GENERATION (A4) ==============
function generateReceiptPDF(orderData, returnData) {
    if (typeof window.jspdf === 'undefined') {
        if (!returnData) alert('PDF library not loaded. Please try again.');
        return null;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    var pageWidth = 210;
    var margin = 15;
    var contentWidth = pageWidth - margin * 2;
    var y = margin;

    // Colors
    var accent = [70, 150, 220];
    var dark = [33, 33, 33];
    var gray = [120, 120, 120];
    var lightBg = [245, 245, 245];
    var white = [255, 255, 255];
    var green = [39, 174, 96];

    // Currency
    var lang = window.currentLanguage || { currency: 'USD', symbol: '$', rate: 1 };
    function fmtPrice(usd) {
        return lang.symbol + (usd * (lang.rate || 1)).toFixed(2);
    }

    // ===== SECTION 1: HEADER =====

    // Big FOTOCENTER PH title
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text('FOTOCENTER PH', pageWidth / 2, y + 14, { align: 'center' });
    y += 20;

    // Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('Order Receipt', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Accent line
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Customer info (left) | Order info (right)
    var customerName = localStorage.getItem('userName') || 'Guest';
    var customerEmail = localStorage.getItem('userEmail') || 'N/A';
    var orderDate = new Date(orderData.timestamp);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text('Customer', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, margin, y + 5);
    doc.text(customerEmail, margin, y + 10);
    doc.text('Malolos, Bulacan, Philippines', margin, y + 15);

    // Right side
    var rLabel = pageWidth - margin - 65;
    var rVal = pageWidth - margin;

    doc.setFont('helvetica', 'bold');
    doc.text('Order No:', rLabel, y);
    doc.setFont('helvetica', 'normal');
    doc.text(orderData.orderId, rVal, y, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', rLabel, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(orderDate.toLocaleDateString(), rVal, y + 5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Time:', rLabel, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(orderDate.toLocaleTimeString(), rVal, y + 10, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Currency:', rLabel, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(lang.currency, rVal, y + 15, { align: 'right' });

    y += 23;

    // Delivery method
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text('Delivery:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Digital Delivery', margin + 22, y);
    y += 8;

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // ===== SECTION 2: ITEMS TABLE =====

    var col = {
        num: margin + 1,
        desc: margin + 10,
        size: margin + 78,
        paper: margin + 103,
        qty: margin + 130,
        price: margin + 145,
        tax: margin + 168
    };

    // Header row
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(margin, y - 2, contentWidth, 8, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.text('#', col.num, y + 3);
    doc.text('Description', col.desc, y + 3);
    doc.text('Size', col.size, y + 3);
    doc.text('Paper', col.paper, y + 3);
    doc.text('Qty', col.qty, y + 3);
    doc.text('Price', col.price, y + 3);
    doc.text('Tax', col.tax, y + 3);
    y += 10;

    // Item rows
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    var subtotalUSD = 0;
    var vatRate = 0.12;

    orderData.photos.forEach(function(photo, index) {
        var itemTotal = (photo.price || 0) * (photo.quantity || 1);
        subtotalUSD += itemTotal;

        if (index % 2 === 0) {
            doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
            doc.rect(margin, y - 3, contentWidth, 7, 'F');
        }

        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.text(String(index + 1), col.num, y + 1);

        var desc = photo.productName || photo.originalName || 'Photo ' + (index + 1);
        if (desc.length > 28) desc = desc.substring(0, 25) + '...';
        doc.text(desc, col.desc, y + 1);

        doc.text(photo.size || '4x6', col.size, y + 1);

        var paper = photo.paperType || 'Standard';
        paper = paper.charAt(0).toUpperCase() + paper.slice(1);
        doc.text(paper, col.paper, y + 1);

        doc.text(String(photo.quantity || 1), col.qty + 3, y + 1);
        doc.text(fmtPrice(itemTotal), col.price, y + 1);
        doc.text('12%', col.tax + 2, y + 1);

        y += 7;
    });

    y += 3;

    // Table bottom line
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // ===== SECTION 3: TOTALS & TAX =====

    var vatAmount = subtotalUSD * vatRate;
    var totalWithVat = subtotalUSD + vatAmount;
    var tLabel = pageWidth - margin - 65;
    var tVal = pageWidth - margin;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);

    doc.text('Subtotal (ex. VAT):', tLabel, y);
    doc.text(fmtPrice(subtotalUSD), tVal, y, { align: 'right' });
    y += 6;

    doc.text('VAT Rate:', tLabel, y);
    doc.text('12%', tVal, y, { align: 'right' });
    y += 6;

    doc.text('VAT Amount:', tLabel, y);
    doc.text(fmtPrice(vatAmount), tVal, y, { align: 'right' });
    y += 5;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(tLabel, y, pageWidth - margin, y);
    y += 7;

    // Grand total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text('TOTAL (inc. VAT):', tLabel, y);
    doc.text(fmtPrice(totalWithVat), tVal, y, { align: 'right' });
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Paid:', tLabel, y);
    doc.text(fmtPrice(totalWithVat), tVal, y, { align: 'right' });
    y += 5;

    doc.text('Remaining:', tLabel, y);
    doc.text(fmtPrice(0), tVal, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text('Status: FULLY PAID', tLabel, y);
    y += 14;

    // ===== SECTION 4: PAYMENT INFO =====

    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(margin, y - 2, contentWidth, 32, 2, 2, 'FD');

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text('Payment Information', margin + 5, y);
    y += 7;

    doc.setFontSize(8);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    var pL = margin + 5;
    var pV = margin + 38;

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', pL, y);
    doc.setFont('helvetica', 'normal');
    doc.text(orderDate.toLocaleDateString(), pV, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Time:', pL + 85, y);
    doc.setFont('helvetica', 'normal');
    doc.text(orderDate.toLocaleTimeString(), pL + 98, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Method:', pL, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Online Payment', pV, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Amount:', pL + 85, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtPrice(totalWithVat), pL + 101, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Reference:', pL, y);
    doc.setFont('helvetica', 'normal');
    doc.text(orderData.orderId, pV, y);
    y += 7;

    doc.setTextColor(green[0], green[1], green[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Approved - keep this receipt for your records', pL, y);
    y += 12;

    // ===== SECTION 5: FOOTER =====

    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(255, 249, 246);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text('Return Policy:', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('Digital products are non-refundable. Physical prints may be returned within 14 days if defective.', margin + 4, y + 10);
    doc.text('Contact support for assistance. All returns must be in original packaging.', margin + 4, y + 14);
    y += 26;

    // Company info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text('FOTOCENTER PH', pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('St. Agatha Homes, Malolos, Bulacan, Philippines', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('Phone: (+63) 929 725 2291  |  Email: kyle.baltazar@fotocenter.se', pageWidth / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text('Thank you for choosing FOTOCENTER!', pageWidth / 2, y, { align: 'center' });

    // If returnData flag is set, return base64 string for server upload
    if (returnData) {
        return doc.output('datauristring').split(',')[1];
    }

    // Otherwise download PDF
    doc.save('FOTOCENTER_Receipt_' + orderData.orderId + '.pdf');
}

function generateReceiptPDFData(orderData) {
    try {
        return generateReceiptPDF(orderData, true);
    } catch (e) {
        console.warn('Failed to generate PDF data for server:', e);
        return null;
    }
}

function downloadReceipt() {
    if (!window.lastOrderData) {
        alert('No order data available. Please complete an order first.');
        return;
    }
    generateReceiptPDF(window.lastOrderData);
}

window.downloadReceipt = downloadReceipt;

function getUserOrderCount(username) {
    const key = `orderCount_${username}`;
    let count = parseInt(localStorage.getItem(key) || '0');
    count++;
    localStorage.setItem(key, count.toString());
    return count;
}

function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function copyOrderNumber() {
    const orderMessage = document.getElementById('orderSuccessMessage').innerText;
    const match = orderMessage.match(/Order Number: ([^\n]+)/);
    if (match && match[1]) {
        const orderNumber = match[1].trim();
        navigator.clipboard.writeText(orderNumber).then(() => {
            const copyBtn = document.querySelector('.copy-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Press Ctrl+C to copy the order number');
        });
    }
}

window.copyOrderNumber = copyOrderNumber;

// ============== CART PAGE FUNCTIONS ==============
let activeCartTab = 'all';

function initSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            shoppingCart.forEach(item => {
                item.selected = this.checked;
            });
            updateCartSelection();
            renderCartPage();
        });
    }
}

function initCartTabs() {
    document.querySelectorAll('.cart-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.cart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            activeCartTab = this.getAttribute('data-tab');
            renderCartPage();
        });
    });
}

function getOrdersByStatus(status) {
    const orders = JSON.parse(localStorage.getItem('fotocenterOrders') || '[]');
    return orders.filter(order => order.status === status);
}

function renderOrderCards(orders, statusLabel) {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

    const selectAllBar = document.getElementById('selectAllBar');
    const stickyBottom = document.querySelector('.cart-sticky-bottom');
    if (selectAllBar) selectAllBar.style.display = 'none';
    if (stickyBottom) stickyBottom.style.display = 'none';

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-message">
                <p>No orders in "${statusLabel}"</p>
            </div>
        `;
        updateAllText();
        return;
    }

    container.innerHTML = orders.map(order => {
        const date = new Date(order.timestamp).toLocaleString();
        const totalUSD = order.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const itemsList = order.items.map(item =>
            `<span style="display:block; font-size:0.85rem; color:var(--text-muted);">• ${item.name} (${item.size || 'N/A'}) x${item.quantity || 1} — ${formatPrice(item.price * (item.quantity || 1))}</span>`
        ).join('');

        return `
            <div class="cart-item-card" style="flex-direction:column; align-items:flex-start; gap:0.5rem;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div>
                        <strong style="color:var(--accent);">Order #${order.orderId}</strong>
                        <span style="margin-left:1rem; font-size:0.85rem; color:var(--text-muted);">${date}</span>
                    </div>
                    <span style="background:var(--accent); color:white; padding:2px 10px; border-radius:12px; font-size:0.8rem; text-transform:uppercase;">${order.status}</span>
                </div>
                <div style="width:100%;">${itemsList}</div>
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center; margin-top:0.5rem;">
                    <span style="font-size:0.85rem;">📸 ${order.photoCount} photo(s)</span>
                    <strong data-usd="${totalUSD.toFixed(2)}">${formatPrice(totalUSD)}</strong>
                </div>
            </div>
        `;
    }).join('');
    updateAllText();
    updateAllPrices();
}

function renderCartPage() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

    if (activeCartTab !== 'all') {
        const statusMap = {
            'printing': 'printing',
            'toship': 'toship',
            'completed': 'completed',
            'cancel': 'cancelled'
        };
        const labelMap = {
            'printing': 'Order History',
            'toship': 'To Ship',
            'completed': 'Completed',
            'cancel': 'Cancel/Return'
        };
        const status = statusMap[activeCartTab] || activeCartTab;
        const label = labelMap[activeCartTab] || activeCartTab;
        const orders = getOrdersByStatus(status);
        renderOrderCards(orders, label);
        return;
    }

    if (shoppingCart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-message">
                <p data-i18n="cart_empty">Your cart is empty</p>
                <button onclick="navigateTo('shop')" data-i18n="continue_shopping">Continue Shopping</button>
            </div>
        `;
        const selectAllBar = document.getElementById('selectAllBar');
        const stickyBottom = document.querySelector('.cart-sticky-bottom');
        if (selectAllBar) selectAllBar.style.display = 'none';
        if (stickyBottom) stickyBottom.style.display = 'none';
        document.getElementById('totalCount').textContent = '0';
        document.getElementById('selectedCount').textContent = '0';
        document.getElementById('selectedItemsCount').textContent = '0';
        const totalEl = document.getElementById('cartTotalSelected');
        totalEl.setAttribute('data-usd', '0');
        totalEl.textContent = formatPrice(0);
        updateAllText();
        return;
    }

    const selectAllBar = document.getElementById('selectAllBar');
    const stickyBottom = document.querySelector('.cart-sticky-bottom');
    if (selectAllBar) selectAllBar.style.display = 'flex';
    if (stickyBottom) stickyBottom.style.display = 'flex';
    document.getElementById('totalCount').textContent = shoppingCart.length;

    container.innerHTML = shoppingCart.map((item, index) => {
        const itemPriceUSD = item.basePriceUSD || 0;
        const totalItemPriceUSD = itemPriceUSD * (item.quantity || 1);
        const sizeModeDisplay = item.sizeMode === 'fill' ? 'Fill' : 'Fit';
        const photoCount = item.photoCount || 1;
        const hasMultiplePhotos = photoCount > 1;

        return `
            <div class="cart-item-card" data-index="${index}">
                <div class="cart-item-checkbox">
                    <input type="checkbox" class="item-checkbox" data-index="${index}" ${item.selected ? 'checked' : ''}>
                </div>
                <div class="cart-item-image" onclick="showPhotoPreview(${index})" style="cursor: pointer; position: relative;">
                    <img src="${item.displayImage || item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/100?text=Image'">
                    ${hasMultiplePhotos ? `
                        <div class="cart-item-more-photos" data-i18n="plus_more" data-i18n-count="${photoCount - 1}">
                            +${photoCount - 1} more
                        </div>
                    ` : ''}
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.productName || item.name}</div>
                    <div class="cart-item-specs">
                        ${item.size ? `<span data-i18n="size_label_cart">Size: ${item.size}</span>` : ''}
                        ${item.paperType ? `<span data-i18n="paper_label_cart">Paper: ${item.paperType}</span>` : ''}
                        <span data-i18n="mode_label_cart">Mode: ${sizeModeDisplay}</span>
                        ${hasMultiplePhotos ? `<span>📸 ${photoCount} photos</span>` : ''}
                    </div>
                    <div class="cart-item-price" data-usd="${totalItemPriceUSD.toFixed(2)}">${formatPrice(totalItemPriceUSD)}</div>
                    <div class="cart-item-actions">
                        <div class="cart-item-quantity">
                            <button onclick="updateCartItemQuantityFromCart(${index}, -1)">−</button>
                            <span>${item.quantity || 1}</span>
                            <button onclick="updateCartItemQuantityFromCart(${index}, 1)">+</button>
                        </div>
                        ${item.type === 'photo' ? `<button class="cart-edit-btn" onclick="editCartItem(${index})">✏️ Edit</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const index = this.dataset.index;
            shoppingCart[index].selected = this.checked;
            updateCartSelection();
        });
    });

    shoppingCart.forEach(item => {
        if (item.selected === undefined) item.selected = true;
    });

    updateCartSelection();
    updateAllText();
}

function showPhotoPreview(itemIndex) {
    const item = shoppingCart[itemIndex];

    if (!item || !item.photos || item.photos.length === 0) {
        alert('No photos to preview');
        return;
    }

    let previewModal = document.getElementById('photoPreviewModal');
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'photoPreviewModal';
        previewModal.className = 'modal';
        previewModal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; width: 90%; background: white; border-radius: 12px; padding: 20px;">
                <span class="close-modal" onclick="closePhotoPreview()">&times;</span>
                <h3 style="margin-bottom: 20px; text-align: center;" id="previewModalTitle">Photo Preview</h3>
                
                <div style="position: relative; min-height: 400px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px;">
                    <button onclick="prevPreviewPhoto()" style="position: absolute; left: 10px; background: rgba(0,0,0,0.5); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; z-index: 10;">◀</button>
                    
                    <img id="previewMainImage" src="" alt="Preview" style="max-width: 100%; max-height: 500px; object-fit: contain; border-radius: 4px;">
                    
                    <button onclick="nextPreviewPhoto()" style="position: absolute; right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; z-index: 10;">▶</button>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <span id="previewCounter" style="font-weight: 600; color: var(--accent);">1 / 1</span>
                    <button onclick="closePhotoPreview()" style="background: var(--accent); color: white; border: none; padding: 8px 24px; border-radius: 4px; cursor: pointer; font-weight: 600;">Close</button>
                </div>
                
                <div id="previewThumbnails" style="display: flex; gap: 10px; overflow-x: auto; padding: 10px 0;">
                </div>
            </div>
        `;
        document.body.appendChild(previewModal);
    }

    window.currentPreviewItemIndex = itemIndex;
    window.currentPreviewPhotoIndex = 0;
    window.currentPreviewPhotos = item.photos;

    document.getElementById('previewModalTitle').textContent =
        `${item.productName || 'Photo'} - ${item.photos.length} photos`;

    updatePreviewMainImage();

    const thumbnailsContainer = document.getElementById('previewThumbnails');
    thumbnailsContainer.innerHTML = item.photos.map((photo, idx) => {
        let imgSrc = photo.thumbnail || photo;
        return `
            <div onclick="jumpToPreviewPhoto(${idx})" style="cursor: pointer; border: ${idx === 0 ? '3px solid var(--accent)' : '2px solid transparent'}; border-radius: 4px; overflow: hidden; width: 60px; height: 60px; flex-shrink: 0;">
                <img src="${imgSrc}" alt="Thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        `;
    }).join('');

    previewModal.style.display = 'flex';
}

function updatePreviewMainImage() {
    const photos = window.currentPreviewPhotos;
    const index = window.currentPreviewPhotoIndex;

    if (!photos || photos.length === 0) return;

    const mainImage = document.getElementById('previewMainImage');
    const photo = photos[index];
    let imgSrc = photo.thumbnail || photo;
    mainImage.src = imgSrc;

    document.getElementById('previewCounter').textContent =
        `${index + 1} / ${photos.length}`;

    const thumbnails = document.querySelectorAll('#previewThumbnails div');
    thumbnails.forEach((thumb, idx) => {
        thumb.style.border = idx === index ? '3px solid var(--accent)' : '2px solid transparent';
    });
}

function prevPreviewPhoto() {
    if (window.currentPreviewPhotoIndex > 0) {
        window.currentPreviewPhotoIndex--;
        updatePreviewMainImage();
    }
}

function nextPreviewPhoto() {
    if (window.currentPreviewPhotoIndex < window.currentPreviewPhotos.length - 1) {
        window.currentPreviewPhotoIndex++;
        updatePreviewMainImage();
    }
}

function jumpToPreviewPhoto(index) {
    if (index >= 0 && index < window.currentPreviewPhotos.length) {
        window.currentPreviewPhotoIndex = index;
        updatePreviewMainImage();
    }
}

function closePhotoPreview() {
    const modal = document.getElementById('photoPreviewModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateCartSelection() {
    const selectAll = document.getElementById('selectAllCheckbox');
    const selectedItems = shoppingCart.filter(item => item.selected);
    const selectedCount = selectedItems.length;
    const totalCount = shoppingCart.length;

    document.getElementById('selectedCount').textContent = selectedCount;
    document.getElementById('selectedItemsCount').textContent = selectedCount;

    if (selectAll) {
        if (totalCount > 0) {
            selectAll.checked = selectedCount === totalCount;
            selectAll.indeterminate = selectedCount > 0 && selectedCount < totalCount;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }
    }

    const totalUSD = selectedItems.reduce((total, item) => {
        const itemPriceUSD = item.basePriceUSD || 0;
        return total + (itemPriceUSD * (item.quantity || 1));
    }, 0);

    const totalEl = document.getElementById('cartTotalSelected');
    totalEl.setAttribute('data-usd', totalUSD.toFixed(2));
    totalEl.textContent = formatPrice(totalUSD);
}

function selectAllItems(checked) {
    shoppingCart.forEach(item => {
        item.selected = checked;
    });
    updateCartSelection();
    renderCartPage();
}

function updateCartItemQuantityFromCart(index, change) {
    updateCartItemQuantity(index, change);
    renderCartPage();
    updateCartHover();
}

function deleteSelectedItems() {
    console.log('🗑️ DeleteSelectedItems called');
    const beforeCount = shoppingCart.length;
    shoppingCart = shoppingCart.filter(item => !item.selected);
    const afterCount = shoppingCart.length;
    console.log(`Removed ${beforeCount - afterCount} items`);

    updateCartStorage();
    renderCartPage();
    updateCartUI();
    updateCartHover();
}

async function processOrderFromCart() {
    const selectedItems = shoppingCart.filter(item => item.selected);

    if (selectedItems.length === 0) {
        alert('Please select at least one item to order.');
        return;
    }

    const username = localStorage.getItem('userName') || localStorage.getItem('userEmail')?.split('@')[0] || 'guest';
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (!isLoggedIn) {
        const proceed = confirm('You are not logged in. Continue as guest?');
        if (!proceed) return;
    }

    const multiPhotoTypes = ['calendar', 'photobook', 'doublecards'];

    const photos = [];
    let photoCounter = 1;

    selectedItems.forEach((item, itemIndex) => {
        const productType = item.productType || item.type;
        const isMultiPhoto = multiPhotoTypes.includes(productType);

        if (isMultiPhoto && item.photos && item.photos.length > 0) {
            item.photos.forEach((photo, photoIndex) => {
                let imageData = '';
                if (photo.data) imageData = photo.data;
                else if (photo.thumbnail) imageData = photo.thumbnail;
                else if (typeof photo === 'string') imageData = photo;
                if (imageData && imageData.includes(',')) imageData = imageData.split(',')[1];

                photos.push({
                    originalName: photo.name || `Photo_${photoIndex + 1}.jpg`,
                    filename: `${photoCounter}.jpg`,
                    data: imageData,
                    size: item.size || '4x6',
                    quantity: 1,
                    price: item.basePriceUSD || 0,
                    paperType: item.paperType || 'standard',
                    isCustom: item.isCustom || false,
                    customWidth: item.customDimensions?.width || null,
                    customHeight: item.customDimensions?.height || null,
                    customUnit: item.customDimensions?.unit || 'inches',
                    resize: item.sizeMode || 'FITIN',
                    productType: productType,
                    productName: item.productName
                });
                photoCounter++;
            });
        } else {
            let imageSource = item.displayImage || item.image || '';
            if (!imageSource && item.photos && item.photos[0]) {
                const firstPhoto = item.photos[0];
                imageSource = firstPhoto.data || firstPhoto.thumbnail || firstPhoto;
            }
            let imageData = '';
            if (imageSource && typeof imageSource === 'string') {
                imageData = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;
            }

            photos.push({
                originalName: item.originalName || item.name || `item_${itemIndex + 1}.jpg`,
                filename: `${photoCounter}.jpg`,
                data: imageData,
                size: item.size || '4x6',
                quantity: item.quantity || 1,
                price: item.basePriceUSD || 0,
                paperType: item.paperType || 'standard',
                isCustom: item.isCustom || false,
                customWidth: item.customDimensions?.width || null,
                customHeight: item.customDimensions?.height || null,
                customUnit: item.customDimensions?.unit || 'inches',
                resize: item.sizeMode || 'FITIN',
                productType: item.productType || item.type,
                productName: item.productName || item.name
            });
            photoCounter++;
        }
    });

    const orderData = {
        orderId: generateOrderId(),
        username: username,
        orderCount: getUserOrderCount(username),
        photos: photos,
        timestamp: new Date().toISOString()
    };

    const btn = document.getElementById('completeOrderBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processing Order...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderData.orderId,
                username: orderData.username,
                orderCount: orderData.orderCount,
                photos: orderData.photos,
                conditionFile: generateConditionFile(orderData),
                endFile: generateEndFile(orderData),
                receiptFile: generateReceiptFile(orderData),
                receiptPDF: generateReceiptPDFData(orderData)
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Server error');

        // Save order to localStorage for Printing tab
        const completedOrders = JSON.parse(localStorage.getItem('fotocenterOrders') || '[]');
        completedOrders.push({
            orderId: orderData.orderId,
            username: orderData.username,
            photoCount: photos.length,
            items: selectedItems.map(item => ({
                name: item.productName || item.name,
                size: item.size,
                quantity: item.quantity || 1,
                price: item.basePriceUSD || 0
            })),
            timestamp: orderData.timestamp,
            status: 'printing'
        });
        localStorage.setItem('fotocenterOrders', JSON.stringify(completedOrders));

        shoppingCart = shoppingCart.filter(item => !item.selected);
        updateCartStorage();

        // Store order data for PDF receipt download
        window.lastOrderData = orderData;

        const message = `✅ Thank you for purchasing at FOTOCENTER PH!\n\nYour Order Number: ${orderData.orderId} <button class="copy-btn" onclick="copyOrderNumber()" style="background:none; border:none; cursor:pointer; font-size:1.2rem; margin-left:5px;" title="Copy order number">📋</button>\n\nTotal Photos: ${photos.length}\n\nPlease copy and save your Order Number.\nYou can track your order status in Cart → Printing tab.\n\nThank you for choosing FOTOCENTER!`;
        document.getElementById('orderSuccessMessage').innerHTML = message;
        document.getElementById('orderSuccessModal').style.display = 'flex';

        renderCartPage();
        updateCartUI();
        updateCartHover();

    } catch (error) {
        console.error('Order failed:', error);
        alert('❌ Order failed: ' + (error.message || 'Unknown error'));
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ============== CART HOVER DROPDOWN ==============
function initCartHover() {
    const cartWrapper = document.querySelector('.cart-hover-wrapper');
    if (cartWrapper) {
        cartWrapper.addEventListener('mouseenter', function () {
            updateCartHover();
        });
    }
}

function updateCartHover() {
    const dropdown = document.getElementById('cartHoverDropdown');
    if (!dropdown) return;

    if (shoppingCart.length === 0) {
        dropdown.innerHTML = '<div class="cart-hover-empty" data-i18n="cart_empty">Your cart is empty</div>';
        updateAllText();
        return;
    }

    let itemsHtml = `<div class="cart-hover-header"><span data-i18n="shopping_cart">Shopping Cart</span><button class="cart-hover-view-cart" onclick="navigateTo('cart-page')" data-i18n="view_cart">VIEW CART</button></div>`;
    itemsHtml += '<div class="cart-hover-items">';

    shoppingCart.slice(0, 3).forEach((item, index) => {
        const itemPriceUSD = item.basePriceUSD || 0;
        const totalItemPriceUSD = itemPriceUSD * (item.quantity || 1);
        itemsHtml += `
            <div class="cart-hover-item">
                <div class="cart-hover-item-image">
                    <img src="${item.displayImage || item.image}" alt="${item.name}">
                </div>
                <div class="cart-hover-item-details">
                    <div class="cart-hover-item-name">${item.productName || item.name} ${item.photoCount > 1 ? `(${item.photoCount} photos)` : ''}</div>
                    <div class="cart-hover-item-price" data-usd="${totalItemPriceUSD.toFixed(2)}">${formatPrice(totalItemPriceUSD)}</div>
                </div>
            </div>
        `;
    });

    if (shoppingCart.length > 3) {
        itemsHtml += `<div class="cart-hover-more" data-i18n="and_n_more_items" data-i18n-count="${shoppingCart.length - 3}">and ${shoppingCart.length - 3} more items</div>`;
    }

    itemsHtml += '</div>';

    const subtotalUSD = calculateCartTotal();
    itemsHtml += `
        <div class="cart-hover-footer">
            <div class="cart-hover-subtotal">
                <span data-i18n="subtotal">Subtotal:</span>
                <span data-usd="${subtotalUSD.toFixed(2)}">${formatPrice(subtotalUSD)}</span>
            </div>
            <button class="cart-hover-checkout" onclick="navigateTo('cart-page')" data-i18n="view_cart_btn">VIEW CART</button>
        </div>
    `;

    dropdown.innerHTML = itemsHtml;
    updateAllText();
}

function forceCartUpdate() {
    updateCartUI();
    updateCartHover();
    if (document.getElementById('cart-page')?.classList.contains('active')) {
        renderCartPage();
    }
}

// ============== HAMBURGER MENU ==============
function setupHamburgerMenu() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const hamburgerIcon = document.querySelector('.hamburger-icon');
    const hamburgerDropdown = document.getElementById('hamburgerDropdown');

    if (!hamburgerMenu || !hamburgerIcon || !hamburgerDropdown) return;

    hamburgerIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        hamburgerMenu.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
        if (!hamburgerMenu.contains(e.target)) {
            hamburgerMenu.classList.remove('open');
        }
    });

    let timeoutId;

    hamburgerDropdown.addEventListener('mouseenter', function () {
        clearTimeout(timeoutId);
    });

    hamburgerDropdown.addEventListener('mouseleave', function () {
        timeoutId = setTimeout(() => {
            hamburgerMenu.classList.remove('open');
        }, 300);
    });

    const menuItems = hamburgerDropdown.querySelectorAll('.dropdown-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            hamburgerMenu.classList.remove('open');
        });
    });

    console.log('✅ Hamburger menu initialized with 3 items (Editor, Shop, Info)');
}

// ============== SIMPLE WORKING FIXES ==============
function setupSimpleHamburger() {
    const menu = document.getElementById('hamburgerMenu');
    const icon = document.querySelector('.hamburger-icon');

    if (icon) {
        icon.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            menu.classList.toggle('open');
        };

        document.addEventListener('click', function (e) {
            if (!menu.contains(e.target)) {
                menu.classList.remove('open');
            }
        });
    }
}

function makeSlidesClickable() {
    const slides = document.querySelectorAll('.slide-card');
    const products = ['photocards', 'calendar', 'photobook', 'canvas', 'mousepads', 'doublecards'];

    slides.forEach((slide, i) => {
        slide.onclick = function (e) {
            e.preventDefault();
            navigateTo('product-page');
            setTimeout(() => {
                if (typeof loadProductDetails === 'function') {
                    loadProductDetails(products[i % products.length]);
                }
            }, 100);
        };
        slide.style.cursor = 'pointer';
    });
}

(function fixOpenInEditor() {
    console.log('🔧 Setting up Open in Editor button...');

    function attachEditorListener() {
        const editorBtn = document.getElementById('openEditorBtn');

        if (editorBtn) {
            console.log('✅ Found Open in Editor button');

            const newBtn = editorBtn.cloneNode(true);
            editorBtn.parentNode.replaceChild(newBtn, editorBtn);

            newBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                console.log('🎯 OPEN IN EDITOR CLICKED!');

                const productType = this.getAttribute('data-product') || 'photocards';
                console.log('📦 Product type:', productType);

                // Flag to prevent navigateTo('photos') from showing a duplicate welcome popup
                window._editorWelcomeShownByButton = true;

                navigateTo('photos');

                // Delay selectProduct to run AFTER switchPhotoMode (50ms) completes,
                // ensuring the photos page UI is fully ready before updating print options
                setTimeout(() => {
                    console.log('📸 Photos page ready, selecting product...');
                    if (typeof selectProduct === 'function') {
                        selectProduct(productType);
                        console.log('✅ selectProduct called with:', productType);
                    }
                    showEditorWelcome(productType);
                }, 150);

                return false;
            });


            console.log('✅ Open in Editor button is now working!');
            return true;
        }
        return false;
    }

    if (!attachEditorListener()) {
        console.log('⏳ Waiting for Open in Editor button...');
        const observer = new MutationObserver(function (mutations) {
            if (document.getElementById('openEditorBtn')) {
                if (attachEditorListener()) {
                    observer.disconnect();
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(attachEditorListener, 2000);
    }
})();

// ============== EDITOR WELCOME POPUP ==============
function showEditorWelcome(productType) {
    const popup = document.getElementById('editorWelcomePopup');
    if (!popup) {
        console.error('Editor welcome popup not found');
        return;
    }

    const productNames = {
        'photocards': 'Photo Cards',
        'calendar': 'Calendar',
        'photobook': 'Photo Book',
        'canvas': 'Canvas',
        'mousepads': 'Mouse Pads',
        'doublecards': 'Double Cards'
    };

    const nameEl = document.getElementById('welcomeProductName');
    if (nameEl) {
        nameEl.textContent = productNames[productType] || 'Photo Cards';
    }

    popup.style.display = 'flex';

    // Prevent backdrop click from closing - only X button or "Got it" button should close
    if (!popup._backdropBlocked) {
        popup.addEventListener('click', function (e) {
            if (e.target === popup) {
                e.stopPropagation();
            }
        });
        popup._backdropBlocked = true;
    }
}

function closeEditorWelcome() {
    const popup = document.getElementById('editorWelcomePopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

(function setupEditorWelcome() {
    console.log('🔧 Setting up editor welcome popup...');
    console.log('✅ Editor welcome popup ready (triggered via navigateTo)');
})();

// ============== ULTIMATE DROPDOWN FIX ==============
(function ultimateDropdownFix() {
    console.log('🔧 Applying ultimate dropdown fix...');

    function fixDropdown() {
        const btn = document.getElementById('productDropdownBtn');
        const menu = document.getElementById('productDropdownMenu');

        if (btn && menu) {
            console.log('✅ Found dropdown elements, attaching handler...');

            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                menu.classList.toggle('show');
                console.log('Dropdown toggled:', menu.classList.contains('show'));
                return false;
            };

            document.addEventListener('click', function (e) {
                if (!menu.contains(e.target) && !newBtn.contains(e.target)) {
                    menu.classList.remove('show');
                }
            });

            return true;
        }
        return false;
    }

    let attempts = 0;
    const interval = setInterval(function () {
        attempts++;
        if (fixDropdown() || attempts > 10) {
            clearInterval(interval);
            console.log('✅ Dropdown fix completed after', attempts, 'attempts');
        }
    }, 500);
})();

// ============== GLOBAL FUNCTIONS ==============
// Ensure openProductPage exists to avoid ReferenceError when other scripts call it
function openProductPage(productTypeOrId) {
    // If a numeric id is provided, open the product-detail page and show that product
    if (typeof productTypeOrId === 'number') {
        navigateTo('product-detail');
        if (typeof showProductDetail === 'function') {
            showProductDetail(productTypeOrId);
        }
        return;
    }

    // If a product type string is provided, load product page details
    if (typeof productTypeOrId === 'string') {
        navigateTo('product-page');
        if (typeof loadProductDetails === 'function') {
            loadProductDetails(productTypeOrId);
        }
        return;
    }

    // Default behavior: open product listing page
    navigateTo('product-page');
}

// Generic close for any welcome modal variants used in the UI
function closeWelcomePopup() {
    const popupIds = ['welcomePopup', 'editorWelcomePopup'];
    for (const id of popupIds) {
        const el = document.getElementById(id);
        if (el && el.style.display === 'flex') {
            el.style.display = 'none';
        }
    }
}
window.showEditorWelcome = showEditorWelcome;
window.closeEditorWelcome = closeEditorWelcome;
window.prevSlide = function () { if (window.slideshow) window.slideshow.prevSlide(); };
window.nextSlide = function () { if (window.slideshow) window.slideshow.nextSlide(); };
window.goToSlide = function (i) { if (window.slideshow) window.slideshow.goToSlide(i); };
window.toggleSlideshowPause = function () { if (window.slideshow) window.slideshow.togglePause(); };
window.openProductPage = openProductPage;
window.closeWelcomePopup = closeWelcomePopup;
window.renderCartPage = renderCartPage;
window.updateCartItemQuantityFromCart = updateCartItemQuantityFromCart;
window.processOrderFromCart = processOrderFromCart;
window.deleteSelectedItems = deleteSelectedItems;
window.forceCartUpdate = forceCartUpdate;
window.updateCartHover = updateCartHover;
window.selectAllItems = selectAllItems;
window.showPhotoPreview = showPhotoPreview;
window.closePhotoPreview = closePhotoPreview;
window.prevPreviewPhoto = prevPreviewPhoto;
window.nextPreviewPhoto = nextPreviewPhoto;
window.jumpToPreviewPhoto = jumpToPreviewPhoto;
window.updateQuantity = updateQuantity;
window.calculatePrice = calculatePrice;
window.onSizeSelect = onSizeSelect;
window.changeUnit = changeUnit;
window.editCartItem = editCartItem;

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 DOM Content Loaded - Initializing...');

    // Initialize language dropdown
    if (typeof initLanguageDropdown === 'function') {
        initLanguageDropdown();
    }

    // Initialize existing functions
    if (typeof displayHomeProducts === 'function') displayHomeProducts();
    if (typeof setupPhotoEditor === 'function') setupPhotoEditor();
    if (typeof setupNavHighlight === 'function') setupNavHighlight();
    if (typeof setupDragAndDrop === 'function') setupDragAndDrop();
    if (typeof setupEventListeners === 'function') setupEventListeners();
    if (typeof initPhotoMode === 'function') initPhotoMode();
    if (typeof updateLoginStatus === 'function') updateLoginStatus();
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof setupFaqScroll === 'function') setupFaqScroll();
    if (typeof setupChatKeyboard === 'function') setupChatKeyboard();
    if (typeof setupDropdownMenu === 'function') setupDropdownMenu();

    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.onclick = function (e) {
            e.preventDefault();
            navigateTo('cart-page');
        };
    }

    if (typeof renderShopProducts === 'function') renderShopProducts();
    if (typeof renderReviews === 'function') renderReviews();
    if (typeof updateCartBadgeOnLoad === 'function') updateCartBadgeOnLoad();
    if (typeof loadChatHistory === 'function') loadChatHistory();
    if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();

    setTimeout(() => {
        if (typeof selectProduct === 'function') selectProduct('photocards');
    }, 500);

    if (typeof initPrintOptions === 'function') initPrintOptions();
    if (typeof initCartHover === 'function') initCartHover();
    if (typeof initSelectAll === 'function') initSelectAll();
    if (typeof initCartTabs === 'function') initCartTabs();
    if (typeof initSearchBar === 'function') initSearchBar();

    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        deleteBtn.onclick = null;
        deleteBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('🗑️ Delete Selected button clicked');
            if (typeof deleteSelectedItems === 'function') deleteSelectedItems();
        });
    }

    // Initialize slideshow
    setTimeout(() => {
        if (typeof Slideshow === 'function' && !window.slideshowInitialized) {
            window.slideshow = new Slideshow();
            window.slideshowInitialized = true;
            console.log('✅ Slideshow initialized');
        }
    }, 500);

    // Initialize hamburger menu
    if (typeof setupHamburgerMenu === 'function') setupHamburgerMenu();

    // Make slides clickable
    setTimeout(() => {
        if (typeof makeSlidesClickable === 'function') makeSlidesClickable();
    }, 1000);

    // Initialize chat backend
    initChatBackend();

    console.log('✅ All initializations complete!');
});
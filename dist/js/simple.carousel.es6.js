/*!
 * simple.carousel.es6.js
 * Autor: Honza Mudrak
 */
class SimpleCarousel {
    constructor(element, options = {}) {
        // Přidání třídy js-enabled pouze jednou pro podporu starších prohlížečů
        if (document.documentElement.className.indexOf('simple-carousel-js') === -1) {
            document.documentElement.className += ' simple-carousel-js';
        }

        this.element = typeof element === "string" ? document.querySelector(element) : element;
        this.settings = {
            interval: 3000,
            theme: "default",
            generateIndicators: true,
            indicatorSize: '10px',
            indicatorActiveColor: '#222',
            indicatorInactiveColor: '#ccc',
            enableLogging: false,
            lazyLoad: true,
            prefetchItems: 1,
            startIndex: 0,
            enableAnalytics: false,
            onSlideChange: null,
            ...options
        };

        // Převzetí hodnot z data atributů, pokud jsou definovány
        this.settings.theme = this.element.dataset.theme || this.settings.theme;
        this.settings.interval = parseInt(this.element.dataset.interval) || this.settings.interval;
        this.settings.generateIndicators = this.element.dataset.generateIndicators !== undefined
            ? this.element.dataset.generateIndicators === "true"
            : this.settings.generateIndicators;
        this.settings.enableLogging = this.element.dataset.enableLogging !== undefined
            ? this.element.dataset.enableLogging === "true"
            : this.settings.enableLogging;
        this.settings.startIndex = parseInt(this.element.dataset.startIndex) || this.settings.startIndex;
        this.settings.enableAnalytics = this.element.dataset.enableAnalytics !== undefined
            ? this.element.dataset.enableAnalytics === "true"
            : this.settings.enableAnalytics;

        // Přidání třídy pro téma
        const themeClass = `simple-carousel-theme-${this.settings.theme}`;
        this.element.classList.add(themeClass);

        this.currentIndex = parseInt(this.settings.startIndex);
        this.isVideoPlaying = false;
        this.timer = null;

        this.init();
    }

    log(message, data) {
        if (this.settings.enableLogging) {
            const timestamp = new Date().toLocaleTimeString();
            if (data) {
                console.log(`[${timestamp}] ${message}`, data);
            } else {
                console.log(`[${timestamp}] ${message}`);
            }
        }
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    init() {
        this.setup();
    }

    setup() {
        const carouselID = this.generateUniqueId('simpleCarousel');
        this.element.id = carouselID;
        this.items = this.element.querySelectorAll('.simpleCarouselItem');
        this.totalItems = this.items.length;

        if (this.totalItems <= 1) {
            this.log("Karusel obsahuje jednu nebo méně položek, nebude inicializován.");
            return;
        }

        this.element.setAttribute('aria-live', 'polite');
        this.element.setAttribute('role', 'region');
        this.element.setAttribute('aria-label', 'Carousel with dynamic content');

        this.items.forEach((item, index) => {
            item.setAttribute('aria-hidden', index === this.currentIndex ? 'false' : 'true');
            item.setAttribute('id', `carousel-item-${carouselID}-${index}`);
        });

        if (this.settings.generateIndicators) {
            this.generateIndicators();
        }

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.log("Karusel je viditelný, spouštím animaci.");
                        if (!this.isVideoPlaying) {
                            this.startCarousel();
                        }
                    } else {
                        this.log("Karusel není viditelný, zastavuji animaci.");
                        this.stopCarousel();
                    }
                });
            }, {
                threshold: 0.5
            });

            observer.observe(this.element);
            this.log("Intersection Observer byl inicializován.");
        } else {
            this.startCarousel();
            this.log("Intersection Observer není podporován, karusel spuštěn bez něj.");
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.log("Záložka není viditelná, pozastavuji karusel.");
                this.stopCarousel();
            } else if (!this.isVideoPlaying) {
                this.log("Záložka je znovu viditelná, spouštím karusel.");
                this.startCarousel();
            }
        });

        this.loadLazyContent(this.items[this.currentIndex]);
        this.items[this.currentIndex].style.display = "block";
        this.prefetchItems();

        this.element.addEventListener('mouseenter', this.debounce(() => this.stopCarousel(), 200));
        this.element.addEventListener('mouseleave', this.debounce(() => {
            if (!this.isVideoPlaying) this.startCarousel();
        }, 200));

        if (this.indicators) {
            this.indicators.forEach(indicator => {
                indicator.addEventListener('click', () => {

                    if (this.isVideoPlaying) return; // Pokud hraje video, indikátor nemá fungovat

                    this.stopCarousel();
                    const index = parseInt(indicator.getAttribute('data-index'));
                    if (index !== this.currentIndex) {
                        this.showItem(index);
                    }
                });
            });
        }

        this.addTouchSupport();
    }

    startCarousel() {
        this.stopCarousel();
        this.timer = setInterval(() => this.fadeToNext(), this.settings.interval);
        this.log("Karusel byl spuštěn, interval: " + this.settings.interval + " ms.");
    }

    stopCarousel() {
        if (this.timer) {
            clearInterval(this.timer);
            this.log("Karusel byl zastaven.");
        }
    }

    fadeToNext() {
        if (this.isVideoPlaying) return;
        const nextIndex = (this.currentIndex + 1) % this.totalItems;
        this.showItem(nextIndex);
    }

    fadeToIndex(index) {
        if (this.isVideoPlaying) {
            this.stopVideo();
        }
        this.showItem(index);
    }

    showItem(index) {
        if (this.settings.onSlideChange) {
            this.settings.onSlideChange(this.currentIndex, index);
        }

        if (this.settings.enableAnalytics) {
            this.trackSlideChange(this.currentIndex, index);
        }

        const currentItem = this.items[this.currentIndex];
        const nextItem = this.items[index];

        currentItem.style.display = "none";
        currentItem.setAttribute('aria-hidden', 'true');

        nextItem.style.display = "block";
        nextItem.setAttribute('aria-hidden', 'false');

        this.loadLazyContent(nextItem);
        this.setIndicator(index);

        this.currentIndex = index;
        this.prefetchItems();
    }

    generateIndicators() {
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'simpleCarouselAriaIndicators';

        this.indicators = [];
        for (let i = 0; i < this.totalItems; i++) {
            const indicator = document.createElement('span');
            indicator.className = 'simpleCarouselAriaIndicator';
            indicator.setAttribute('data-index', i);
            indicator.setAttribute('aria-controls', `carousel-item-${this.element.id}-${i}`);
            indicator.setAttribute('aria-label', `Slide ${i + 1}`);
            indicator.style.width = this.settings.indicatorSize;
            indicator.style.height = this.settings.indicatorSize;
            indicator.style.background = this.settings.indicatorInactiveColor;

            indicatorsContainer.appendChild(indicator);
            this.indicators.push(indicator);
        }

        this.element.appendChild(indicatorsContainer);
        this.setIndicator(this.currentIndex);
    }

    setIndicator(index) {
        if (!this.indicators) return;

        this.indicators.forEach((indicator, i) => {
            if (i === index) {
                indicator.style.background = this.settings.indicatorActiveColor;
                indicator.style.transform = 'scale(1.2)';
                if (this.settings.enableAnalytics) {
                    this.trackIndicatorClick(index);
                }
            } else {
                indicator.style.background = this.settings.indicatorInactiveColor;
                indicator.style.transform = 'scale(1.0)';
            }
        });
    }

    loadLazyContent(item) {
        const images = item.querySelectorAll('img[data-src]');
        images.forEach(img => {
            if (!img.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                this.log("Obrázek načten:", img.src);
            }
        });

        const videoPlaceholder = item.querySelector('.simpleCarouselItemVideo[data-video-src]');
        if (videoPlaceholder) {
            const videoSrc = videoPlaceholder.dataset.videoSrc;
            const poster = videoPlaceholder.dataset.poster;

            if (poster) {
                videoPlaceholder.style.backgroundImage = `url(${poster})`;
            }

            if (!videoPlaceholder.querySelector('.simpleCarouselItemVideoPlayIcon')) {
                const playIcon = document.createElement('div');
                playIcon.className = 'simpleCarouselItemVideoPlayIcon';
                playIcon.textContent = '▶';
                videoPlaceholder.appendChild(playIcon);
            }

            // Přidání klikací logiky pro placeholder
            videoPlaceholder.addEventListener('click', () => {
                this.stopCarousel();
                this.isVideoPlaying = true;

                if (this.settings.enableAnalytics) {
                    this.trackVideoPlay(this.currentIndex, videoSrc);
                }

                if (videoSrc) {
                    const video = document.createElement('video');
                    video.className = 'simpleCarouselVideo';
                    video.controls = true;
                    video.poster = poster;
                    video.disablePictureInPicture = true;
                    video.controlsList = "nodownload nofullscreen";

                    const source = document.createElement('source');
                    source.src = videoSrc;
                    source.type = 'video/mp4';
                    video.appendChild(source);

                    videoPlaceholder.replaceWith(video);

                    video.load();
                    video.play().catch(error => {
                        this.log("Chyba při přehrávání videa:", error);
                    });

                    video.classList.add('simpleCarouselVideoPlaying');
                    this.addCustomVideoControls(video);

                    video.addEventListener('ended', () => {
                        this.isVideoPlaying = false;
                        video.classList.remove('simpleCarouselVideoPlaying');

                        // Vytvoření nového placeholderu
                        const newPlaceholder = document.createElement('div');
                        newPlaceholder.className = 'simpleCarouselItemVideo';
                        newPlaceholder.dataset.videoSrc = videoSrc;
                        newPlaceholder.dataset.poster = poster;

                        if (poster) {
                            newPlaceholder.style.backgroundImage = `url(${poster})`;
                        }

                        const newPlayIcon = document.createElement('div');
                        newPlayIcon.className = 'simpleCarouselItemVideoPlayIcon';
                        newPlayIcon.textContent = '▶';
                        newPlaceholder.appendChild(newPlayIcon);

                        video.replaceWith(newPlaceholder);

                        // Znovu připojení události click k novému placeholderu
                        this.loadLazyContent(item);

                        // Restartování karuselu
                        this.startCarousel();
                    });
                }
            });
        }
    }

    addCustomVideoControls(video) {

        const pauseButton = document.createElement('button');
        pauseButton.className = 'video-pause';
        pauseButton.textContent = 'Pauza';

        if (video.parentNode) {
            video.parentNode.insertBefore(pauseButton, video.nextSibling);
        }

        pauseButton.style.display = 'block';

        pauseButton.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                pauseButton.textContent = 'Pauza';
            } else {
                video.pause();
                pauseButton.textContent = 'Spustit';
            }
        });

        video.addEventListener('ended', () => {
            pauseButton.remove();
        });
    }

    addTouchSupport() {
        let startX = 0;
        let startY = 0;
        let isSwiping = false;

        this.element.addEventListener('touchstart', (e) => {
            if (this.isVideoPlaying) {
                // Pokud hraje video, nepokračujeme v přechodu mezi snímky
                return;
            }
            const touch = e.touches[0];
            startX = touch.pageX;
            startY = touch.pageY;
            isSwiping = true;
        });

        this.element.addEventListener('touchmove', (e) => {
            if (!isSwiping || this.isVideoPlaying) return;

            const touch = e.touches[0];
            const diffX = touch.pageX - startX;
            const diffY = touch.pageY - startY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                e.preventDefault(); // Zabráníme posouvání stránky

                if (diffX > 50) {
                    // Přejetí doprava
                    this.fadeToIndex((this.currentIndex - 1 + this.totalItems) % this.totalItems);
                    isSwiping = false;
                } else if (diffX < -50) {
                    // Přejetí doleva
                    this.fadeToIndex((this.currentIndex + 1) % this.totalItems);
                    isSwiping = false;
                }
            }
        });

        this.element.addEventListener('touchend', () => {
            isSwiping = false;
        });
    }

    prefetchItems() {
        for (let i = 1; i <= this.settings.prefetchItems; i++) {
            const nextIndex = (this.currentIndex + i) % this.totalItems;
            const prevIndex = (this.currentIndex - i + this.totalItems) % this.totalItems;
            this.loadLazyContent(this.items[nextIndex]);
            this.loadLazyContent(this.items[prevIndex]);
        }
        this.log(`Předběžně načtené snímky kolem indexu ${this.currentIndex}`);
    }

    generateUniqueId(prefix) {
        return prefix + '-' + Math.floor(Math.random() * 100000);
    }

    trackSlideChange(currentIndex, nextIndex) {
        if (typeof gtag === 'function') {
            gtag('event', 'carousel_slide_change', {
                'event_category': 'Carousel',
                'event_label': 'Slide Change',
                'value': nextIndex
            });
            this.log(`Google Analytics: Sledování přechodu na snímek ${nextIndex}`);
        }
    }

    trackIndicatorClick(clickedIndex) {
        if (typeof gtag === 'function') {
            gtag('event', 'carousel_indicator_click', {
                'event_category': 'Carousel',
                'event_label': 'Indicator Click',
                'value': clickedIndex
            });
            this.log(`Google Analytics: Sledování kliknutí na indikátor ${clickedIndex}`);
        }
    }

    trackVideoPlay(videoIndex, videoSrc) {
        if (typeof gtag === 'function') {
            gtag('event', 'carousel_video_play', {
                'event_category': 'Carousel',
                'event_label': 'Video Play',
                'value': videoIndex,
                'video_src': videoSrc
            });
            this.log(`Google Analytics: Sledování spuštění videa na snímku ${videoIndex} (URL: ${videoSrc})`);
        }
    }
}

export default SimpleCarousel;
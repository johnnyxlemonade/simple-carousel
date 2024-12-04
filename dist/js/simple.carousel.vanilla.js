/*!
 * simple.carousel.es6.js
 * Autor: Honza Mudrak
 */
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.simpleCarousel = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {

    // Přidání třídy js-enabled pouze jednou pro podporu starších prohlížečů
    if (document.documentElement.className.indexOf('simple-carousel-js') === -1) {
        document.documentElement.className += ' simple-carousel-js';
    }
    function generateUniqueId(prefix) {
        return prefix + '-' + Math.floor(Math.random() * 100000);
    }
    function log(enableLogging, message, data) {
        if (enableLogging) {
            var timestamp = new Date().toLocaleTimeString();
            if (data) {
                console.log(`[${timestamp}] ${message}`, data);
            } else {
                console.log(`[${timestamp}] ${message}`);
            }
        }
    }
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function SimpleCarousel(element, options) {
        this.element = typeof element === "string" ? document.querySelector(element) : element;
        this.settings = Object.assign({
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
            onSlideChange: null
        }, options);

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

    SimpleCarousel.prototype.init = function () {
        this.setup();
    };

    SimpleCarousel.prototype.setup = function () {
        var carouselID = generateUniqueId('simpleCarousel');
        this.element.id = carouselID;
        this.items = this.element.querySelectorAll('.simpleCarouselItem');
        this.totalItems = this.items.length;

        if (this.totalItems <= 1) {
            log(this.settings.enableLogging, "Karusel obsahuje jednu nebo méně položek, nebude inicializován.");
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
            var observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        log(this.settings.enableLogging, "Karusel je viditelný, spouštím animaci.");
                        if (!this.isVideoPlaying) {
                            this.startCarousel();
                        }
                    } else {
                        log(this.settings.enableLogging, "Karusel není viditelný, zastavuji animaci.");
                        this.stopCarousel();
                    }
                });
            }, {
                threshold: 0.5
            });

            observer.observe(this.element);
            log(this.settings.enableLogging, "Intersection Observer byl inicializován.");
        } else {
            this.startCarousel();
            log(this.settings.enableLogging, "Intersection Observer není podporován, karusel spuštěn bez něj.");
        }

        // Použití Page Visibility API
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                log(this.settings.enableLogging, "Záložka není viditelná, pozastavuji karusel.");
                this.stopCarousel();
            } else if (!this.isVideoPlaying) {
                log(this.settings.enableLogging, "Záložka je znovu viditelná, spouštím karusel.");
                this.startCarousel();
            }
        });

        this.loadLazyContent(this.items[this.currentIndex]);
        this.items[this.currentIndex].style.display = "block";
        this.prefetchItems();

        this.element.addEventListener('mouseenter', debounce(() => this.stopCarousel(), 200));
        this.element.addEventListener('mouseleave', debounce(() => {
            if (!this.isVideoPlaying) this.startCarousel();
        }, 200));

        if (this.indicators) {
            this.indicators.forEach(indicator => {
                indicator.addEventListener('click', () => {
                    this.stopCarousel();
                    var index = parseInt(indicator.getAttribute('data-index'));
                    if (index !== this.currentIndex) {
                        this.showItem(index);
                    }
                });
            });
        }
    };

    SimpleCarousel.prototype.startCarousel = function () {
        this.stopCarousel();
        this.timer = setInterval(() => this.fadeToNext(), this.settings.interval);
        log(this.settings.enableLogging, "Karusel byl spuštěn, interval: " + this.settings.interval + " ms.");
    };

    SimpleCarousel.prototype.stopCarousel = function () {
        if (this.timer) {
            clearInterval(this.timer);
            log(this.settings.enableLogging, "Karusel byl zastaven.");
        }
    };

    SimpleCarousel.prototype.fadeToNext = function () {
        if (this.isVideoPlaying) {
            return;
        }
        var nextIndex = (this.currentIndex + 1) % this.totalItems;
        this.showItem(nextIndex);
    };

    SimpleCarousel.prototype.showItem = function (index) {
        if (this.settings.onSlideChange) {
            this.settings.onSlideChange(this.currentIndex, index);
        }

        if (this.settings.enableAnalytics) {
            this.trackSlideChange(this.currentIndex, index);
        }

        var currentItem = this.items[this.currentIndex];
        var nextItem = this.items[index];

        currentItem.style.display = "none";
        currentItem.setAttribute('aria-hidden', 'true');

        nextItem.style.display = "block";
        nextItem.setAttribute('aria-hidden', 'false');

        this.loadLazyContent(nextItem);
        this.setIndicator(index);

        this.currentIndex = index;
        this.prefetchItems();
    };

    SimpleCarousel.prototype.generateIndicators = function () {
        var indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'simpleCarouselAriaIndicators';

        this.indicators = [];
        for (var i = 0; i < this.totalItems; i++) {
            var indicator = document.createElement('span');
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
    };

    SimpleCarousel.prototype.setIndicator = function (index) {
        if (!this.indicators) return;

        this.indicators.forEach((indicator, i) => {
            if (i === index) {
                indicator.style.background = this.settings.indicatorActiveColor;
                indicator.style.transform = 'scale(1.2)';
            } else {
                indicator.style.background = this.settings.indicatorInactiveColor;
                indicator.style.transform = 'scale(1.0)';
            }
        });
    };

    SimpleCarousel.prototype.loadLazyContent = function (item) {
        var images = item.querySelectorAll('img[data-src]');
        if (images.length > 0) {
            images.forEach(img => {
                if (!img.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    log(this.settings.enableLogging, "Obrázek načten:", img.src);
                }
            });
        }

        var videoPlaceholder = item.querySelector('.simpleCarouselItemVideo[data-video-src]');
        if (videoPlaceholder) {
            var videoSrc = videoPlaceholder.dataset.videoSrc;
            var poster = videoPlaceholder.dataset.poster;

            if (poster) {
                videoPlaceholder.style.backgroundImage = 'url(' + poster + ')';
            }

            if (!videoPlaceholder.querySelector('.simpleCarouselItemVideoPlayIcon')) {
                var playIcon = document.createElement('div');
                playIcon.className = 'simpleCarouselItemVideoPlayIcon';
                playIcon.textContent = '▶';
                videoPlaceholder.appendChild(playIcon);
            }

            videoPlaceholder.addEventListener('click', () => {
                this.stopCarousel();
                this.isVideoPlaying = true;

                if (videoSrc) {
                    var video = document.createElement('video');
                    video.className = 'simpleCarouselVideo';
                    video.controls = true;
                    video.width = "100%";
                    video.poster = poster;
                    video.setAttribute('disablePictureInPicture', true);
                    video.setAttribute('controlsList', 'nodownload nofullscreen');

                    var source = document.createElement('source');
                    source.src = videoSrc;
                    source.type = 'video/mp4';
                    video.appendChild(source);

                    videoPlaceholder.replaceWith(video);

                    if (this.settings.enableAnalytics) {
                        var videoIndex = Array.from(this.items).indexOf(item);
                        this.trackVideoPlay(videoIndex, videoSrc);
                    }

                    video.load();
                    video.play().catch(error => {
                        log(this.settings.enableLogging, "Chyba při přehrávání videa:", error);
                    });

                    video.classList.add('simpleCarouselVideoPlaying');
                    this.addCustomVideoControls(video);

                    video.addEventListener('ended', () => {
                        this.isVideoPlaying = false;
                        video.classList.remove('simpleCarouselVideoPlaying');

                        var newPlaceholder = document.createElement('div');
                        newPlaceholder.className = 'simpleCarouselItemVideo';
                        newPlaceholder.dataset.videoSrc = videoSrc;
                        newPlaceholder.dataset.poster = poster;

                        if (poster) {
                            newPlaceholder.style.backgroundImage = 'url(' + poster + ')';
                        }

                        var newPlayIcon = document.createElement('div');
                        newPlayIcon.className = 'simpleCarouselItemVideoPlayIcon';
                        newPlayIcon.textContent = '▶';
                        newPlaceholder.appendChild(newPlayIcon);

                        video.replaceWith(newPlaceholder);
                        this.loadLazyContent(item);
                        this.startCarousel();
                    });
                }
            });
        }
    };

    SimpleCarousel.prototype.prefetchItems = function () {
        for (let i = 1; i <= this.settings.prefetchItems; i++) {
            let nextIndex = (this.currentIndex + i) % this.totalItems;
            let prevIndex = (this.currentIndex - i + this.totalItems) % this.totalItems;
            this.loadLazyContent(this.items[nextIndex]);
            this.loadLazyContent(this.items[prevIndex]);
        }
        log(this.settings.enableLogging, `Předběžně načtené snímky kolem indexu ${this.currentIndex}`);
    };

    SimpleCarousel.prototype.addCustomVideoControls = function (video) {
        var pauseButton = document.createElement('button');
        pauseButton.className = 'video-pause';
        pauseButton.textContent = 'Pauza';
        video.parentNode.insertBefore(pauseButton, video.nextSibling);

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
    };

    SimpleCarousel.prototype.trackVideoPlay = function (videoIndex, videoSrc) {
        console.log(`Sledování spuštění videa na snímku: ${videoIndex}`);
        if (typeof gtag === 'function') {
            gtag('event', 'carousel_video_play', {
                'event_category': 'Carousel',
                'event_label': 'Video Play',
                'value': videoIndex,
                'video_src': videoSrc
            });
            log(this.settings.enableLogging, `Google Analytics: Sledování spuštění videa na snímku ${videoIndex} (URL: ${videoSrc})`);
        }
    };

    SimpleCarousel.prototype.trackSlideChange = function (currentIndex, nextIndex) {
        if (typeof gtag === 'function') {
            gtag('event', 'carousel_slide_change', {
                'event_category': 'Carousel',
                'event_label': 'Slide Change',
                'value': nextIndex
            });
            log(this.settings.enableLogging, `Google Analytics: Sledování přechodu na snímek ${nextIndex}`);
        }
    };

    return SimpleCarousel;
}));

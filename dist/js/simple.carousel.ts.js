/*!
 * simple.carousel.ts.js
 * Autor: Honza Mudrak
 * Tento plugin vytváří jednoduchý carousel, který rotuje mezi položkami.
 * Nabízí možnost přizpůsobení intervalu, generování indikátorů, a další funkce.
 */
interface SimpleCarouselOptions {
    interval?: number;
    generateIndicators?: boolean;
    indicatorSize?: string;
    indicatorActiveColor?: string;
    indicatorInactiveColor?: string;
    enableLogging?: boolean;
    lazyLoad?: boolean;
    prefetchItems?: number;
    startIndex?: number;
    onSlideChange?: (oldIndex: number, newIndex: number) => void;
}

class SimpleCarousel {
    private element: HTMLElement;
    private settings: SimpleCarouselOptions;
    private currentIndex: number;
    private isVideoPlaying: boolean = false;
    private timer: number | null = null;
    private items!: NodeListOf<HTMLElement>; // Použití '!' pro definitivní přiřazení
    private indicators?: HTMLElement[];

    static isCommonCSSAdded: boolean = false;

    constructor(element: string | HTMLElement, options: SimpleCarouselOptions = {}) {
        this.element = typeof element === "string" ? document.querySelector(element) as HTMLElement : element;
        this.settings = {
            interval: 3000,
            generateIndicators: true,
            indicatorSize: '10px',
            indicatorActiveColor: '#222',
            indicatorInactiveColor: '#ccc',
            enableLogging: false,
            lazyLoad: true,
            prefetchItems: 1,
            startIndex: 0,
            onSlideChange: undefined,
            ...options
        };
        this.currentIndex = this.settings.startIndex!;

        if (!SimpleCarousel.isCommonCSSAdded) {
            SimpleCarousel.addCommonCSS();
            SimpleCarousel.isCommonCSSAdded = true;
        }

        this.init();
    }

    static addCommonCSS(): void {
        const commonCSS = `
            .simpleCarouselItem {
                display: none;
                will-change: opacity;
            }
            .simpleCarouselItem:first-child {
                display: block;
            }
            .simpleCarouselAriaIndicators {
                margin-top: 8px;
            }
            .simpleCarouselAriaIndicators .simpleCarouselAriaIndicator {
                display: inline-block;
                margin: 0 5px;
                border-radius: 50%;
                cursor: pointer;
                transition: background 0.3s, transform 0.3s ease-in-out;
            }
            .simpleCarouselItemVideo {
                width: 100%;
                height: 300px;
                background: #ddd;
                background-size: cover;
                background-position: center;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                cursor: pointer;
            }
            .simpleCarouselItemVideoPlayIcon {
                width: 60px;
                height: 60px;
                background: rgba(0, 0, 0, 0.5);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 30px;
                position: absolute;
            }
            .simpleCarouselVideo {
                width: 100%;
                height: auto;
            }
            .simpleCarouselVideoPlaying {
                width: 100%;
                height: 100%;
                max-height: 600px;
                transition: all 0.5s ease-in-out;
            }
            .video-pause {
                margin-top: 10px;
                background-color: #000;
                color: #fff;
                padding: 5px 10px;
                border: none;
                cursor: pointer;
                display: none;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.type = 'text/css';
        styleElement.appendChild(document.createTextNode(commonCSS));
        document.head.appendChild(styleElement);
    }

    private log(message: string, data?: any): void {
        if (this.settings.enableLogging) {
            const timestamp = new Date().toLocaleTimeString();
            if (data) {
                console.log(`[${timestamp}] ${message}`, data);
            } else {
                console.log(`[${timestamp}] ${message}`);
            }
        }
    }

    private debounce(func: Function, wait: number) {
        let timeout: number;
        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = window.setTimeout(() => func.apply(this, args), wait);
        };
    }

    private init(): void {
        this.setup();
    }

    private setup(): void {
        const carouselID = this.generateUniqueId('simpleCarousel');
        this.element.id = carouselID;
        this.items = this.element.querySelectorAll('.simpleCarouselItem') as NodeListOf<HTMLElement>;
        const totalItems = this.items.length;

        if (totalItems <= 1) {
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
                    this.stopCarousel();
                    const index = parseInt(indicator.getAttribute('data-index')!);
                    if (index !== this.currentIndex) {
                        this.showItem(index);
                    }
                });
            });
        }
    }

    private startCarousel(): void {
        this.stopCarousel();
        this.timer = window.setInterval(() => this.fadeToNext(), this.settings.interval);
        this.log("Karusel byl spuštěn, interval: " + this.settings.interval + " ms.");
    }

    private stopCarousel(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.log("Karusel byl zastaven.");
        }
    }

    private fadeToNext(): void {
        if (this.isVideoPlaying) return;
        const nextIndex = (this.currentIndex + 1) % this.items.length;
        this.showItem(nextIndex);
    }

    private showItem(index: number): void {
        if (this.settings.onSlideChange) {
            this.settings.onSlideChange(this.currentIndex, index);
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

    private generateIndicators(): void {
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'simpleCarouselAriaIndicators';

        this.indicators = [];
        for (let i = 0; i < this.items.length; i++) {
            const indicator = document.createElement('span');
            indicator.className = 'simpleCarouselAriaIndicator';
            indicator.setAttribute('data-index', i.toString());
            indicator.setAttribute('aria-controls', `carousel-item-${this.element.id}-${i}`);
            indicator.setAttribute('aria-label', `Slide ${i + 1}`);
            indicator.style.width = this.settings.indicatorSize!;
            indicator.style.height = this.settings.indicatorSize!;
            indicator.style.background = this.settings.indicatorInactiveColor!;

            indicatorsContainer.appendChild(indicator);
            this.indicators.push(indicator);
        }

        this.element.appendChild(indicatorsContainer);
        this.setIndicator(this.currentIndex);
    }

    private setIndicator(index: number): void {
        if (!this.indicators) return;

        this.indicators.forEach((indicator, i) => {
            if (i === index) {
                indicator.style.background = this.settings.indicatorActiveColor!;
                indicator.style.transform = 'scale(1.2)';
            } else {
                indicator.style.background = this.settings.indicatorInactiveColor!;
                indicator.style.transform = 'scale(1.0)';
            }
        });
    }

    private loadLazyContent(item: HTMLElement): void {
        const images = item.querySelectorAll('img[data-src]') as NodeListOf<HTMLImageElement>;
        images.forEach(img => {
            if (!img.src) {
                img.src = img.dataset.src!;
                img.removeAttribute('data-src');
                this.log("Obrázek načten:", img.src);
            }
        });

        const videoPlaceholder = item.querySelector('.simpleCarouselItemVideo[data-video-src]') as HTMLElement | null;
        if (videoPlaceholder) {
            const videoSrc = videoPlaceholder.dataset.videoSrc!;
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

            videoPlaceholder.addEventListener('click', () => {
                this.stopCarousel();
                this.isVideoPlaying = true;

                if (videoSrc) {
                    const video = document.createElement('video');
                    video.setAttribute('controls', '');
                    video.className = 'simpleCarouselVideo';
                    video.poster = poster || '';
                    (video as any).disablePictureInPicture = true;
                    (video as any).controlsList = "nodownload nofullscreen";

                    const source = document.createElement('source');
                    source.src = videoSrc;
                    source.setAttribute('type', 'video/mp4');
                    video.appendChild(source);

                    videoPlaceholder.replaceWith(video);

                    video.load();
                    video.play().catch(error => {
                        this.log("Chyba při přehrávání videa:", error);
                    });

                    video.classList.add('simpleCarouselVideoPlaying');

                    video.addEventListener('ended', () => {
                        this.isVideoPlaying = false;

                        const newPlaceholder = document.createElement('div');
                        newPlaceholder.className = 'simpleCarouselItemVideo';
                        newPlaceholder.dataset.videoSrc = videoSrc;
                        newPlaceholder.dataset.poster = poster || '';

                        if (poster) {
                            newPlaceholder.style.backgroundImage = `url(${poster})`;
                        }

                        const playIcon = document.createElement('div');
                        playIcon.className = 'simpleCarouselItemVideoPlayIcon';
                        playIcon.textContent = '▶';
                        newPlaceholder.appendChild(playIcon);

                        video.replaceWith(newPlaceholder);
                        this.loadLazyContent(newPlaceholder);
                        this.startCarousel();
                    });
                }
            });
        }
    }

    private prefetchItems(): void {
        for (let i = 1; i <= this.settings.prefetchItems!; i++) {
            const nextIndex = (this.currentIndex + i) % this.items.length;
            const prevIndex = (this.currentIndex - i + this.items.length) % this.items.length;
            this.loadLazyContent(this.items[nextIndex]);
            this.loadLazyContent(this.items[prevIndex]);
        }
        this.log(`Předběžně načtené snímky kolem indexu ${this.currentIndex}`);
    }

    private generateUniqueId(prefix: string): string {
        return prefix + '-' + Math.floor(Math.random() * 100000);
    }
}

export default SimpleCarousel;

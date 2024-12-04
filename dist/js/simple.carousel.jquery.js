(function ($, window, document, undefined) {
    if (!$) {
        console.error('jQuery není dostupné. Plugin simpleCarousel potřebuje jQuery.');
        return;
    }

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

    $.fn.simpleCarousel = function (options) {

        var settings = $.extend({
            interval: 3000,
            theme: "default",
            generateIndicators: true,
            indicatorSize: '10px',
            indicatorActiveColor: '#222',
            indicatorInactiveColor: '#ccc',
            enableLogging: false,
            lazyLoad: true,
            prefetchItems: 100,
            startIndex: 0,
            onSlideChange: null
        }, options);

        return this.each(function () {

            var $simpleCarousel = $(this);
            var carouselID = generateUniqueId('simpleCarousel')
            var theme = $simpleCarousel.data('theme') || settings.theme;
            var themeClass = 'simple-carousel-theme-' + theme;

            $simpleCarousel.addClass(themeClass);
            $simpleCarousel.attr('id', carouselID);

            var enableLogging = $simpleCarousel.data('enable-logging') !== undefined ? $simpleCarousel.data('enable-logging') : settings.enableLogging;

            var $simpleCarouselItems = $simpleCarousel.find('.simpleCarouselItem');
            var totalItems = $simpleCarouselItems.length;

            if (totalItems <= 1) {
                log(enableLogging, "Karusel obsahuje jednu nebo méně položek, nebude inicializován.");
                return;
            }

            var interval = parseInt($simpleCarousel.data('interval')) || settings.interval;
            var generateIndicators = $simpleCarousel.data('indicator') !== undefined ? !!$simpleCarousel.data('indicator') : settings.generateIndicators;
            var indicatorSize = ($simpleCarousel.data('indicator-size') ? $simpleCarousel.data('indicator-size') + 'px' : settings.indicatorSize);
            var indicatorActiveColor = $simpleCarousel.data('indicator-active-color') || settings.indicatorActiveColor;
            var indicatorInactiveColor = $simpleCarousel.data('indicator-inactive-color') || settings.indicatorInactiveColor;

            var currentIndex = parseInt($simpleCarousel.data('current-index')) || settings.startIndex;
            if (currentIndex >= totalItems || currentIndex < 0) {
                log(enableLogging, `Hodnota currentIndex (${currentIndex}) je mimo rozsah, nastavena na 0.`);
                currentIndex = 0;
            }

            var isVideoPlaying = false;

            log(enableLogging, "Karusel byl inicializován s těmito parametry:", {
                interval,
                generateIndicators,
                indicatorSize,
                indicatorActiveColor,
                indicatorInactiveColor,
                enableLogging,
                lazyLoad: settings.lazyLoad,
                prefetchItems: settings.prefetchItems,
                currentIndex
            });

            $simpleCarousel.attr({
                'aria-live': 'polite',
                'role': 'region',
                'aria-label': 'Carousel with dynamic content'
            });

            $simpleCarouselItems.each(function (index) {
                $(this).attr('aria-hidden', index === currentIndex ? 'false' : 'true');
                $(this).attr('id', `carousel-item-${carouselID}-${index}`);
            });

            if (generateIndicators && $simpleCarousel.find('.simpleCarouselAriaIndicators').length === 0) {
                var $indicatorsContainer = $('<div class="simpleCarouselAriaIndicators"></div>');
                log(enableLogging, "Generuji indikátory...");

                for (var i = 0; i < totalItems; i++) {
                    var indicator = $(
                        `<span class="simpleCarouselAriaIndicator" data-index="${i}" 
                          aria-controls="carousel-item-${carouselID}-${i}" 
                          aria-label="Slide ${i + 1}">
                         </span>`
                    );
                    indicator.css({
                        width: indicatorSize,
                        height: indicatorSize,
                        background: indicatorInactiveColor
                    });
                    $indicatorsContainer.append(indicator);
                }
                $simpleCarousel.append($indicatorsContainer);
                log(enableLogging, "Indikátory byly vygenerovány a přidány do karuselu.");
            }

            var timer;
            var observer;

            if ('IntersectionObserver' in window) {
                observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            log(enableLogging, "Karusel je viditelný, spouštím animaci.");
                            if (!isVideoPlaying) {
                                startCarousel();
                            }
                        } else {
                            log(enableLogging, "Karusel není viditelný, zastavuji animaci.");
                            stopCarousel();
                        }
                    });
                }, {
                    threshold: 0.5
                });

                observer.observe($simpleCarousel[0]);
                log(enableLogging, "Intersection Observer byl inicializován.");
            } else {
                startCarousel();
                log(enableLogging, "Intersection Observer není podporován, karusel spuštěn bez něj.");
            }

            // Použití Page Visibility API pro detekci aktivní záložky
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) {
                    log(enableLogging, "Záložka není viditelná, pozastavuji karusel.");
                    stopCarousel();
                } else if (!isVideoPlaying) {
                    log(enableLogging, "Záložka je znovu viditelná, spouštím karusel.");
                    startCarousel();
                }
            });

            function startCarousel() {
                stopCarousel();
                timer = setInterval(fadeToNext, interval);
                log(enableLogging, "Karusel byl spuštěn, interval: " + interval + " ms.");
            }

            function stopCarousel() {
                if (timer) {
                    clearInterval(timer);
                    log(enableLogging, "Karusel byl zastaven.");
                }
            }

            function fadeToNext() {
                if (isVideoPlaying) {
                    $simpleCarouselItems.eq(currentIndex).find('video').each(function () {
                        this.pause();
                    });
                    isVideoPlaying = false;
                }

                if (typeof settings.onSlideChange === 'function') {
                    settings.onSlideChange(currentIndex, (currentIndex + 1) % totalItems);
                }

                log(enableLogging, "Přechod na další položku. Aktuální index: " + currentIndex);
                var $currentItem = $simpleCarouselItems.eq(currentIndex);
                currentIndex = (currentIndex + 1) % totalItems;
                var $nextItem = $simpleCarouselItems.eq(currentIndex);

                $currentItem.fadeOut(600, function () {
                    log(enableLogging, "Aktualizovaný index: " + currentIndex);
                    loadLazyContent($nextItem);
                    $nextItem.fadeIn(600);
                    setIndicator(currentIndex);
                    prefetchItems();

                    $simpleCarouselItems.attr('aria-hidden', 'true');
                    $nextItem.attr('aria-hidden', 'false');
                });
            }

            function setIndicator(index) {
                if (generateIndicators) {
                    var $indicators = $simpleCarousel.find('.simpleCarouselAriaIndicator');
                    $indicators.removeClass('active').css('background', indicatorInactiveColor);
                    $indicators.eq(index).addClass('active').css('background', indicatorActiveColor).css('transform', 'scale(1.2)');
                    log(enableLogging, "Indikátor pro položku " + (index + 1) + " byl nastaven jako aktivní.");
                }
            }

            function loadLazyContent($item) {
                var $images = $item.find('img[data-src]');
                $images.each(function () {
                    var $img = $(this);
                    if (!$img.attr('src')) {
                        $img.attr('src', $img.data('src')).removeAttr('data-src');
                        log(enableLogging, "Obrázek načten:", $img.attr('src'));
                    }
                });

                var $videoPlaceholder = $item.find('.simpleCarouselItemVideo[data-video-src]');
                $videoPlaceholder.each(function () {
                    var $placeholder = $(this);
                    var videoSrc = $placeholder.data('video-src');
                    var poster = $placeholder.data('poster');

                    if (poster) {
                        $placeholder.css('background-image', 'url(' + poster + ')');
                    }

                    if ($placeholder.find('.simpleCarouselItemVideoPlayIcon').length === 0) {
                        var $playIcon = $('<div class="simpleCarouselItemVideoPlayIcon">▶</div>');
                        $placeholder.append($playIcon);
                    }

                    $placeholder.off('click').on('click', function () {
                        stopCarousel();
                        isVideoPlaying = true;

                        if (videoSrc) {
                            var $video = $(
                                `<video controls class="simpleCarouselVideo" width="100%" poster="${poster}" disablePictureInPicture controlsList="nodownload nofullscreen">
                                    <source src="${videoSrc}" type="video/mp4">
                                </video>`
                            );
                            $placeholder.replaceWith($video);

                            $video[0].load();
                            $video[0].play().catch(function (error) {
                                log(enableLogging, "Chyba při přehrávání videa:", error);
                            });

                            $video.addClass('simpleCarouselVideoPlaying');

                            addCustomVideoControls($video);

                            $video.on('ended', function () {
                                isVideoPlaying = false;

                                $video.removeClass('simpleCarouselVideoPlaying');

                                var $newPlaceholder = $('<div class="simpleCarouselItemVideo" data-video-src="' + videoSrc + '" data-poster="' + poster + '"></div>');
                                if (poster) {
                                    $newPlaceholder.css('background-image', 'url(' + poster + ')');
                                }
                                var $playIcon = $('<div class="simpleCarouselItemVideoPlayIcon">▶</div>');
                                $newPlaceholder.append($playIcon);
                                $video.replaceWith($newPlaceholder);

                                loadLazyContent($item);
                                startCarousel();
                            });
                            log(enableLogging, "Video bylo načteno a zobrazeno, video se přehrává:", videoSrc);
                        }
                    });
                });
            }

            function prefetchItems() {
                for (let i = 1; i <= settings.prefetchItems; i++) {
                    let nextIndex = (currentIndex + i) % totalItems;
                    let prevIndex = (currentIndex - i + totalItems) % totalItems;
                    loadLazyContent($simpleCarouselItems.eq(nextIndex));
                    loadLazyContent($simpleCarouselItems.eq(prevIndex));
                }
                log(enableLogging, `Předběžně načtené snímky kolem indexu ${currentIndex}`);
            }

            loadLazyContent($simpleCarouselItems);

            $simpleCarouselItems.hide().eq(currentIndex).fadeIn();
            setIndicator(currentIndex);
            prefetchItems();

            $simpleCarousel.on('mouseenter', debounce(function () {
                stopCarousel();
            }, 200));

            $simpleCarousel.on('mouseleave', debounce(function () {
                if (!isVideoPlaying) startCarousel();
            }, 200));

            $simpleCarousel.on('click', '.simpleCarouselAriaIndicator', function () {
                stopCarousel();
                var index = $(this).data('index');
                if (index !== currentIndex) {
                    log(enableLogging, "Kliknutí na indikátor, přechod na položku " + (index + 1));
                    $simpleCarouselItems.eq(currentIndex).fadeOut(600, function () {
                        currentIndex = index;
                        loadLazyContent($simpleCarouselItems.eq(currentIndex));
                        $simpleCarouselItems.eq(currentIndex).fadeIn(600);
                        setIndicator(currentIndex);
                        if (!isVideoPlaying) {
                            startCarousel();
                        }
                    });
                }
            });

            function addCustomVideoControls($video) {
                var $pauseButton = $('<button class="video-pause">Pauza</button>');
                $video.after($pauseButton);

                $pauseButton.show();

                $pauseButton.on('click', function () {
                    if ($video[0].paused) {
                        $video[0].play();
                        $(this).text('Pauza');
                    } else {
                        $video[0].pause();
                        $(this).text('Spustit');
                    }
                });

                $video.on('ended', function () {
                    $pauseButton.remove();
                });
            }
        });
    };

})(jQuery, window, document);

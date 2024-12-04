# SimpleCarousel

SimpleCarousel is a lightweight and flexible JavaScript carousel plugin available in three versions: jQuery, Vanilla JavaScript, and ES6 Module. It allows you to easily create rotating carousels with customizable indicators.

![SimpleCarousel Demo](./demo/simple-carousel-demo.gif)

## Versions

- **jQuery Version**: `/dist/js/simple.carousel.jquery.js`
- **Vanilla JavaScript Version**: `/dist/js/simple.carousel.vanilla.js`
- **ES6 Module Version**: `/dist/js/simple.carousel.es6.js`

## Demo

Explore the live demos to see the different versions of SimpleCarousel in action:

- [jQuery Demo](./demo/jquery.html)
- [Vanilla JavaScript Demo](./demo/vanilla.html)
- [ES6 Module Demo](./demo/es6.html)

## Installation

### Include CSS for Styling

To ensure proper styling for SimpleCarousel, include the external CSS file:
```html
<link rel="stylesheet" href="./dist/css/simple-carousel.css">
```


### jQuery Version
Include the jQuery library and the `simple.carousel.jquery.js` script in your HTML file:

```html
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="./dist/js/simple.carousel.jquery.js"></script>
```

### Vanilla JavaScript Version
Include the `simple.carousel.vanilla.js` script in your HTML file:

```html
<script src="./dist/js/simple.carousel.vanilla.js"></script>
```

### ES6 Module Version
Import the `simple.carousel.es6.js` script in your JavaScript code:

```javascript
import SimpleCarousel from './dist/js/simple.carousel.es6.js';
```

## Usage

### Data Attributes

You can use `data-` attributes to easily configure the carousel directly in HTML. These attributes are supported in **all versions** of SimpleCarousel, including jQuery, Vanilla JavaScript, and ES6 Module versions.

**Available Data Attributes**:
- `data-theme`: Sets the theme for the carousel (e.g., `default`, `bounce`, `fade`, etc.).
- `data-interval`: Sets the interval time in milliseconds between slides (e.g., `3000`).
- `data-enable-logging`: Enables logging for debugging (`true` or `false`).
- `data-start-index`: Sets the index from which the carousel should start (`0` means the first item).

**Example HTML**:
```html
<div class="simpleCarousel" 
     data-theme="fade" 
     data-interval="4000" 
     data-enable-logging="true" 
     data-start-index="2">
    <div class="simpleCarouselItem">Slide 1</div>
    <div class="simpleCarouselItem">Slide 2</div>
    <div class="simpleCarouselItem">Slide 3</div>
</div>
```

In this example:
- **Theme** is set to "fade" to apply the fade animation to the active indicator.
- **Interval** is set to `4000` ms.
- **Logging** is enabled for debugging.
- **Start index** is set to `2` (third slide).


### HTML Structure
To use SimpleCarousel, your HTML should have the following basic structure:

```html
<div class="simpleCarousel" data-interval="5000">
    <div class="simpleCarouselItem">
        <div class="news-title">Item 1 Title</div>
        <div class="news-description">Description for item 1.</div>
    </div>
    <div class="simpleCarouselItem">
        <div class="news-title">Item 2 Title</div>
        <div class="news-description">Description for item 2.</div>
    </div>
    <div class="simpleCarouselItem">
        <div class="news-title">Item 3 Title</div>
        <div class="news-description">Description for item 3.</div>
    </div>
</div>

### jQuery Version
Initialize the carousel using jQuery:

```html
<script>
  $(document).ready(function() {
    $('.simpleCarousel').simpleCarousel({
      interval: 5000,
      generateIndicators: true,
      indicatorActiveColor: '#007bff',
      indicatorInactiveColor: '#d3d3d3'
    });
  });
</script>
```

Alternatively, you can use **data-attributes** to configure the carousel without specifying options in JavaScript:

```html
<div class="simpleCarousel" 
     data-interval="4000" 
     data-indicator="true" 
     data-indicator-size="12" 
     data-indicator-active-color="#ff0000" 
     data-indicator-inactive-color="#d3d3d3">
    <div class="simpleCarouselItem">
        <div class="news-title">Item 1 Title</div>
        <div class="news-description">Description for item 1.</div>
    </div>
    <div class="simpleCarouselItem">
        <div class="news-title">Item 2 Title</div>
        <div class="news-description">Description for item 2.</div>
    </div>
    <div class="simpleCarouselItem">
        <div class="news-title">Item 3 Title</div>
        <div class="news-description">Description for item 3.</div>
    </div>
</div>
```


### Vanilla JavaScript Version
Initialize the carousel using Vanilla JavaScript:

```html
<script>
  document.addEventListener("DOMContentLoaded", function() {
    const carousels = document.querySelectorAll('.simpleCarousel');
    carousels.forEach(function(carousel) {
      new SimpleCarousel(carousel, {
        interval: 5000,
        generateIndicators: true,
        indicatorActiveColor: '#007bff',
        indicatorInactiveColor: '#d3d3d3'
      });
    });
  });
</script>
```


### ES6 Module Version
Import and initialize the carousel using an ES6 module:

```html
<script type="module">
  import SimpleCarousel from '/dist/js/simple.carousel.es6.js';

  document.addEventListener("DOMContentLoaded", function() {
    const carouselElement = document.querySelector('.simpleCarousel');
    new SimpleCarousel(carouselElement, {
      interval: 5000,
      generateIndicators: true,
      indicatorActiveColor: '#007bff',
      indicatorInactiveColor: '#d3d3d3'
    });
  });
</script>
```

## Features and Improvements

- **Intersection Observer**: The carousel will automatically start and stop based on the element's visibility in the viewport, ensuring efficient use of resources.
- **ARIA Attributes**: Added `aria-live`, `role`, and other ARIA attributes to make the carousel accessible to screen readers, improving accessibility.
- **Centralized Logging**: Logging with timestamps can be enabled with the `enableLogging` option, helping with debugging.
- **Optimized CSS**: Shared CSS is injected once to avoid redundancy, ensuring efficient rendering of multiple carousels.
- **Multiple Instances**: SimpleCarousel can be used for multiple carousels on the same page, each with independent instances and settings.

## Options

- **interval** (number): Time in milliseconds between carousel transitions. Default is `3000`.
- **generateIndicators** (boolean): Whether to generate indicators for the carousel. Default is `true`.
- **indicatorSize** (string): Height and width of the indicator in pixels (e.g., `'10px'`).
- **indicatorActiveColor** (string): Color of the active indicator.
- **indicatorInactiveColor** (string): Color of the inactive indicators.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Honza Mudrak**

Feel free to contact me if you have any questions or need assistance with SimpleCarousel!

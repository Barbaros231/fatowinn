(function () {
  'use strict';

  
  function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function readThemeSignals() {
    try {
      return JSON.parse(document.documentElement.getAttribute('data-eva-theme') || '{}');
    } catch {
      return {};
    }
  }

  function isEffectiveDark() {
    var html = document.documentElement;
    if (html.getAttribute('data-theme') === 'dark') return true;
    if (html.getAttribute('data-theme') === 'light') return false;
    if (html.classList.contains('t_dark')) return true;
    if (html.classList.contains('t_light')) return false;
    if (html.classList.contains('dark')) return true;
    if (html.classList.contains('light')) return false;
    if (html.getAttribute('data-color-mode') === 'dark') return true;
    if (html.getAttribute('data-color-mode') === 'light') return false;
    if (html.getAttribute('data-mode') === 'dark') return true;
    if (html.getAttribute('data-mode') === 'light') return false;
    return systemPrefersDark();
  }

  function applyEvaTheme(isDark, signals) {
    if (!signals || typeof signals !== 'object') {
      signals = readThemeSignals();
    }
    var scheme = isDark ? 'dark' : 'light';
    var html = document.documentElement;

    if (signals.dataTheme) {
      html.setAttribute('data-theme', scheme);
    }
    if (signals.tamagui) {
      html.classList.remove('t_light', 't_dark');
      html.classList.add(isDark ? 't_dark' : 't_light');
    }
    if (signals.classDark || signals.tailwindDark) {
      html.classList.toggle('dark', isDark);
      html.classList.toggle('light', !isDark);
    }
    if (signals.colorMode) {
      html.setAttribute('data-color-mode', scheme);
    }
    if (signals.dataMode) {
      html.setAttribute('data-mode', scheme);
    }

    html.style.colorScheme = scheme;

    if (typeof document !== 'undefined' && document.querySelectorAll) {
      document.querySelectorAll('[data-theme="light"], [data-theme="dark"]').forEach(function (el) {
        if (el === html) return;
        el.setAttribute('data-theme', scheme);
      });
    }
  }

  function readCapturedTheme() {
    var value = document.documentElement.getAttribute('data-eva-theme-default');
    if (value === 'dark') return true;
    if (value === 'light') return false;
    return null;
  }

  function resolveThemePreference() {
    try {
      var stored = sessionStorage.getItem('eva-theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
    } catch {}
    var captured = readCapturedTheme();
    if (captured !== null) return captured;
    return systemPrefersDark();
  }

  function persistThemePreference(isDark) {
    try {
      sessionStorage.setItem('eva-theme', isDark ? 'dark' : 'light');
    } catch {}
  }

  function clearThemePreference() {
    try {
      sessionStorage.removeItem('eva-theme');
    } catch {}
  }

  function syncThemeFromPreference(signals) {
    applyEvaTheme(resolveThemePreference(), signals);
  }

  function watchSystemTheme(signals) {
    if (readCapturedTheme() !== null) return;
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    if (!media || typeof media.addEventListener !== 'function') return;
    media.addEventListener('change', function (event) {
      try {
        if (sessionStorage.getItem('eva-theme')) return;
      } catch {}
      applyEvaTheme(event.matches, signals);
    });
  }


  function closestMatch(el, selector) {
    if (!(el instanceof Element)) return null;
    return el.closest(selector);
  }

  function onClick(event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var themeBtn = closestMatch(target, '[data-eva-theme-toggle], [aria-label*="theme" i], [aria-label*="dark mode" i], [aria-label*="light mode" i]');
    if (themeBtn) {
      event.preventDefault();
      var signals = readThemeSignals();
      var goingDark = !isEffectiveDark();
      applyEvaTheme(goingDark, signals);
      persistThemePreference(goingDark);
      return;
    }

    var navEl = closestMatch(
      target,
      'a[href], area[href], button, input[type="submit"], input[type="button"], input[type="image"], [role="button"], [data-href], [data-url], [data-link], [formaction]',
    );
    if (navEl && !navEl.closest('#eva-locale-menu')) {
      var href =
        navEl.getAttribute('href') ||
        navEl.getAttribute('formaction') ||
        navEl.getAttribute('data-href') ||
        navEl.getAttribute('data-url') ||
        navEl.getAttribute('data-link') ||
        '';
      var hashOnly = href.charAt(0) === '#' && href !== '#!' && href.indexOf('#!') !== 0;
      if (!hashOnly) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function blockExternalNavigation() {
    try {
      window.open = function () {
        return null;
      };
    } catch (_error) {}
  }

  function freezeForms() {
    document.querySelectorAll('form').forEach(function (form) {
      form.setAttribute('onsubmit', 'return false');
      form.addEventListener('submit', onSubmit, true);
    });
    document.querySelectorAll('input, textarea, select').forEach(function (field) {
      if (field instanceof HTMLInputElement && (field.type === 'hidden' || field.type === 'checkbox' || field.type === 'radio')) {
        field.setAttribute('readonly', 'readonly');
        return;
      }
      try {
        field.setAttribute('readonly', 'readonly');
      } catch (_error) {}
    });
  }

  function repairCarouselLayouts() {
    function slideScore(slide) {
      var rect = slide.getBoundingClientRect();
      var media = slide.querySelectorAll('img, video, picture, svg, [style*="background"]').length;
      var text = (slide.textContent || '').replace(/s+/g, ' ').trim().length;
      return Math.max(rect.height, 0) * 10 + media * 100 + Math.min(text, 400);
    }

    document.querySelectorAll('.swiper, .swiper-container').forEach(function (root) {
      var width = root.clientWidth;
      if (!width) return;
      var wrapper = root.querySelector('.swiper-wrapper');
      if (wrapper) {
        wrapper.style.transform = 'translate3d(0px, 0px, 0px)';
        wrapper.style.transitionDuration = '0ms';
        wrapper.style.width = '';
      }
      root.querySelectorAll('.swiper-slide').forEach(function (slide) {
        slide.style.width = width + 'px';
        slide.style.marginRight = '';
        slide.style.marginLeft = '';
        slide.style.transform = '';
      });
    });

    document.querySelectorAll('.slick-track').forEach(function (track) {
      track.style.transform = 'translate3d(0px, 0px, 0px)';
      track.style.width = '';
    });
    document.querySelectorAll('.slick-slide').forEach(function (slide) {
      var list = slide.closest('.slick-list');
      var width = list ? list.clientWidth : 0;
      if (!width) return;
      slide.style.width = width + 'px';
      slide.style.marginRight = '';
      slide.style.marginLeft = '';
    });

    document
      .querySelectorAll('.slick-slider, .slick-initialized, .swiper, .swiper-container, .owl-carousel, .flickity-enabled')
      .forEach(function (root) {
        var slides = Array.prototype.slice.call(
          root.querySelectorAll(
            '.slick-slide:not(.slick-cloned), .swiper-slide:not(.swiper-slide-duplicate), .owl-item:not(.cloned), .gallery-cell, .carousel-cell',
          ),
        );
        if (!slides.length) {
          slides = Array.prototype.slice.call(
            root.querySelectorAll('.slick-slide, .swiper-slide, .owl-item'),
          );
        }
        if (!slides.length) return;

        var preferred = null;
        for (var i = 0; i < slides.length; i += 1) {
          var candidate = slides[i];
          if (
            candidate.classList.contains('slick-current') ||
            candidate.classList.contains('slick-active') ||
            candidate.classList.contains('swiper-slide-active') ||
            candidate.classList.contains('is-selected') ||
            (candidate.classList.contains('owl-item') && candidate.classList.contains('active'))
          ) {
            preferred = candidate;
            break;
          }
        }
        if (!preferred) {
          preferred = slides[0];
          for (var j = 1; j < slides.length; j += 1) {
            if (slideScore(slides[j]) > slideScore(preferred)) preferred = slides[j];
          }
        }

        slides.forEach(function (slide) {
          if (!(slide instanceof HTMLElement)) return;
          if (slide === preferred) {
            slide.classList.add('slick-current', 'slick-active', 'swiper-slide-active', 'is-selected');
            slide.setAttribute('aria-hidden', 'false');
            slide.style.setProperty('visibility', 'visible', 'important');
            slide.style.setProperty('opacity', '1', 'important');
            if (window.getComputedStyle(slide).display === 'none') {
              slide.style.setProperty('display', 'block', 'important');
            }
          } else {
            slide.classList.remove('slick-current', 'slick-active', 'swiper-slide-active', 'is-selected');
            slide.setAttribute('aria-hidden', 'true');
            slide.style.setProperty('display', 'none', 'important');
          }
        });

        root.setAttribute('data-eva-carousel-frozen', '1');
      });
  }

  var carouselResizeTimer = 0;
  function scheduleCarouselRepair() {
    window.clearTimeout(carouselResizeTimer);
    carouselResizeTimer = window.setTimeout(repairCarouselLayouts, 50);
  }

  function initializeTheme() {
    var signals = readThemeSignals();
    if (!signals || !Object.keys(signals).length) return;
    syncThemeFromPreference(signals);
    watchSystemTheme(signals);
  }

  document.documentElement.classList.add('eva-visual-only');
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
  window.addEventListener('resize', scheduleCarouselRepair);
  blockExternalNavigation();
  freezeForms();
  initializeTheme();
  repairCarouselLayouts();
})();

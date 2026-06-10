// CANVOY THEME JS
(function() {
  'use strict';

  var theme = window.CanvoyTheme || {};
  var freeShipThreshold = theme.freeShippingThreshold || 5000;

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  function money(cents) {
    var amount = (cents / 100).toFixed(2).replace('.', ',');
    if (theme.moneyFormat) {
      return theme.moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amount).replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100));
    }
    return amount + ' €';
  }

  var cartState = { items: [], total_price: 0, item_count: 0 };

  function updateCartCount(count) {
    var el = qs('#cart-count');
    if (!el) return;
    if (count > 0) {
      el.textContent = count;
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  }

  function updateShippingBar(cart) {
    var bar = qs('#cart-shipping-bar');
    var text = qs('#cart-shipping-text');
    var fill = qs('#cart-shipping-fill');
    var msg = qs('#cart-free-ship-msg');
    if (!bar || !text || !fill) return;

    if (cart.item_count === 0) {
      bar.hidden = true;
      return;
    }

    bar.hidden = false;
    var remaining = freeShipThreshold - cart.total_price;

    if (remaining <= 0) {
      text.textContent = '¡Has desbloqueado el envío gratis! 🎉';
      fill.style.width = '100%';
      if (msg) msg.textContent = 'Tu pedido incluye envío gratis a España';
    } else {
      text.textContent = 'Te faltan ' + money(remaining) + ' para envío gratis';
      fill.style.width = Math.min(100, (cart.total_price / freeShipThreshold) * 100) + '%';
      if (msg) msg.textContent = 'Envío gratis en pedidos +' + (freeShipThreshold / 100) + '€ 🚚';
    }
  }

  function getCart() {
    return fetch('/cart.js', { headers: { 'Content-Type': 'application/json' } })
      .then(function(r) { return r.json(); })
      .then(function(cart) {
        cartState = cart;
        updateCartCount(cart.item_count);
        updateShippingBar(cart);
        return cart;
      });
  }

  function addToCart(variantId, quantity) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: quantity || 1 })
    })
    .then(function(r) {
      if (!r.ok) throw new Error('add failed');
      return r.json();
    })
    .then(function() { return getCart(); });
  }

  function changeCartItem(key, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
    .then(function(r) { return r.json(); })
    .then(function(cart) {
      cartState = cart;
      updateCartCount(cart.item_count);
      updateShippingBar(cart);
      renderCartDrawer(cart);
      return cart;
    });
  }

  function openCartDrawer() {
    var drawer = qs('#cart-drawer');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    getCart().then(renderCartDrawer);
  }

  function closeCartDrawer() {
    var drawer = qs('#cart-drawer');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderCartDrawer(cart) {
    var content = qs('#cart-content');
    var foot = qs('#cart-foot');
    var subtotal = qs('#cart-subtotal-amount');
    if (!content) return;

    updateShippingBar(cart);

    if (cart.item_count === 0) {
      content.innerHTML = '<div class="cart-empty-state">' +
        '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
        '<p>Tu carrito está vacío</p>' +
        '<a href="' + (theme.routes && theme.routes.allProducts || '/collections/all') + '" class="btn btn--outline btn--sm">Ver productos</a></div>';
      if (foot) foot.style.display = 'none';
      return;
    }

    var html = '';
    cart.items.forEach(function(item) {
      html += '<div class="cart-item" data-key="' + item.key + '">' +
        '<img src="' + (item.image || '') + '" alt="' + item.product_title + '" class="cart-item__img" loading="lazy" width="72" height="72">' +
        '<div class="cart-item__info">' +
        '<p class="cart-item__name">' + item.product_title + '</p>' +
        (item.variant_title && item.variant_title !== 'Default Title' ? '<p class="cart-item__variant">' + item.variant_title + '</p>' : '') +
        '<div class="cart-item__controls">' +
        '<div class="cart-item__qty">' +
        '<button class="cart-item__qty-btn cart-qty-dec" data-key="' + item.key + '" data-qty="' + item.quantity + '">−</button>' +
        '<span class="cart-item__qty-val">' + item.quantity + '</span>' +
        '<button class="cart-item__qty-btn cart-qty-inc" data-key="' + item.key + '" data-qty="' + item.quantity + '">+</button>' +
        '</div>' +
        '<button class="cart-item__remove" data-key="' + item.key + '">Eliminar</button>' +
        '</div></div>' +
        '<span class="cart-item__price">' + money(item.line_price) + '</span>' +
        '</div>';
    });
    content.innerHTML = html;

    if (subtotal) subtotal.textContent = money(cart.total_price);
    if (foot) foot.style.display = 'block';

    qsa('.cart-qty-dec', content).forEach(function(btn) {
      on(btn, 'click', function() {
        changeCartItem(btn.dataset.key, Math.max(0, parseInt(btn.dataset.qty) - 1));
      });
    });
    qsa('.cart-qty-inc', content).forEach(function(btn) {
      on(btn, 'click', function() {
        changeCartItem(btn.dataset.key, parseInt(btn.dataset.qty) + 1);
      });
    });
    qsa('.cart-item__remove', content).forEach(function(btn) {
      on(btn, 'click', function() {
        changeCartItem(btn.dataset.key, 0);
      });
    });
  }

  on(qs('#cart-toggle'), 'click', openCartDrawer);
  on(qs('#cart-close'), 'click', closeCartDrawer);
  on(qs('#cart-overlay'), 'click', closeCartDrawer);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeCartDrawer();
  });

  // Header scroll
  var siteHeader = qs('#site-header');
  if (siteHeader) {
    window.addEventListener('scroll', function() {
      siteHeader.classList.toggle('is-scrolled', window.scrollY > 8);
    }, { passive: true });
  }

  // Mobile menu
  var mobileMenuBtn = qs('#mobile-menu-btn');
  var mobileNav = qs('#mobile-nav');
  if (mobileMenuBtn && mobileNav) {
    on(mobileMenuBtn, 'click', function() {
      var isOpen = mobileNav.classList.toggle('is-open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });
    qsa('.mobile-nav__link', mobileNav).forEach(function(link) {
      on(link, 'click', function() {
        mobileNav.classList.remove('is-open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function buyNow(variantId, quantity) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: quantity || 1 })
    })
    .then(function(r) {
      if (!r.ok) throw new Error('buy failed');
      window.location.href = '/checkout';
    });
  }

  function getProductQty() {
    var qtyInput = qs('.product-page .qty-input');
    return qtyInput ? parseInt(qtyInput.value) || 1 : 1;
  }

  function syncVariantUI(matched) {
    if (!matched) return;
    var atcLabel = 'Agregar al carrito';
    if (qs('#atc-btn') && qs('#atc-btn').dataset.defaultLabel) {
      atcLabel = qs('#atc-btn').dataset.defaultLabel;
    }
    qsa('#atc-btn, #sticky-atc-btn, #buy-now-btn').forEach(function(b) {
      if (!b) return;
      b.dataset.variantId = matched.id;
      b.disabled = !matched.available;
    });
    var atcBtn = qs('#atc-btn');
    var stickyBtn = qs('#sticky-atc-btn');
    if (atcBtn) atcBtn.textContent = matched.available ? atcLabel : 'Agotado';
    if (stickyBtn) stickyBtn.textContent = matched.available ? atcLabel : 'Agotado';
    var priceEl = qs('.price-current');
    if (priceEl) priceEl.textContent = money(matched.price);
    var stickyPrice = qs('.sticky-atc__price');
    if (stickyPrice) {
      var saveHtml = '';
      if (matched.compare_at_price > matched.price) {
        var pct = Math.round((matched.compare_at_price - matched.price) * 100 / matched.compare_at_price);
        saveHtml = ' <span class="sticky-atc__save">-' + pct + '%</span>';
      }
      stickyPrice.innerHTML = money(matched.price) + saveHtml;
    }
    var compareEl = qs('.price-compare');
    var saveEl = qs('.price-save');
    if (compareEl) {
      compareEl.style.display = matched.compare_at_price > matched.price ? '' : 'none';
      if (matched.compare_at_price > matched.price) compareEl.textContent = money(matched.compare_at_price);
    }
    if (saveEl && matched.compare_at_price > matched.price) {
      saveEl.style.display = '';
      var saved = matched.compare_at_price - matched.price;
      var pct = Math.round(saved * 100 / matched.compare_at_price);
      saveEl.textContent = 'Ahorras ' + money(saved) + ' (' + pct + '%)';
    } else if (saveEl) {
      saveEl.style.display = 'none';
    }
    if (matched.featured_image && matched.featured_image.src) {
      var mainImg = qs('#product-main-img');
      if (mainImg) mainImg.src = matched.featured_image.src.replace(/(\._\d+x\d+)?\./, '.1200x.');
    }
  }

  function handleATCBtn(btn, label) {
    label = label || btn.textContent.trim();
    btn.dataset.defaultLabel = label;
    on(btn, 'click', function(e) {
      e.preventDefault();
      var variantId = btn.dataset.variantId;
      if (!variantId || btn.disabled) return;
      var qty = btn.closest('.product-page') ? getProductQty() :
        btn.closest('.featured-product') ? (btn.closest('.featured-product').querySelector('.qty-input') || {}).value || 1 : 1;
      if (typeof qty === 'string') qty = parseInt(qty) || 1;

      btn.textContent = 'Añadiendo...';
      btn.disabled = true;

      addToCart(variantId, qty)
        .then(function() {
          btn.textContent = '✓ Añadido';
          openCartDrawer();
          setTimeout(function() {
            btn.textContent = label;
            btn.disabled = false;
          }, 2000);
        })
        .catch(function() {
          btn.textContent = 'Error — reintenta';
          setTimeout(function() {
            btn.textContent = label;
            btn.disabled = false;
          }, 2000);
        });
    });
  }

  var buyNowBtn = qs('#buy-now-btn');
  if (buyNowBtn) {
    var buyLabel = buyNowBtn.textContent.trim();
    on(buyNowBtn, 'click', function(e) {
      e.preventDefault();
      if (buyNowBtn.disabled) return;
      buyNowBtn.textContent = 'Redirigiendo...';
      buyNowBtn.disabled = true;
      buyNow(buyNowBtn.dataset.variantId, getProductQty()).catch(function() {
        buyNowBtn.textContent = buyLabel;
        buyNowBtn.disabled = false;
      });
    });
  }

  qsa('.quick-add-btn').forEach(function(btn) {
    handleATCBtn(btn, btn.textContent.trim());
  });
  var fpAtc = qs('.fp-atc-btn');
  if (fpAtc) handleATCBtn(fpAtc);
  var mainAtc = qs('#atc-btn');
  if (mainAtc) handleATCBtn(mainAtc, mainAtc.textContent.trim());
  var stickyAtc = qs('#sticky-atc-btn');
  if (stickyAtc) handleATCBtn(stickyAtc, stickyAtc.textContent.trim());

  var stickyBar = qs('#sticky-atc');
  var atcAnchor = qs('#product-atc-anchor');
  if (stickyBar && atcAnchor && 'IntersectionObserver' in window) {
    var wasVisible = false;
    var firstCheck = true;
    var observer = new IntersectionObserver(function(entries) {
      var visible = entries[0].isIntersecting;
      if (firstCheck) {
        wasVisible = visible;
        firstCheck = false;
        stickyBar.classList.toggle('is-visible', false);
        stickyBar.setAttribute('aria-hidden', 'true');
        document.body.classList.toggle('has-sticky-atc', false);
        return;
      }
      if (wasVisible && !visible) {
        stickyBar.classList.add('is-visible');
        stickyBar.setAttribute('aria-hidden', 'false');
        document.body.classList.add('has-sticky-atc');
      } else if (!wasVisible && visible) {
        stickyBar.classList.remove('is-visible');
        stickyBar.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('has-sticky-atc');
      }
      wasVisible = visible;
    }, { threshold: 0, rootMargin: '-80px 0px 0px 0px' });
    observer.observe(atcAnchor);
  }

  qsa('.product-thumb-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      var thumb = btn.querySelector('.product-thumb');
      var mainImg = qs('#product-main-img');
      var index = btn.dataset.index;
      var counter = qs('#gallery-counter');
      if (counter && index) counter.textContent = index + ' / ' + counter.textContent.split('/').pop().trim();
      if (mainImg && thumb && thumb.dataset.full) mainImg.src = thumb.dataset.full;
      var siblings = btn.closest('.product-images__thumbs');
      if (siblings) {
        siblings.querySelectorAll('.product-thumb-btn').forEach(function(b) { b.classList.remove('active'); });
      }
      btn.classList.add('active');
    });
  });

  qsa('.product-thumb, .fp-thumb').forEach(function(thumb) {
    on(thumb, 'click', function() {
      var mainImg = qs('#product-main-img') || qs('#fp-main-img');
      if (mainImg && thumb.dataset.full) mainImg.src = thumb.dataset.full;
      var siblings = thumb.closest('.product-images__thumbs, .fp-thumbs');
      if (siblings) {
        siblings.querySelectorAll('.product-thumb, .fp-thumb').forEach(function(t) {
          t.classList.remove('active');
        });
      }
      thumb.classList.add('active');
    });
  });

  var variantBtns = qsa('.product-page .variant-btn');
  if (variantBtns.length && typeof productVariants !== 'undefined') {
    variantBtns.forEach(function(btn) {
      on(btn, 'click', function() {
        var group = btn.closest('.variant-group');
        if (group) {
          group.querySelectorAll('.variant-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var valEl = group.querySelector('[id^="opt-val-"]');
          if (valEl) valEl.textContent = btn.dataset.value;
        }

        var selectedOptions = [];
        qsa('.product-page .variant-group').forEach(function(g) {
          var active = g.querySelector('.variant-btn.active');
          if (active) selectedOptions.push(active.dataset.value);
        });

        var matched = productVariants.find(function(v) {
          return v.options.every(function(opt, i) { return opt === selectedOptions[i]; });
        });

        syncVariantUI(matched);
      });
    });
  }

  qsa('.qty-dec').forEach(function(btn) {
    on(btn, 'click', function() {
      var input = btn.parentElement.querySelector('.qty-input, .qty-val');
      if (!input) return;
      var v = parseInt(input.value || input.textContent) || 1;
      if (v > 1) {
        if (input.value !== undefined) input.value = v - 1;
        else input.textContent = v - 1;
      }
    });
  });
  qsa('.qty-inc').forEach(function(btn) {
    on(btn, 'click', function() {
      var input = btn.parentElement.querySelector('.qty-input, .qty-val');
      if (!input) return;
      var v = parseInt(input.value || input.textContent) || 1;
      var max = parseInt(input.max) || 99;
      if (v < max) {
        if (input.value !== undefined) input.value = v + 1;
        else input.textContent = v + 1;
      }
    });
  });

  qsa('.accordion-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      var content = btn.nextElementSibling;
      btn.setAttribute('aria-expanded', !isOpen);
      if (content) content.style.display = isOpen ? 'none' : 'block';
    });
    var content = btn.nextElementSibling;
    if (content) content.style.display = btn.getAttribute('aria-expanded') === 'true' ? 'block' : 'none';
  });

  qsa('.featured-product').forEach(function(fp) {
    fp.querySelectorAll('.variant-btn').forEach(function(btn) {
      on(btn, 'click', function() {
        var group = btn.closest('.variant-group');
        if (group) {
          group.querySelectorAll('.variant-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var valEl = qs('#opt-' + btn.dataset.option + '-val', fp);
          if (valEl) valEl.textContent = btn.dataset.value;
        }
      });
    });
  });

  getCart();

  var scrollAtc = qs('#scroll-to-atc');
  if (scrollAtc) {
    on(scrollAtc, 'click', function() {
      var anchor = qs('#product-atc-anchor') || qs('#atc-btn');
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var atc = qs('#atc-btn');
      if (atc) atc.focus();
    });
  }

})();

/* ==========================================================================
   «Живой клик» — «живая» часть сайта:
     1) заявки уходят прямо на почту (без ботов и панелей);
     2) мягкие эффекты: свечение, магнит, подсветка, печатающийся текст,
        появление блоков и счётчики цифр;
     3) черновики сообщений не теряются.
   Без сторонних библиотек. Все эффекты уважают настройки пользователя.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.CONFIG || {};
  var root = document.documentElement;
  root.classList.remove('no-js');

  var REDUCED = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var CAN_HOVER = !!(window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  /* --------------------------------------------------------------- меню */

  function initNav() {
    var btn = document.querySelector('.nav__toggle');
    var nav = document.querySelector('.nav');
    if (!btn || !nav) { return; }
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Закрыть' : 'Меню';
    });
  }

  /* ------------------------------------------- появление блоков прокруткой */

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) { return; }

    if (REDUCED || !('IntersectionObserver' in window)) {
      for (var i = 0; i < items.length; i++) { items[i].classList.add('is-in'); }
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-in');
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    for (var j = 0; j < items.length; j++) { io.observe(items[j]); }
  }

  /* ------------------------------------------------------------ счётчики */

  function animateNumber(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) { return; }
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';

    if (REDUCED) { el.textContent = prefix + target + suffix; return; }

    var started = null;
    function step(ts) {
      if (started === null) { started = ts; }
      var p = Math.min((ts - started) / 900, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) { requestAnimationFrame(step); }
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) { return; }

    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < nums.length; i++) { animateNumber(nums[i]); }
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          animateNumber(entries[i].target);
          io.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.4 });

    for (var j = 0; j < nums.length; j++) { io.observe(nums[j]); }
  }

  /* --------------------------------- кнопки, которые тянутся за курсором */

  function initMagnetic() {
    if (!CAN_HOVER || REDUCED) { return; }
    var items = document.querySelectorAll('.js-magnetic');
    var POWER = 7;

    function attach(el) {
      el.addEventListener('mousemove', function (ev) {
        var r = el.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transform = 'translate3d(' + (dx * POWER) + 'px,' + (dy * POWER) + 'px,0)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    }

    for (var i = 0; i < items.length; i++) { attach(items[i]); }
  }

  /* -------------------------------------- подсветка блока под курсором */

  function initSpotlight() {
    if (!CAN_HOVER || REDUCED) { return; }
    var items = document.querySelectorAll('.card, .pkg, .step, .stat');

    function attach(el) {
      el.addEventListener('mousemove', function (ev) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        el.style.setProperty('--my', (ev.clientY - r.top) + 'px');
      });
    }

    for (var i = 0; i < items.length; i++) { attach(items[i]); }
  }

  /* ------------------------------- текст, который печатается при наведении */

  function initTypewriter() {
    var items = document.querySelectorAll('.js-type');
    if (!items.length || REDUCED) { return; }

    function attach(host, el) {
      var text = el.getAttribute('data-text') || el.textContent;
      var timer = null;
      var pos = 0;

      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      function type() {
        stop();
        host.classList.add('is-typing');
        pos = 0;
        el.textContent = '';
        timer = setInterval(function () {
          pos++;
          el.textContent = text.slice(0, pos);
          if (pos >= text.length) {
            stop();
            host.classList.remove('is-typing');
          }
        }, 45);
      }

      function restore() {
        stop();
        host.classList.remove('is-typing');
        el.textContent = text;
      }

      host.addEventListener('mouseenter', type);
      host.addEventListener('mouseleave', restore);
      host.addEventListener('focusin', type);
      host.addEventListener('focusout', restore);
    }

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var host = el.closest('.btn') || el.parentNode;
      if (host) { attach(host, el); }
    }
  }

  /* -------------------------------------- отправка заявки на почту */

  function endpoint(subject) {
    if (CFG.PROVIDER === 'web3forms') {
      return {
        url: 'https://api.web3forms.com/submit',
        base: {
          access_key: CFG.ACCESS_KEY,
          subject: subject,
          from_name: CFG.SITE_NAME || 'Живой клик'
        }
      };
    }
    return {
      url: 'https://formsubmit.co/ajax/' + CFG.EMAIL,
      base: { _subject: subject, _template: 'table', _captcha: 'false' }
    };
  }

  function setStatus(el, text, kind) {
    if (!el) { return; }
    el.textContent = text || '';
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  function deliver(url, body, done) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        return res.json()
          .catch(function () { return {}; })
          .then(function (json) { return { httpOk: res.ok, json: json }; });
      })
      .then(function (r) {
        var msg = (r.json && (r.json.message || r.json.error))
          ? String(r.json.message || r.json.error) : '';
        var ok;
        if (r.json && typeof r.json.success !== 'undefined') {
          ok = (r.json.success === true || r.json.success === 'true');
        } else {
          ok = r.httpOk;
        }
        done(ok, /activat|confirm/i.test(msg) ? 'activate' : 'other');
      })
      .catch(function () { done(false, 'other'); });
  }

  function mailtoLink(payload, subject) {
    var lines = [];
    for (var k in payload) {
      if (payload.hasOwnProperty(k) && payload[k]) { lines.push(k + ': ' + payload[k]); }
    }
    return 'mailto:' + CFG.EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function sendForm(form) {
    var status = form.querySelector('.status');
    var btn = form.querySelector('button[type="submit"]');
    var area = form.querySelector('textarea[name="message"]');
    var contact = form.querySelector('input[name="contact"]');
    var name = form.querySelector('input[name="name"]');
    var text = area ? area.value.trim() : '';

    if (!text) {
      setStatus(status, 'Напишите, пожалуйста, пару строк — что нужно сделать.', 'err');
      if (area) { area.focus(); }
      return;
    }

    var payload = {
      'Имя': name ? name.value.trim() : '',
      'Контакт для ответа': contact ? contact.value.trim() : '',
      'Сообщение': text,
      'Страница': document.title,
      'Отправлено': new Date().toLocaleString('ru-RU')
    };
    var subject = CFG.SUBJECT_PREFIX || 'Заявка с сайта';

    var ep = endpoint(subject);
    var body = ep.base;
    if (CFG.PROVIDER !== 'web3forms' &&
        payload['Контакт для ответа'] && payload['Контакт для ответа'].indexOf('@') > -1) {
      body.email = payload['Контакт для ответа'];
    }
    for (var k in payload) { if (payload.hasOwnProperty(k)) { body[k] = payload[k]; } }

    if (btn) { btn.disabled = true; }
    setStatus(status, 'Отправляется…');

    var draftKey = 'zhivoy_klik_draft_' + (form.getAttribute('data-form-id') || 'main');

    deliver(ep.url, body, function (ok, reason) {
      if (btn) { btn.disabled = false; }
      if (ok) {
        setStatus(status, 'Спасибо! Заявка у меня на почте — отвечу лично.', 'ok');
        if (area) { area.value = ''; }
        if (contact) { contact.value = ''; }
        try { localStorage.removeItem(draftKey); } catch (e) {}
        if (CFG.THANKS_URL) { window.location.href = CFG.THANKS_URL; }
        return;
      }
      var mailHref = mailtoLink(payload, subject).replace(/"/g, '%22');
      if (!status) { return; }
      status.className = 'status err';
      if (reason === 'activate') {
        status.innerHTML = 'Почта сервиса ещё не подтверждена. ' +
          '<a href="' + mailHref + '">Напишите мне письмом вручную</a> — я всё получу и отвечу.';
      } else {
        status.innerHTML = 'Сервис отправки недоступен. ' +
          '<a href="' + mailHref + '">Откройте готовое письмо</a> — текст уже подставлен.';
      }
    });
  }

  function initForms() {
    var forms = document.querySelectorAll('form.js-contact');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        var area = form.querySelector('textarea[name="message"]');
        var draftKey = 'zhivoy_klik_draft_' + (form.getAttribute('data-form-id') || 'main');
        if (area) {
          try {
            var saved = localStorage.getItem(draftKey);
            if (saved) { area.value = saved; }
          } catch (e) {}
          area.addEventListener('input', function () {
            try { localStorage.setItem(draftKey, area.value); } catch (e) {}
          });
        }
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          sendForm(form);
        });
      })(forms[i]);
    }
  }

  /* заход по ссылке с QR (#contact) — доводим до формы */

  function initHashScroll() {
    if (location.hash !== '#contact') { return; }
    var jump = function () {
      var el = document.getElementById('contact');
      if (el && el.scrollIntoView) { el.scrollIntoView({ block: 'start' }); }
    };
    if (document.readyState === 'complete') { jump(); }
    else { window.addEventListener('load', jump); }
  }

  /* ------------------------------------------- прогресс чтения и «вверх» */

  function initReadProgress() {
    if (REDUCED) { return; }
    var bar = document.createElement('div');
    bar.className = 'readbar';
    document.body.appendChild(bar);

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
      bar.style.width = (p * 100) + '%';
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initUpButton() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'up';
    btn.setAttribute('aria-label', 'Наверх');
    btn.title = 'Наверх';
    btn.innerHTML = '&uarr;';
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });
    document.body.appendChild(btn);

    function update() {
      btn.className = 'up' + (window.pageYOffset > 600 ? ' is-show' : '');
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    update();
  }

  /* ----------------------------------- наклон фотографий под курсором */

  function initTilt() {
    if (!CAN_HOVER || REDUCED) { return; }
    var items = document.querySelectorAll('.work, .shot');
    var POWER = 5;

    function attach(el) {
      el.addEventListener('mousemove', function (ev) {
        var r = el.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transform = 'perspective(900px) rotateX(' + (-dy * POWER) +
          'deg) rotateY(' + (dx * POWER) + 'deg)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    }

    for (var i = 0; i < items.length; i++) { attach(items[i]); }
  }

  /* ------------------------------------- текущий год в подвале «© 2026» */

  function initYear() {
    var items = document.querySelectorAll('[data-year]');
    var year = String(new Date().getFullYear());
    for (var i = 0; i < items.length; i++) { items[i].textContent = year; }
  }

  /* --------------------------------------------------------------- старт */

  function start() {
    initNav();
    initReveal();
    initCounters();
    initMagnetic();
    initSpotlight();
    initTypewriter();
    initForms();
    initHashScroll();
    initReadProgress();
    initUpButton();
    initTilt();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }


})();

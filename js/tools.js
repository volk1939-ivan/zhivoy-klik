/* ==========================================================================
   «Живой клик» — общие инструменты для страниц с формой
   (калькулятор, конструктор объявления, политика).

   Здесь только то, что повторяется: сумма, копирование в буфер, черновик
   в localStorage, отправка письма на почту с копией клиенту и запрос
   «прошу удалить мои данные». Ни одной сторонней библиотеки.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.CONFIG || {};

  /* --------------------------------------------------------------- сумма */

  function money(n) {
    n = Math.round(Number(n) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  function num(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* ---------------------------------------------------------- копирование */

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var done = document.execCommand('copy');
      document.body.removeChild(ta);
      return done;
    } catch (e) { return false; }
  }

  function copy(text, done) {
    function report(result) { if (done) { done(!!result); } }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { report(true); },
        function () { report(fallbackCopy(text)); }
      );
      return;
    }
    report(fallbackCopy(text));
  }

  /* ------------------------------------------------------------ черновик */

  function key(name) { return 'zhivoy_klik_' + name; }

  function saveDraft(name, data) {
    try { localStorage.setItem(key(name), JSON.stringify(data)); } catch (e) {}
  }

  function loadDraft(name) {
    try {
      var raw = localStorage.getItem(key(name));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearDraft(name) {
    try { localStorage.removeItem(key(name)); } catch (e) {}
  }

  /* -------------------------------------------------- отправка на почту */

  function endpoint(subject) {
    if (CFG.PROVIDER === 'web3forms') {
      return {
        url: 'https://api.web3forms.com/submit',
        base: {
          access_key: CFG.ACCESS_KEY,
          subject: subject,
          from_name: CFG.SITE_NAME || 'Живой клик'
        },
        ccField: null
      };
    }
    return {
      url: 'https://formsubmit.co/ajax/' + CFG.EMAIL,
      base: { _subject: subject, _template: 'table', _captcha: 'false' },
      ccField: '_cc'
    };
  }

  function setStatus(el, text, kind) {
    if (!el) { return; }
    el.textContent = text || '';
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  function mailto(subject, payload, cc) {
    var lines = [];
    for (var k in payload) {
      if (payload.hasOwnProperty(k) && payload[k]) { lines.push(k + ': ' + payload[k]); }
    }
    if (cc) { lines.push('Копия: ' + cc); }
    return 'mailto:' + CFG.EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
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

  /* Универсальная отправка: письмо автору + копия клиенту (если задана).
     opts = { payload, subject, cc, status, button, onOk, onFail } */
  function send(opts) {
    opts = opts || {};
    var status = opts.status || null;
    var btn = opts.button || null;
    var subject = opts.subject || CFG.SUBJECT_PREFIX || 'Заявка с сайта';
    var payload = opts.payload || {};
    var cc = opts.cc || '';

    var ep = endpoint(subject);
    var body = {};
    var k;
    for (k in ep.base) { if (ep.base.hasOwnProperty(k)) { body[k] = ep.base[k]; } }
    for (k in payload) { if (payload.hasOwnProperty(k)) { body[k] = payload[k]; } }

    if (cc && ep.ccField) { body[ep.ccField] = cc; }
    if (cc) { body._replyto = cc; }
    if (opts.replyTo) { body._replyto = opts.replyTo; }

    if (btn) { btn.disabled = true; }
    setStatus(status, opts.pendingText || 'Отправляется…');

    deliver(ep.url, body, function (ok, reason) {
      if (btn) { btn.disabled = false; }
      if (ok) {
        setStatus(status, opts.okText || 'Готово! Письмо отправлено — проверьте почту.', 'ok');
        if (opts.onOk) { opts.onOk(); }
        return;
      }
      var href = mailto(subject, payload, ep.ccField ? cc : '').replace(/"/g, '%22');
      if (status) {
        status.className = 'status err';
        if (reason === 'activate') {
          status.innerHTML = 'Почта сервиса ещё не подтверждена. ' +
            '<a href="' + href + '">Напишите письмом вручную</a> — я всё получу и отвечу.';
        } else {
          status.innerHTML = 'Сервис отправки недоступен. ' +
            '<a href="' + href + '">Откройте готовое письмо</a> — текст уже подставлен.';
        }
      }
      if (opts.onFail) { opts.onFail(href); }
    });
  }

  /* ------------------------------------------------- «прошу удалить» */

  var ERASE = 'Прошу удалить мои данные после ответа.';

  function eraseNote(checked) { return checked ? ERASE : ''; }

  function eraseRequest(comment) {
    return {
      subject: 'Живой клик — прошу удалить мои данные',
      payload: {
        'Запрос': ERASE,
        'Комментарий': comment || '',
        'Страница': document.title,
        'Отправлено': new Date().toLocaleString('ru-RU')
      }
    };
  }

  /* ==================== панель «Написать письмо» ==================== */

  var PANEL_DRAFT = 'panel';
  var panel = null;
  var panelLastFocus = null;

  var CHIPS = [
    { label: 'Нужен сайт', text: 'Здравствуйте! Нужен сайт. Дело такое: ' },
    { label: 'Заявки к готовому сайту', text: 'Здравствуйте! Сайт уже есть, нужен приём заявок на почту. Адрес сайта: ' },
    { label: 'Калькулятор для клиентов', text: 'Здравствуйте! Интересен калькулятор стоимости для моих клиентов. Мои услуги: ' },
    { label: 'Конструктор объявления', text: 'Здравствуйте! Нужен конструктор объявления. О чём объявление: ' },
    { label: 'Пришлите реквизиты', text: 'Здравствуйте! Пришлите, пожалуйста, Ваши реквизиты (ФИО, ИНН).' },
    { label: 'Другое', text: '' }
  ];

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function buildPanel() {
    if (panel) { return panel; }

    var chips = '';
    for (var i = 0; i < CHIPS.length; i++) {
      chips += '<button type="button" class="wl__chip" data-text="' +
        escapeAttr(CHIPS[i].text) + '">' + CHIPS[i].label + '</button>';
    }

    panel = document.createElement('div');
    panel.className = 'wl';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'wlTitle');
    panel.innerHTML =
      '<div class="wl__backdrop" data-close="1"></div>' +
      '<div class="wl__panel">' +
        '<div class="wl__head">' +
          '<h2 class="wl__title" id="wlTitle">Написать письмо</h2>' +
          '<button type="button" class="wl__close" data-close="1" aria-label="Закрыть">&times;</button>' +
        '</div>' +
        '<p class="wl__notbot">это не бот — письмо читаю я и отвечаю лично</p>' +
        '<div class="wl__chips">' + chips + '</div>' +
        '<form class="wl__form" novalidate>' +
          '<div class="field">' +
            '<label for="wl-text">Ваше сообщение *</label>' +
            '<textarea id="wl-text" rows="5" placeholder="Пара строк — остальное спрошу сам"></textarea>' +
          '</div>' +
          '<div class="field">' +
            '<label for="wl-contact">Куда ответить <span aria-hidden="true">— по желанию</span></label>' +
            '<input type="text" id="wl-contact" name="contact" placeholder="e-mail, телефон или @ник">' +
          '</div>' +
          '<div class="form__row">' +
            '<button type="submit" class="btn btn--primary"><span class="btn__text">Отправить</span></button>' +
            '<span class="status" role="status" aria-live="polite"></span>' +
          '</div>' +
          '<p class="hint wl__foot">Письмо уходит мне на почту напрямую, без ботов и посредников. ' +
            'Черновик сохраняется в Вашем браузере.</p>' +
        '</form>' +
      '</div>';

    document.body.appendChild(panel);
    return panel;
  }

  function panelKey(ev) {
    if (ev.key === 'Escape' || ev.keyCode === 27) { ev.preventDefault(); closePanel(); return; }
    if (ev.key !== 'Tab' && ev.keyCode !== 9) { return; }
    var items = panel.querySelectorAll('button, [href], input, textarea, select');
    if (!items.length) { return; }
    var first = items[0];
    var last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }

  function openPanel(prefill) {
    var p = buildPanel();
    var area = p.querySelector('#wl-text');
    var toggle = document.querySelector('.wl-toggle');
    panelLastFocus = document.activeElement;
    if (prefill) { insertTemplate(prefill); }
    p.hidden = false;
    document.documentElement.classList.add('wl-locked');
    if (toggle) { toggle.hidden = true; }
    p.classList.add('is-shown');
    requestAnimationFrame(function () { p.classList.add('is-open'); });
    if (area) { area.focus(); }
    document.addEventListener('keydown', panelKey);
  }

  function closePanel() {
    if (!panel) { return; }
    var toggle = document.querySelector('.wl-toggle');
    panel.classList.remove('is-open');
    document.documentElement.classList.remove('wl-locked');
    if (toggle) { toggle.hidden = false; }
    document.removeEventListener('keydown', panelKey);
    window.setTimeout(function () {
      panel.hidden = true;
      panel.classList.remove('is-shown');
    }, 260);
    if (panelLastFocus && panelLastFocus.focus) { panelLastFocus.focus(); }
  }

  function insertTemplate(text) {
    var area = buildPanel().querySelector('#wl-text');
    if (!area || !text) { return; }
    var val = area.value.trim();
    area.value = val ? (val + '\n' + text) : text;
    saveDraft(PANEL_DRAFT, area.value);
    area.focus();
  }

  function initPanel() {
    var p = buildPanel();

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'wl-toggle';
    toggle.setAttribute('aria-haspopup', 'dialog');
    toggle.innerHTML = '<svg class="wl-toggle__icon" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18v12H3z"/>' +
      '<path d="M3 7l9 6 9-6"/></svg><span>Написать письмо</span>';
    toggle.addEventListener('click', function () { openPanel(''); });
    document.body.appendChild(toggle);

    p.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) { return; }
      if (t.getAttribute('data-close')) { closePanel(); return; }
      if (t.classList && t.classList.contains('wl__chip')) {
        insertTemplate(t.getAttribute('data-text'));
      }
    });

    document.addEventListener('click', function (ev) {
      var el = (ev.target && ev.target.closest) ? ev.target.closest('[data-letter]') : null;
      if (!el) { return; }
      ev.preventDefault();
      openPanel(el.getAttribute('data-letter') || '');
    });

    var area = p.querySelector('#wl-text');
    var contact = p.querySelector('#wl-contact');
    var status = p.querySelector('.status');
    var form = p.querySelector('form');
    var saved = loadDraft(PANEL_DRAFT);
    if (area && saved) { area.value = saved; }
    if (area) {
      area.addEventListener('input', function () { saveDraft(PANEL_DRAFT, area.value); });
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var text = area ? (area.value || '').trim() : '';
      var cval = contact ? contact.value.trim() : '';
      if (!text) {
        setStatus(status, 'Напишите, пожалуйста, пару строк — что нужно сделать.', 'err');
        if (area) { area.focus(); }
        return;
      }
      var hasMail = cval.indexOf('@') > -1;
      send({
        subject: 'Живой клик — письмо с сайта',
        payload: {
          'Сообщение': text,
          'Контакт для ответа': cval,
          'Страница': document.title,
          'Отправлено': new Date().toLocaleString('ru-RU')
        },
        cc: hasMail ? cval : '',
        replyTo: hasMail ? cval : '',
        status: status,
        button: form.querySelector('button[type="submit"]'),
        okText: 'Спасибо! Письмо у меня — отвечу лично.',
        onOk: function () {
          area.value = '';
          if (contact) { contact.value = ''; }
          clearDraft(PANEL_DRAFT);
        }
      });
    });
  }

  window.Tools = {
    money: money,
    num: num,
    copy: copy,
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    mailto: mailto,
    send: send,
    setStatus: setStatus,
    eraseNote: eraseNote,
    eraseRequest: eraseRequest,
    openPanel: openPanel,
    closePanel: closePanel,
    ERASE: ERASE
  };

  /* ------------------- автозапуск: форма «Прошу удалить мои данные» */

  function fieldValue(scope, name) {
    var el = scope.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function initEraseForms() {
    var forms = document.querySelectorAll('form.js-erase');
    for (var i = 0; i < forms.length; i++) {
      (function (f) {
        f.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var contact = fieldValue(f, 'contact');
          var req = eraseRequest(fieldValue(f, 'note'));
          if (contact) { req.payload['Контакт для ответа'] = contact; }
          var hasMail = contact.indexOf('@') > -1;
          send({
            payload: req.payload,
            subject: req.subject,
            cc: hasMail ? contact : '',
            replyTo: hasMail ? contact : '',
            status: f.querySelector('.status'),
            button: f.querySelector('button[type="submit"]'),
            okText: 'Запрос принят — удаляю переписку. Подтверждение отправлю, если Вы оставили контакт.'
          });
        });
      })(forms[i]);
    }
  }

  /* кнопки «скопировать» с готовым текстом: <button data-copy="текст"> */

  function initCopyButtons() {
    var items = document.querySelectorAll('[data-copy]');
    for (var i = 0; i < items.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          var value = el.getAttribute('data-copy') || '';
          copy(value, function (ok) {
            var badge = el.parentNode ? el.parentNode.querySelector('.status') : null;
            setStatus(badge,
              ok ? 'Скопировано: ' + value : 'Не получилось скопировать — выделите вручную.',
              ok ? 'ok' : 'err');
          });
        });
      })(items[i]);
    }
  }

  function start() { initEraseForms(); initPanel(); initCopyButtons(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();

/* ==========================================================================
   «Живой клик» — страница «Расчёт стоимости».
   Считает ориентир по выбранному составу работы, показывает расшифровку,
   живой макет письма, копирование и отправку расчёта себе на почту
   (письмо автору + копия клиенту). Без сторонних библиотек.
   ========================================================================== */

(function () {
  'use strict';

  var T = window.Tools;
  var CFG = window.CONFIG || {};
  var form = document.getElementById('calcForm');
  if (!T || !form) { return; }

  var PRICES = {
    service: {
      viz:   { name: 'Визитка · 1 страница',                 price: 3900,  days: 3 },
      sv:    { name: 'Сайт-визитка · до 5 разделов',         price: 7900,  days: 5 },
      mp:    { name: 'Многостраничный сайт · до 8 страниц',  price: 14900, days: 7 },
      forms: { name: 'Приём заявок к готовому сайту',        price: 1900,  days: 2 },
      text:  { name: 'Текст 1500–2000 знаков',               price: 800,   days: 1 }
    },
    site: ['viz', 'sv', 'mp'],
    tool: { calc: { name: 'Калькулятор стоимости', price: 4900 },
            konstr: { name: 'Конструктор объявления', price: 5900 } },
    both: 8900,
    extra: { catalog: { name: 'Раздел-каталог 10–30 страниц', price: 4000 },
             phone:   { name: 'Кнопка «Позвонить» и поле «Телефон»', price: 500 },
             tg:      { name: 'Уведомления о заявках в Telegram', price: 1500 } },
    page: 1200,
    edits: 900,
    discount: 2000,
    bonusFrom: 7900,
    terms: { normal: { name: 'обычные сроки', rate: 0 },
             fast:   { name: 'ускоренно', rate: 0.3 },
             urgent: { name: 'сегодня-завтра', rate: 0.5 } }
  };

  var els = {
    sum:        document.getElementById('calcSum'),
    range:      document.getElementById('calcRange'),
    lines:      document.getElementById('calcLines'),
    textCount:  document.getElementById('textCount'),
    copy:       document.getElementById('calcCopy'),
    copyStatus: document.getElementById('calcCopyStatus'),
    mailLines:  document.getElementById('mailLines'),
    mailSum:    document.getElementById('mailSum'),
    mailTo:     document.getElementById('mailTo'),
    mailtoLink: document.getElementById('calcMailto'),
    panel:      document.getElementById('calcPanel'),
    panelSum:   document.getElementById('calcPanelSum'),
    result:     document.getElementById('calcResult'),
    sendForm:   document.querySelector('.js-calc-send')
  };

  function radioVal(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function isChecked(name, value) {
    var el = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
    return !!(el && el.checked);
  }
  function intVal(name) {
    var el = form.querySelector('input[name="' + name + '"]');
    var n = el ? parseInt(el.value, 10) : 0;
    return (isNaN(n) || n < 0) ? 0 : n;
  }

  function readState() {
    return {
      service: radioVal('service') || 'viz',
      texts:   Math.max(1, intVal('texts') || 1),
      tools:   { calc: isChecked('tool', 'calc'), konstr: isChecked('tool', 'konstr') },
      extras:  { catalog: isChecked('extra', 'catalog'),
                 phone: isChecked('extra', 'phone'),
                 tg: isChecked('extra', 'tg') },
      pages:   intVal('pages'),
      terms:   radioVal('terms') || 'normal',
      edits:   radioVal('edits') || 'base'
    };
  }

  /* ----------------------------------------------------- расчёт и строки */

  function compute(s) {
    var svc = PRICES.service[s.service] || PRICES.service.viz;
    var basePrice, baseLabel;
    if (s.service === 'text') {
      basePrice = svc.price * s.texts;
      baseLabel = svc.name + (s.texts > 1 ? ' × ' + s.texts : '');
    } else {
      basePrice = svc.price;
      baseLabel = svc.name;
    }

    var both = s.tools.calc && s.tools.konstr;
    var toolsSum = both ? PRICES.both
      : (s.tools.calc ? PRICES.tool.calc.price : 0) +
        (s.tools.konstr ? PRICES.tool.konstr.price : 0);

    var lines = [{ label: baseLabel, value: T.money(basePrice) }];

    if (both) {
      lines.push({ label: 'Калькулятор + конструктор вместе', value: T.money(PRICES.both) });
    } else if (s.tools.calc) {
      lines.push({ label: PRICES.tool.calc.name, value: T.money(PRICES.tool.calc.price) });
    } else if (s.tools.konstr) {
      lines.push({ label: PRICES.tool.konstr.name, value: T.money(PRICES.tool.konstr.price) });
    }

    var extrasCore = 0;
    if (s.pages > 0) {
      extrasCore += s.pages * PRICES.page;
      lines.push({ label: 'Дополнительные страницы × ' + s.pages,
                   value: T.money(s.pages * PRICES.page) });
    }
    if (s.extras.catalog) {
      extrasCore += PRICES.extra.catalog.price;
      lines.push({ label: PRICES.extra.catalog.name, value: T.money(PRICES.extra.catalog.price) });
    }
    if (s.extras.tg) {
      extrasCore += PRICES.extra.tg.price;
      lines.push({ label: PRICES.extra.tg.name, value: T.money(PRICES.extra.tg.price) });
    }

    var coreTotal = basePrice + toolsSum + extrasCore;

    var phonePrice = 0, phoneFree = false;
    if (s.extras.phone) {
      if (coreTotal >= PRICES.bonusFrom) { phoneFree = true; }
      else { phonePrice = PRICES.extra.phone.price; }
      lines.push({ label: PRICES.extra.phone.name + (phoneFree ? ' — бонус' : ''),
                   value: phoneFree ? '0 ₽' : T.money(phonePrice) });
    }

    var isSite = PRICES.site.indexOf(s.service) > -1;
    var discount = (isSite && both) ? PRICES.discount : 0;
    if (discount) {
      lines.push({ label: 'Скидка за пакет: сайт + оба инструмента',
                   value: '−' + T.money(discount), cls: 'is-minus' });
    }

    var subtotal = coreTotal + phonePrice - discount;
    var terms = PRICES.terms[s.terms] || PRICES.terms.normal;
    var afterTerms = Math.round(subtotal * (1 + terms.rate));
    if (terms.rate > 0) {
      lines.push({ label: 'Сроки: ' + terms.name + ' (+' + Math.round(terms.rate * 100) + '%)',
                   value: '+' + T.money(afterTerms - subtotal) });
    }

    if (s.edits === 'extra') {
      lines.push({ label: 'Дополнительный круг правок', value: '+' + T.money(PRICES.edits) });
    }

    var total = afterTerms + (s.edits === 'extra' ? PRICES.edits : 0);
    var min = Math.round(total * 0.9);
    var max = Math.round(total * 1.1);

    var days = svc.days || 3;
    if (s.tools.calc || s.tools.konstr) { days += 2; }
    if (s.extras.catalog) { days += 1; }
    if (s.pages > 0) { days += Math.min(s.pages, 5); }
    if (terms.rate === 0.3) { days = Math.max(1, Math.round(days * 0.7)); }
    if (terms.rate === 0.5) { days = Math.max(1, Math.round(days * 0.5)); }

    return { lines: lines, total: total, min: min, max: max, days: days,
             phoneFree: phoneFree, terms: terms };
  }

  /* ---------------------------------------------------------- отрисовка */

  function renderLines(list, lines, max) {
    var html = '';
    var shown = max ? lines.slice(0, max) : lines;
    for (var i = 0; i < shown.length; i++) {
      var li = shown[i];
      html += '<li' + (li.cls ? ' class="' + li.cls + '"' : '') + '>' +
        '<span>' + li.label + '</span>' +
        '<span class="calc__val">' + li.value + '</span></li>';
    }
    if (max && lines.length > max) {
      html += '<li><span>и ещё ' + (lines.length - max) + ' пункт(а) — в полном письме</span>' +
        '<span class="calc__val">…</span></li>';
    }
    list.innerHTML = html;
  }

  function plainText(s, r) {
    var out = ['Расчёт с сайта «Живой клик»'];
    for (var i = 0; i < r.lines.length; i++) {
      out.push(r.lines[i].label + ': ' + r.lines[i].value);
    }
    out.push('Итого ориентир: ' + T.money(r.total) +
      ' (вилка ±10%: ' + T.money(r.min) + '–' + T.money(r.max) + ')');
    out.push('Срок: примерно ' + r.days + ' дней (' + r.terms.name + ')');
    out.push('Размещение уже входит в стоимость, ежемесячных платежей нет.');
    return out.join('\n');
  }

  var lastState = null;
  var lastResult = null;

  function render() {
    var s = readState();
    var r = compute(s);
    lastState = s;
    lastResult = r;

    if (els.textCount) { els.textCount.hidden = (s.service !== 'text'); }

    if (els.sum) { els.sum.textContent = T.money(r.total); }
    if (els.range) {
      els.range.textContent = 'вилка ±10%: ' + T.money(r.min) + '–' + T.money(r.max) +
        ' · срок ≈ ' + r.days + ' дн. (' + r.terms.name + ')';
    }
    if (els.lines) { renderLines(els.lines, r.lines); }
    if (els.mailLines) { renderLines(els.mailLines, r.lines, 4); }
    if (els.mailSum) { els.mailSum.textContent = 'ориентир ' + T.money(r.total) + ' · ≈ ' + r.days + ' дн.'; }
    if (els.panelSum) { els.panelSum.textContent = T.money(r.total); }

    updateMailto();
    updatePanel();
    saveState(s);
  }

  /* -------------------------------------------------- ссылка «письмом» */

  function currentEmail() {
    var el = els.sendForm ? els.sendForm.querySelector('input[name="email"]') : null;
    return el ? el.value.trim() : '';
  }

  function buildPayload(s, r) {
    return {
      'Расчёт': plainText(s, r),
      'Итог (ориентир)': T.money(r.total) + ' (вилка ' + T.money(r.min) + '–' + T.money(r.max) + ')',
      'Срок': '≈ ' + r.days + ' дней, ' + r.terms.name,
      'Страница': document.title,
      'Отправлено': new Date().toLocaleString('ru-RU')
    };
  }

  function updateMailto() {
    if (!els.mailtoLink || !lastResult) { return; }
    var subject = 'Живой клик — расчёт стоимости';
    els.mailtoLink.setAttribute('href', T.mailto(subject, buildPayload(lastState, lastResult), currentEmail()));
  }

  /* --------------------------------------------------- липкая мини-панель */

  function updatePanel() {
    if (!els.panel) { return; }
    var show = false;
    if (window.innerWidth <= 900) {
      var r = els.result ? els.result.getBoundingClientRect() : null;
      var send = document.getElementById('calc-send');
      var sr = send ? send.getBoundingClientRect() : null;
      if (r && r.bottom < 0 && (!sr || sr.top > window.innerHeight)) { show = true; }
    }
    els.panel.hidden = !show;
    els.panel.classList.toggle('is-show', show);
  }

  /* ------------------------------------------------------------ черновик */

  var DRAFT = 'raschet';
  var TOOLS = ['calc', 'konstr'];
  var EXTRAS = ['catalog', 'phone', 'tg'];

  function collectDraft(s) {
    var d = {
      service: s.service, texts: s.texts, pages: s.pages,
      terms: s.terms, edits: s.edits, tools: [], extras: []
    };
    var i;
    for (i = 0; i < TOOLS.length; i++) { if (s.tools[TOOLS[i]]) { d.tools.push(TOOLS[i]); } }
    for (i = 0; i < EXTRAS.length; i++) { if (s.extras[EXTRAS[i]]) { d.extras.push(EXTRAS[i]); } }
    var f = els.sendForm;
    if (f) {
      d.name = valueOf(f, 'name');
      d.email = valueOf(f, 'email');
      var c = f.querySelector('textarea[name="comment"]');
      var er = f.querySelector('input[name="erase"]');
      d.comment = c ? c.value : '';
      d.erase = !!(er && er.checked);
    }
    return d;
  }

  function saveState(s) { T.saveDraft(DRAFT, collectDraft(s)); }

  function valueOf(scope, name) {
    var el = scope.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function applyDraft(d) {
    if (!d) { return; }
    function setRadio(name, value) {
      var el = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (el) { el.checked = true; }
    }
    function setBox(name, value, on) {
      var el = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (el) { el.checked = !!on; }
    }
    function setNum(name, value) {
      var el = form.querySelector('input[name="' + name + '"]');
      if (el && typeof value !== 'undefined' && value !== null) { el.value = value; }
    }
    function inList(list, value) { return !!list && list.indexOf(value) > -1; }

    if (d.service) { setRadio('service', d.service); }
    if (d.terms) { setRadio('terms', d.terms); }
    if (d.edits) { setRadio('edits', d.edits); }
    setNum('texts', d.texts);
    setNum('pages', d.pages);
    var i;
    for (i = 0; i < TOOLS.length; i++) { setBox('tool', TOOLS[i], inList(d.tools, TOOLS[i])); }
    for (i = 0; i < EXTRAS.length; i++) { setBox('extra', EXTRAS[i], inList(d.extras, EXTRAS[i])); }

    var f = els.sendForm;
    if (f) {
      var n = f.querySelector('input[name="name"]');
      var e = f.querySelector('input[name="email"]');
      var c = f.querySelector('textarea[name="comment"]');
      var er = f.querySelector('input[name="erase"]');
      if (n && d.name) { n.value = d.name; }
      if (e && d.email) { e.value = d.email; }
      if (c && d.comment) { c.value = d.comment; }
      if (er) { er.checked = !!d.erase; }
    }
  }

  /* --------------------------------------------------------- копирование */

  function initCopy() {
    if (!els.copy) { return; }
    els.copy.addEventListener('click', function () {
      if (!lastResult) { return; }
      T.copy(plainText(lastState, lastResult), function (ok) {
        T.setStatus(els.copyStatus,
          ok ? 'Расчёт скопирован — можно вставить в письмо или заметку.'
             : 'Не получилось скопировать автоматически. Выделите текст расчёта вручную.',
          ok ? 'ok' : 'err');
      });
    });
  }

  /* ------------------------------------------------------------ отправка */

  function refreshMailTo() {
    if (!els.mailTo) { return; }
    els.mailTo.textContent = 'кому: ' + (CFG.EMAIL || 'почта автора') +
      ' · копия: ' + (currentEmail() || 'вы');
  }

  function initSend() {
    var f = els.sendForm;
    if (els.mailtoLink) {
      els.mailtoLink.addEventListener('click', function (ev) {
        if (els.mailtoLink.getAttribute('href') === '#') { ev.preventDefault(); }
      });
    }
    if (!f) { return; }

    f.addEventListener('input', function () {
      updateMailto();
      refreshMailTo();
      saveState(readState());
    });

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!lastResult) { return; }
      var status = f.querySelector('.status');
      var btn = f.querySelector('button[type="submit"]');
      var email = currentEmail();
      var payload = buildPayload(lastState, lastResult);
      payload['Имя'] = valueOf(f, 'name');
      payload['Комментарий'] = valueOf(f, 'comment');
      var eraseEl = f.querySelector('input[name="erase"]');
      if (eraseEl && eraseEl.checked) { payload['Просьба'] = T.ERASE; }
      if (email) { payload['Копия вам'] = email; }

      T.send({
        payload: payload,
        subject: 'Живой клик — расчёт стоимости',
        cc: email,
        replyTo: email,
        status: status,
        button: btn,
        okText: email
          ? 'Расчёт отправлен: письмо мне и копия на ' + email + '.'
          : 'Расчёт отправлен мне. Укажите e-mail — пришлю копию вам.',
        onOk: function () {
          var c = f.querySelector('textarea[name="comment"]');
          if (c) { c.value = ''; }
        }
      });
    });
  }

  /* --------------------------------------------------------------- старт */

  function init() {
    var saved = T.loadDraft(DRAFT);
    if (saved) { applyDraft(saved); }

    form.addEventListener('submit', function (ev) { ev.preventDefault(); });
    form.addEventListener('change', render);
    form.addEventListener('input', render);

    initCopy();
    initSend();
    refreshMailTo();
    updateMailto();
    render();

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(function () { ticking = false; updatePanel(); });
    }, { passive: true });
    window.addEventListener('resize', updatePanel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }




})();

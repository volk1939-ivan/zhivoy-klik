/* ==========================================================================
   «Живой клик» — страница «Конструктор объявления».
   Короткие вопросы → готовый текст для Авито, Telegram, страницы услуги или
   вакансии: заголовок с ограничением по знакам, описание, копирование и
   отправка себе на почту. Без сторонних библиотек.
   ========================================================================== */

(function () {
  'use strict';

  var T = window.Tools;
  var CFG = window.CONFIG || {};
  var form = document.getElementById('konstrForm');
  if (!T || !form) { return; }

  var PLACES = {
    avito: {
      name: 'Авито', titleMax: 50, textMax: 3000,
      note: 'На Авито заголовок — до 50 знаков: дальше он обрезается в списке объявлений.'
    },
    telegram: {
      name: 'Telegram', titleMax: 90, textMax: 4096,
      note: 'В Telegram текст виден абзацами и списками — так его читают с телефона.'
    },
    usluga: {
      name: 'страница услуги', titleMax: 70, textMax: 6000,
      note: 'Для страницы услуги заголовок короткий, а описание можно длиннее — это помогает поиску.'
    },
    vacancy: {
      name: 'вакансия', titleMax: 80, textMax: 4000,
      note: 'В вакансии важнее всего обязанности и условия — их читают в первую очередь.'
    }
  };

  var els = {
    outTitle:   document.getElementById('k-out-title'),
    outText:    document.getElementById('k-out-text'),
    countTitle: document.getElementById('k-count-title'),
    countText:  document.getElementById('k-count-text'),
    note:       document.getElementById('k-note'),
    editState:  document.getElementById('k-edit-state'),
    rebuild:    document.getElementById('k-rebuild'),
    clearAll:   document.getElementById('k-clear'),
    copyTitle:  document.getElementById('k-copy-title'),
    copyText:   document.getElementById('k-copy-text'),
    copyStatus: document.getElementById('k-copy-status'),
    liveTo:     document.getElementById('liveTo'),
    liveTitle:  document.getElementById('liveTitle'),
    liveLines:  document.getElementById('liveLines'),
    liveSum:    document.getElementById('liveSum'),
    mailto:     document.getElementById('konstrMailto'),
    sendForm:   document.querySelector('.js-konstr-send')
  };

  /* правка вручную: если человек правил текст, поля больше его не переписывают */
  var edited = { title: false, text: false };

  function fv(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }
  function rv(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function has(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return !!(el && el.checked);
  }
  function bullets(text) {
    var raw = String(text || '').split('\n');
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var line = raw[i].replace(/^\s*[-•*]\s*/, '').trim();
      if (line) { out.push(line); }
    }
    return out;
  }
  function read() {
    return {
      place: rv('place') || 'avito',
      tone: rv('tone') || 'business',
      title: fv('title'),
      sense: fv('sense'),
      benefit: fv('benefit'),
      price: fv('price'),
      pay: fv('pay'),
      term: fv('term'),
      delivery: has('delivery'),
      details: bullets(fv('details')),
      city: fv('city'),
      who: fv('who'),
      contact: fv('contact')
    };
  }

  function autoTitle(s) {
    var typed = String(s.title || '').trim();
    if (typed) { return typed; }
    var place = PLACES[s.place] || PLACES.avito;
    var base = (s.sense || s.who || '').split(/[.!?\n]/)[0].trim();
    if (!base) { return ''; }
    if (base.length > place.titleMax) {
      base = base.slice(0, place.titleMax).replace(/\s+\S*$/, '');
    }
    return base;
  }

  function build(s) {
    var place = PLACES[s.place] || PLACES.avito;
    var title = autoTitle(s);
    var L = [];
    var d = s.details;
    var i;

    function put(line) { if (line && String(line).trim()) { L.push(line); } }

    var friendly = (s.tone === 'friendly');
    var short = (s.tone === 'short');
    if (friendly) { put('Здравствуйте!'); L.push(''); }

    if (s.place === 'vacancy') {
      put(s.title ? 'Ищу: ' + s.title : s.sense);
      if (!short && s.title && s.sense) { L.push(''); put(s.sense); }
      if (!short && d.length) {
        L.push(''); put('Что нужно делать:');
        for (i = 0; i < d.length; i++) { put('• ' + d[i]); }
      }
      L.push(''); put('Условия:');
      if (s.price) { put('• Оплата: ' + s.price); }
      if (s.pay) { put('• ' + s.pay); }
      if (s.term) { put('• ' + s.term); }
      if (s.delivery) { put('• Есть доставка'); }
      if (s.benefit && !short) { put('• ' + s.benefit); }
      var tail = [];
      if (s.who) { tail.push(s.who); }
      if (s.city) { tail.push(s.city); }
      if (s.contact) { tail.push('связь: ' + s.contact); }
      L.push(''); put(tail.join(' · '));
    } else if (s.place === 'usluga') {
      put(s.sense || s.title);
      if (!short && (s.benefit || d.length)) {
        L.push(''); put('Почему стоит выбрать:');
        if (s.benefit) { put('• ' + s.benefit); }
        for (i = 0; i < d.length; i++) { put('• ' + d[i]); }
      }
      var cond = [];
      if (s.price) { cond.push('Цена: ' + s.price); }
      if (s.pay) { cond.push(s.pay); }
      if (s.term) { cond.push(s.term); }
      if (s.delivery) { cond.push('Есть доставка'); }
      if (cond.length) {
        L.push('');
        for (i = 0; i < cond.length; i++) { put(cond[i]); }
      }
      L.push('');
      if (s.who) { put(s.who); }
      if (s.city) { put('Город: ' + s.city); }
      if (s.contact) { put('Связаться: ' + s.contact); }
    } else {
      put(s.sense || s.title);
      if (!short && (s.benefit || d.length)) {
        L.push('');
        if (s.benefit) { put('• ' + s.benefit); }
        for (i = 0; i < d.length; i++) { put('• ' + d[i]); }
      }
      var cond2 = [];
      if (s.price) { cond2.push('Цена: ' + s.price); }
      if (s.term) { cond2.push(s.term); }
      if (s.pay && !short) { cond2.push(s.pay); }
      if (s.delivery) { cond2.push('Доставка: есть.'); }
      if (cond2.length) {
        L.push('');
        for (i = 0; i < cond2.length; i++) { put(cond2[i]); }
      }
      L.push('');
      if (s.place === 'avito' && s.city) { put('Город: ' + s.city); }
      if (s.who) { put(s.who); }
      if (s.contact) { put('Связь: ' + s.contact); }
      if (s.place === 'telegram' && s.city) { put('(' + s.city + ')'); }
    }

    if (friendly) { L.push(''); put('Напишите — расскажу подробнее и отвечу лично.'); }

    var text = L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return { title: title, text: text, place: place };
  }

  function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var last = null;

  function currentEmail() {
    var el = els.sendForm ? els.sendForm.querySelector('input[name="email"]') : null;
    return el ? el.value.trim() : '';
  }

  function currentTitle() {
    return els.outTitle ? String(els.outTitle.value || '') : '';
  }
  function currentText() {
    return els.outText ? String(els.outText.value || '') : '';
  }

  function payloadOf(s, r) {
    return {
      'Площадка': r.place.name,
      'Заголовок': currentTitle(),
      'Объявление': currentText(),
      'Цена': s.price,
      'Город': s.city,
      'Контакт': s.contact,
      'Страница': document.title,
      'Отправлено': new Date().toLocaleString('ru-RU')
    };
  }

  function updateMailto() {
    if (!els.mailto || !last) { return; }
    els.mailto.setAttribute('href',
      T.mailto('Живой клик — текст объявления', payloadOf(last.s, last.r), currentEmail()));
  }

  function updateNumbers(place) {
    var tl = currentTitle().length;
    var xl = currentText().length;
    if (els.countTitle) {
      els.countTitle.textContent = 'Заголовок: ' + tl + ' из ' + place.titleMax + ' знаков';
      els.countTitle.className = 'gen__count' + (tl > place.titleMax ? ' is-over' : '');
    }
    if (els.countText) {
      els.countText.textContent = 'Текст: ' + xl + ' из ' + place.textMax + ' знаков';
      els.countText.className = 'gen__count' + (xl > place.textMax ? ' is-over' : '');
    }
  }

  function updatePreview(place) {
    var text = currentText();
    var title = currentTitle();
    if (els.liveTitle) { els.liveTitle.textContent = title || 'Заголовок — как получится'; }
    if (els.liveTo) { els.liveTo.textContent = 'площадка: ' + place.name; }
    if (els.liveLines) {
      var parts = text.split('\n');
      var shown = [];
      for (var i = 0; i < parts.length && shown.length < 4; i++) {
        if (parts[i].trim()) { shown.push(parts[i]); }
      }
      var html = '';
      for (var j = 0; j < shown.length; j++) {
        html += '<li><span>' + esc(shown[j]) + '</span></li>';
      }
      els.liveLines.innerHTML = html;
    }
    if (els.liveSum) { els.liveSum.textContent = 'готовый текст · ' + text.length + ' знаков'; }
  }

  function updateEditState() {
    if (!els.editState) { return; }
    var manual = (edited.title || edited.text);
    els.editState.className = 'gen__flag' + (manual ? ' is-edited' : '');
    els.editState.textContent = manual
      ? 'Правка вручную: поля больше не переписывают текст. Кнопка «Собрать заново из полей» вернёт версию по Вашим ответам.'
      : 'Текст подставляется из полей и обновляется сам. Правьте и стирайте прямо здесь — тогда поля его перестанут переписывать.';
  }

  function render(force) {
    var s = read();
    var r = build(s);
    last = { s: s, r: r };

    if (force) { edited.title = false; edited.text = false; }
    if (els.outTitle && (force || !edited.title)) { els.outTitle.value = r.title || ''; }
    if (els.outText && (force || !edited.text)) { els.outText.value = r.text || ''; }

    if (els.note) { els.note.textContent = r.place.note; }
    updateNumbers(r.place);
    updatePreview(r.place);
    updateEditState();
    updateMailto();
    saveState(s);
  }

  /* ------------------------------ копирование, черновик, отправка */

  /* копирование результата + правка вручную */

  function initCopy() {
    function doCopy(getter, okText) {
      T.copy(getter(), function (ok) {
        T.setStatus(els.copyStatus,
          ok ? okText : 'Не получилось скопировать — выделите текст вручную.',
          ok ? 'ok' : 'err');
      });
    }

    if (els.copyTitle) {
      els.copyTitle.addEventListener('click', function () {
        doCopy(currentTitle, 'Заголовок скопирован.');
      });
    }
    if (els.copyText) {
      els.copyText.addEventListener('click', function () {
        doCopy(currentText, 'Текст объявления скопирован.');
      });
    }

    if (els.outTitle) {
      els.outTitle.addEventListener('input', function () {
        edited.title = true;
        render();
      });
    }
    if (els.outText) {
      els.outText.addEventListener('input', function () {
        edited.text = true;
        render();
      });
    }
    if (els.rebuild) {
      els.rebuild.addEventListener('click', function () {
        render(true);
        T.setStatus(els.copyStatus, 'Текст собран заново по Вашим ответам.', 'ok');
      });
    }
    if (els.clearAll) {
      els.clearAll.addEventListener('click', function () {
        edited.title = true;
        edited.text = true;
        if (els.outTitle) { els.outTitle.value = ''; }
        if (els.outText) { els.outText.value = ''; }
        render();
        T.setStatus(els.copyStatus,
          'Стёрто — можно написать свой текст. Вернуть версию из полей: кнопка «Собрать заново из полей».',
          'ok');
      });
    }
  }

  /* маленькие кнопки «стереть» у полей ввода */

  function initClearButtons() {
    var items = document.querySelectorAll(
      '.field input[type="text"], .field input[type="email"], .field textarea');

    for (var i = 0; i < items.length; i++) {
      (function (input) {
        if (input.closest('.wl') || input.closest('.field--clear')) { return; }
        var field = input.closest('.field');
        if (!field) { return; }

        var wrap = document.createElement('span');
        wrap.className = 'field__wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'field__clear';
        btn.setAttribute('aria-label', 'Стереть поле');
        btn.title = 'Стереть поле';
        btn.innerHTML = '&times;';
        btn.addEventListener('click', function () {
          input.value = '';
          syncEmpty();
          input.dispatchEvent(new Event('input', { bubbles: true }));
          if (input.focus) { input.focus(); }
        });
        wrap.appendChild(btn);

        function syncEmpty() {
          wrap.classList.toggle('is-empty', !String(input.value || '').trim());
        }
        input.addEventListener('input', syncEmpty);
        input.addEventListener('change', syncEmpty);
        syncEmpty();

        field.classList.add('field--clear');
      })(items[i]);
    }
  }

  var DRAFT = 'konstruktor';

  function valueOf(scope, name) {
    var el = scope.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function saveState(s) {
    var d = {
      place: s.place, tone: s.tone, title: s.title, sense: s.sense, benefit: s.benefit,
      price: s.price, pay: s.pay, term: s.term, delivery: s.delivery,
      details: fv('details'), city: s.city, who: s.who, contact: s.contact,
      outTitle: currentTitle(), outText: currentText(),
      editedTitle: edited.title, editedText: edited.text
    };
    if (els.sendForm) {
      d.name = valueOf(els.sendForm, 'name');
      d.email = valueOf(els.sendForm, 'email');
      d.comment = valueOf(els.sendForm, 'comment');
    }
    T.saveDraft(DRAFT, d);
  }

  function applyDraft(d) {
    if (!d) { return; }
    function setRadio(name, value) {
      var el = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (el) { el.checked = true; }
    }
    function setVal(name, value) {
      var el = form.querySelector('[name="' + name + '"]');
      if (el && typeof value !== 'undefined' && value !== null) { el.value = value; }
    }
    if (d.place) { setRadio('place', d.place); }
    if (d.tone) { setRadio('tone', d.tone); }

    var names = ['title', 'sense', 'benefit', 'price', 'pay', 'term', 'details',
                 'city', 'who', 'contact'];
    for (var i = 0; i < names.length; i++) { setVal(names[i], d[names[i]]); }

    var del = form.querySelector('[name="delivery"]');
    if (del) { del.checked = !!d.delivery; }

    if (els.sendForm) {
      var fnames = ['name', 'email', 'comment'];
      for (var j = 0; j < fnames.length; j++) {
        var el2 = els.sendForm.querySelector('[name="' + fnames[j] + '"]');
        if (el2 && d[fnames[j]]) { el2.value = d[fnames[j]]; }
      }
    }

    edited.title = !!d.editedTitle;
    edited.text = !!d.editedText;
    if (els.outTitle && d.editedTitle) { els.outTitle.value = d.outTitle || ''; }
    if (els.outText && d.editedText) { els.outText.value = d.outText || ''; }
  }

  function initSend() {
    var f = els.sendForm;
    if (els.mailto) {
      els.mailto.addEventListener('click', function (ev) {
        if (els.mailto.getAttribute('href') === '#') { ev.preventDefault(); }
      });
    }
    if (!f) { return; }

    f.addEventListener('input', function () {
      updateMailto();
      saveState(read());
    });

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!last) { return; }
      var status = f.querySelector('.status');
      var btn = f.querySelector('button[type="submit"]');
      var email = currentEmail();
      var payload = payloadOf(last.s, last.r);
      payload['Имя'] = valueOf(f, 'name');
      payload['Комментарий'] = valueOf(f, 'comment');
      var er = f.querySelector('input[name="erase"]');
      if (er && er.checked) { payload['Просьба'] = T.ERASE; }
      if (email) { payload['Копия вам'] = email; }

      T.send({
        payload: payload,
        subject: 'Живой клик — текст объявления',
        cc: email,
        replyTo: email,
        status: status,
        button: btn,
        okText: email
          ? 'Готово: письмо мне и копия на ' + email + '.'
          : 'Готово: письмо отправлено мне. Укажите e-mail — пришлю копию.',
        onOk: function () {
          var c = f.querySelector('textarea[name="comment"]');
          if (c) { c.value = ''; }
        }
      });
    });
  }

  function init() {
    var saved = T.loadDraft(DRAFT);
    if (saved) { applyDraft(saved); }

    form.addEventListener('submit', function (ev) { ev.preventDefault(); });
    form.addEventListener('input', function () { render(); });
    form.addEventListener('change', function () { render(); });

    initCopy();
    initClearButtons();
    initSend();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


})();

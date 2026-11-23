/* ==========================================================================
   «Живой клик» — живая демонстрация формы на странице «Примеры работ».
   Показывает, как реагирует форма: текст появляется в письме сразу, а по
   кнопке письмо «отправляется» (без реальной отправки). Без библиотек.
   ========================================================================== */

(function () {
  'use strict';

  var go = document.getElementById('demoGo');
  if (!go) { return; }

  var nameEl = document.getElementById('demo-name');
  var textEl = document.getElementById('demo-text');
  var win = document.querySelector('.demo__window');
  var badge = document.getElementById('demoBadge');
  var from = document.getElementById('demoFrom');
  var body = document.getElementById('demoBody');
  var meta = document.getElementById('demoMeta');
  var arrow = document.querySelector('.demo__arrow');

  var HINT = 'Наберите пару слов слева и нажмите «Показать, что будет» — здесь появится письмо.';
  var shakeTimer = null;

  function live() {
    if (shakeTimer) { window.clearTimeout(shakeTimer); shakeTimer = null; }
    if (!win) { return; }
    var t = textEl ? textEl.value.trim() : '';
    var n = nameEl ? nameEl.value.trim() : '';

    if (t) {
      win.className = 'demo__window is-typing';
      body.textContent = t;
      from.textContent = 'от: ' + (n || 'посетитель сайта');
      meta.textContent = 'страница: /primery.html · время: появится после отправки';
    } else {
      win.className = 'demo__window';
      body.textContent = HINT;
      from.textContent = 'от: — пока никто не писал —';
      meta.textContent = 'страница: /primery.html · время: —';
    }
  }

  function send() {
    var t = textEl ? textEl.value.trim() : '';
    var n = nameEl ? nameEl.value.trim() : '';

    if (!t) {
      if (textEl) { textEl.focus(); }
      if (win) {
        win.className = 'demo__window is-shake';
        shakeTimer = window.setTimeout(function () { shakeTimer = null; live(); }, 700);
      }
      return;
    }

    if (win) { win.className = 'demo__window is-sent'; }
    body.textContent = t;
    from.textContent = 'от: ' + (n || 'посетитель сайта');
    meta.textContent = 'страница: /primery.html · время: ' + new Date().toLocaleString('ru-RU');
    if (badge) { badge.textContent = '1'; }

    if (arrow) {
      arrow.className = 'demo__arrow is-fly';
      window.setTimeout(function () { arrow.className = 'demo__arrow'; }, 1100);
    }
  }

  if (textEl) { textEl.addEventListener('input', live); }
  if (nameEl) { nameEl.addEventListener('input', live); }
  go.addEventListener('click', send);
  live();
})();

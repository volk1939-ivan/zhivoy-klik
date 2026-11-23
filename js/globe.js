/* ==========================================================================
   «Живой клик» — глобус заявок на canvas.
   Рисуем сетку планеты, точки городов и дуги «письмо ушло» к ящику владельца.
   Без библиотек, без внешних карт и картинок. Если в системе включено
   «уменьшить анимацию» — рисуется один статичный кадр.
   ========================================================================== */

(function () {
  'use strict';

  var canvas = document.getElementById('globe');
  if (!canvas || !canvas.getContext) { return; }

  var ctx = canvas.getContext('2d');
  var REDUCED = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* города: широта и долгота. Почта — точка, куда «летят» письма. */
  var CITIES = [
    { name: 'Казань',      lat: 55.79, lon: 49.11 },
    { name: 'Алматы',      lat: 43.24, lon: 76.89 },
    { name: 'Тбилиси',     lat: 41.72, lon: 44.79 },
    { name: 'Берлин',      lat: 52.52, lon: 13.40 },
    { name: 'Ереван',      lat: 40.18, lon: 44.51 },
    { name: 'Минск',       lat: 53.90, lon: 27.56 },
    { name: 'Ташкент',     lat: 41.30, lon: 69.24 },
    { name: 'Новосибирск', lat: 55.03, lon: 82.92 },
    { name: 'Владивосток', lat: 43.12, lon: 131.89 }
  ];
  var HUB = { lat: 55.75, lon: 37.62 };

  /* упрощённые контуры материков: наборы точек (широта, долгота) */
  var LAND = [
    [[70, -160], [70, -125], [58, -130], [50, -124], [32, -117], [23, -110], [20, -105],
     [15, -95], [10, -84], [15, -88], [18, -95], [25, -97], [29, -90], [25, -80], [30, -81],
     [35, -76], [41, -70], [45, -64], [50, -55], [55, -60], [60, -65], [62, -78], [68, -80],
     [70, -95], [72, -120]],
    [[60, -45], [70, -52], [78, -60], [82, -45], [80, -20], [70, -22], [62, -42]],
    [[11, -72], [8, -60], [5, -52], [-2, -44], [-10, -37], [-23, -40], [-34, -53], [-45, -65],
     [-53, -70], [-40, -73], [-25, -70], [-15, -75], [-5, -80], [2, -79], [8, -77]],
    [[35, -6], [37, 10], [32, 25], [31, 33], [15, 40], [11, 44], [2, 42], [-10, 40], [-20, 35],
     [-34, 26], [-34, 18], [-20, 12], [-5, 9], [4, 0], [5, -8], [12, -17], [20, -17], [30, -10]],
    [[36, -10], [43, -9], [50, -5], [55, 8], [58, 10], [60, 20], [66, 25], [70, 30], [70, 50],
     [75, 70], [72, 90], [73, 110], [70, 140], [66, 170], [60, 160], [55, 140], [45, 135],
     [40, 128], [35, 120], [22, 115], [20, 110], [10, 105], [1, 103], [7, 98], [13, 100],
     [16, 95], [22, 90], [25, 85], [22, 78], [10, 80], [8, 77], [23, 60], [30, 50], [38, 45],
     [40, 35], [36, 28], [40, 20], [45, 15], [43, 5]],
    [[-11, 132], [-12, 142], [-20, 148], [-28, 153], [-38, 145], [-35, 137], [-32, 133],
     [-22, 114], [-17, 122]],
    [[-13, 49], [-20, 48], [-25, 45], [-16, 50]],
    [[36, 140], [40, 141], [43, 145], [36, 140]]
  ];

  function inPoly(lat, lon, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var yi = poly[i][0], xi = poly[i][1];
      var yj = poly[j][0], xj = poly[j][1];
      if (((yi > lat) !== (yj > lat)) &&
          (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /* заранее отмечаем точки, которые попадают на сушу */
  var LAND_DOTS = (function () {
    var dots = [];
    for (var lat = -56; lat <= 80; lat += 2.6) {
      var step = 2.6 / Math.max(0.24, Math.cos(lat * Math.PI / 180));
      for (var lon = -180; lon < 180; lon += step) {
        for (var p = 0; p < LAND.length; p++) {
          if (inPoly(lat, lon, LAND[p])) { dots.push([lat, lon]); break; }
        }
      }
    }
    return dots;
  })();

  var view = { w: 1000, h: 540 };
  var rot = 0;
  var flights = [];
  var nextFlight = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 1000;
    var h = Math.round(w * 0.54);
    view.w = w;
    view.h = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(lat, lon) {
    var cx = view.w / 2;
    var cy = view.h / 2;
    var R = Math.min(view.w * 0.34, view.h * 0.44);
    var la = lat * Math.PI / 180;
    var lo = (lon + rot) * Math.PI / 180;
    var x = Math.cos(la) * Math.sin(lo);
    var y = -Math.sin(la);
    var z = Math.cos(la) * Math.cos(lo);
    return { x: cx + x * R, y: cy + y * R, z: z };
  }

  function drawSphere() {
    var cx = view.w / 2;
    var cy = view.h / 2;
    var R = Math.min(view.w * 0.34, view.h * 0.44);
    var la, lo, p, t;

    var grad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.15);
    grad.addColorStop(0, 'rgba(193, 40, 114, .16)');
    grad.addColorStop(1, 'rgba(127, 17, 70, .04)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(127, 17, 70, .28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    for (la = -60; la <= 60; la += 30) {
      ctx.beginPath();
      for (t = 0; t <= 360; t += 4) {
        p = project(la, t);
        if (t === 0) { ctx.moveTo(p.x, p.y); } else { ctx.lineTo(p.x, p.y); }
      }
      ctx.strokeStyle = 'rgba(127, 17, 70, .16)';
      ctx.stroke();
    }

    for (lo = 0; lo < 180; lo += 30) {
      ctx.beginPath();
      var startedNow = false;
      for (t = -90; t <= 90; t += 4) {
        p = project(t, lo);
        if (p.z > 0) {
          if (!startedNow) { ctx.moveTo(p.x, p.y); startedNow = true; }
          else { ctx.lineTo(p.x, p.y); }
        } else {
          startedNow = false;
        }
      }
      ctx.strokeStyle = 'rgba(127, 17, 70, .14)';
      ctx.stroke();
    }
  }

  function drawCities(now) {
    var i, p;
    for (i = 0; i < CITIES.length; i++) {
      p = project(CITIES[i].lat, CITIES[i].lon);
      if (p.z <= 0.05) { continue; }
      var pulse = REDUCED ? 0.5 : (0.5 + 0.5 * Math.sin(now / 520 + i));

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2 + pulse * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(193, 40, 114, .85)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(193, 40, 114, .22)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    var h = project(HUB.lat, HUB.lon);
    if (h.z > 0.05) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#7f1146';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(h.x, h.y, 12 + (REDUCED ? 0 : 3 * Math.sin(now / 600)), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(127, 17, 70, .35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /* точка на дуге между городами: середина приподнята над поверхностью */
  function arcPoint(a, b, t, lift) {
    var ar = a.lat * Math.PI / 180, an = a.lon * Math.PI / 180;
    var br = b.lat * Math.PI / 180, bn = b.lon * Math.PI / 180;
    var x1 = Math.cos(ar) * Math.cos(an), y1 = Math.sin(ar), z1 = Math.cos(ar) * Math.sin(an);
    var x2 = Math.cos(br) * Math.cos(bn), y2 = Math.sin(br), z2 = Math.cos(br) * Math.sin(bn);
    var x = x1 + (x2 - x1) * t;
    var y = y1 + (y2 - y1) * t;
    var z = z1 + (z2 - z1) * t;
    var len = Math.sqrt(x * x + y * y + z * z) || 1;
    var k = 1 + lift * Math.sin(Math.PI * t);
    x = x / len * k;
    y = y / len * k;
    z = z / len * k;
    var lat = Math.asin(Math.max(-1, Math.min(1, y))) * 180 / Math.PI;
    var lon = Math.atan2(z, x) * 180 / Math.PI;
    return project(lat, lon);
  }

  function drawFlights(now) {
    var i, t, p, f, progress;

    for (i = 0; i < flights.length; i++) {
      f = flights[i];
      progress = REDUCED ? 1 : Math.min(1, (now - f.born) / f.dur);

      ctx.beginPath();
      for (t = 0; t <= progress; t += 0.03) {
        p = arcPoint(f.from, f.to, t, 0.16);
        if (t === 0) { ctx.moveTo(p.x, p.y); } else { ctx.lineTo(p.x, p.y); }
      }
      ctx.strokeStyle = 'rgba(193, 40, 114, ' + (0.25 + 0.45 * (1 - progress)) + ')';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      p = arcPoint(f.from, f.to, progress, 0.16);
      if (p.z > -0.1) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = '#c12872';
        ctx.fill();
      }
    }

    if (REDUCED) { return; }

    var keep = [];
    for (i = 0; i < flights.length; i++) {
      if (now - flights[i].born < flights[i].dur + 600) { keep.push(flights[i]); }
    }
    flights = keep;

    if (now > nextFlight) {
      var c = CITIES[Math.floor(Math.random() * CITIES.length)];
      flights.push({ from: c, to: HUB, born: now, dur: 850 + Math.random() * 550 });
      nextFlight = now + 190 + Math.random() * 300;
    }
    if (flights.length > 14) { flights.splice(0, flights.length - 14); }
  }

  /* континенты: точки по упрощённым контурам суши */
  function drawLand() {
    ctx.fillStyle = 'rgba(193, 40, 114, .38)';
    for (var i = 0; i < LAND_DOTS.length; i++) {
      var p = project(LAND_DOTS[i][0], LAND_DOTS[i][1]);
      if (p.z <= 0.02) { continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now) {
    if (!REDUCED) { rot += 0.1; }

    ctx.clearRect(0, 0, view.w, view.h);
    drawSphere();
    drawLand();
    drawFlights(now);
    drawCities(now);

    if (!REDUCED) { window.requestAnimationFrame(frame); }
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) { window.clearTimeout(resizeTimer); }
    resizeTimer = window.setTimeout(function () {
      resize();
      if (REDUCED) { frame(1e9); }
    }, 150);
  });


  resize();
  if (REDUCED) {
    for (var i = 0; i < 6; i++) {
      flights.push({ from: CITIES[i % CITIES.length], to: HUB, born: 0, dur: 1 });
    }
    frame(1e9);
  } else {
    window.requestAnimationFrame(frame);
  }
})();

/* Philmography Golden Hour Planner — Singapore
   Sun times computed in-browser with the NOAA solar algorithm.
   Singapore: lat 1.3521 N, lon 103.8198 E, UTC+8 (no DST). */
(function () {
  'use strict';

  var LAT = 1.3521, LON = 103.8198, TZ = 8; // hours ahead of UTC
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(mins) { // minutes since SGT midnight -> "7:04 pm"
    mins = ((Math.round(mins) % 1440) + 1440) % 1440;
    var h = Math.floor(mins / 60), m = mins % 60;
    var ap = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + pad(m) + ' ' + ap;
  }
  function fmtRange(a, b) { return fmt(a) + ' – ' + fmt(b); }
  function fmtDur(mins) {
    var h = Math.floor(mins / 60), m = Math.round(mins % 60);
    return h + 'h ' + pad(m) + 'm';
  }
  function dateLabel(d) {
    return d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' });
  }
  function shortLabel(d) {
    return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });
  }
  // SGT calendar date -> Date at noon SGT (04:00 UTC)
  function sgtDateParts(d) {
    var p = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d);
    var o = {};
    p.forEach(function (x) { o[x.type] = +x.value; });
    return o; // {year, month, day}
  }
  function dateFromSgtParts(y, m, d) { return new Date(Date.UTC(y, m - 1, d, 4, 0, 0)); } // noon SGT

  /* ---- Solar position (NOAA) ---- */
  function solarParams(sgtDate) {
    var p = sgtDateParts(sgtDate);
    var jd = dateFromSgtParts(p.year, p.month, p.day).getTime() / 86400000 + 2440587.5;
    var T = (jd - 2451545.0) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = Math.sin(M * D2R) * (1.914602 - T * (0.004817 + 0.000014 * T))
      + Math.sin(2 * M * D2R) * (0.019993 - 0.000101 * T)
      + Math.sin(3 * M * D2R) * 0.000289;
    var trueLong = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    var lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R);
    var eps0 = 23 + (26 + ((21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60)) / 60;
    var eps = eps0 + 0.00256 * Math.cos(omega * D2R);
    var decl = Math.asin(Math.sin(eps * D2R) * Math.sin(lambda * D2R)) * R2D;
    var y = Math.pow(Math.tan((eps / 2) * D2R), 2);
    var eqTime = 4 * R2D * (y * Math.sin(2 * L0 * D2R)
      - 2 * e * Math.sin(M * D2R)
      + 4 * e * y * Math.sin(M * D2R) * Math.cos(2 * L0 * D2R)
      - 0.5 * y * y * Math.sin(4 * L0 * D2R)
      - 1.25 * e * e * Math.sin(2 * M * D2R)); // minutes
    return { decl: decl, eqTime: eqTime };
  }
  // Sun altitude (degrees) at minutes since SGT midnight
  function altitude(sp, tSgt) {
    var utcMin = tSgt - TZ * 60;
    var solarMin = utcMin + sp.eqTime + 4 * LON;
    var H = ((solarMin - 720) / 4) * D2R; // hour angle
    var alt = Math.asin(Math.sin(LAT * D2R) * Math.sin(sp.decl * D2R)
      + Math.cos(LAT * D2R) * Math.cos(sp.decl * D2R) * Math.cos(H)) * R2D;
    return alt;
  }
  // Bisection: find t in [lo,hi] where altitude crosses target. rising=true means alt increasing.
  function findCross(sp, lo, hi, target) {
    var aLo = altitude(sp, lo) - target, aHi = altitude(sp, hi) - target;
    if (aLo === 0) return lo;
    if (aHi === 0) return hi;
    if ((aLo > 0) === (aHi > 0)) return null; // no crossing in bracket
    for (var i = 0; i < 50; i++) {
      var mid = (lo + hi) / 2, aMid = altitude(sp, mid) - target;
      if (aMid === 0) return mid;
      if ((aMid > 0) === (aLo > 0)) { lo = mid; aLo = aMid; } else { hi = mid; }
    }
    return (lo + hi) / 2;
  }
  function sunTimes(sgtDate) {
    var sp = solarParams(sgtDate);
    var sunrise = findCross(sp, 300, 480, -0.833);      // 05:00–08:00 SGT
    var sunset = findCross(sp, 1020, 1200, -0.833);     // 17:00–20:00 SGT
    var blueStart = findCross(sp, Math.max(0, sunrise - 90), sunrise, -4);
    var goldEndAm = findCross(sp, sunrise, 720, 6);
    var goldStartPm = findCross(sp, 720, sunset, 6);
    var blueEnd = findCross(sp, sunset, Math.min(1439, sunset + 90), -4);
    return {
      sunrise: sunrise, sunset: sunset,
      blueAm: [blueStart, sunrise], goldenAm: [sunrise, goldEndAm],
      goldenPm: [goldStartPm, sunset], bluePm: [sunset, blueEnd],
      dayLength: sunset - sunrise
    };
  }

  /* ---- Places ---- */
  var PLACES = [
    { name: 'Haji Lane', best: 'Morning golden hour', note: 'Colourful shophouses glow in low morning sun, and the lane is quiet before the shops open.' },
    { name: 'Arab Street & Sultan Mosque', best: 'Morning golden hour', note: 'Warm light across the mosque dome and textiles — best before the midday crowds.' },
    { name: 'Gardens by the Bay', best: 'Evening golden hour → blue hour', note: 'Supertrees light up as the sky turns blue. The crossover from golden to blue hour is the shot.' },
    { name: 'Marina Bay waterfront', best: 'Evening golden hour', note: 'Skyline backlight and long reflections on the water as the sun drops behind the city.' },
    { name: 'East Coast Park', best: 'Morning golden hour', note: 'One of the few places you can watch the sun come up over the sea in Singapore.' },
    { name: 'Singapore Botanic Gardens', best: 'Morning golden hour', note: 'Dappled light through the rain trees — soft, green, and calm before the heat.' },
    { name: 'Chinatown', best: 'Late afternoon', note: 'Lanterns, shophouses and five-foot ways catch the last warm light of the day.' },
    { name: 'Little India', best: 'Morning golden hour', note: 'Saturated colour everywhere — murals, flower garlands, shopfronts — in soft morning light.' },
    { name: 'Tiong Bahru', best: 'Morning golden hour', note: 'Art-deco blocks and quiet streets; gentle light suits the neighbourhood’s slow pace.' },
    { name: 'Clarke Quay', best: 'Blue hour', note: 'Neon and river reflections once the sky goes deep blue — bring a tripod or a steady hand.' },
    { name: 'Fort Canning Park', best: 'Morning golden hour', note: 'Shade, staircases and old trees — good when the sun is already strong elsewhere.' },
    { name: 'Tanjong Beach, Sentosa', best: 'Evening golden hour', note: 'Proper sunset over the water, and one of the least built-up stretches of coast.' },
    { name: 'Jewel Changi', best: 'Any time — indoors', note: 'The Rain Vortex is sheltered, so this is the rainy-day backup that still looks spectacular.' },
    { name: 'Your own idea', best: 'You choose the light', note: 'A rooftop, a void deck, a favourite hawker centre — anywhere in Singapore works.' }
  ];

  /* ---- State ---- */
  var today = new Date();
  var todayTimes = sunTimes(today);
  var weekData = []; // {date, times, weather}
  var selectedPlace = PLACES[0].name;
  var currentPlan = null;

  /* ---- Today section ---- */
  function renderToday() {
    $('today-date').textContent = dateLabel(today) + ' · Singapore (SGT, UTC+8)';
    $('sunrise').textContent = fmt(todayTimes.sunrise);
    $('sunset').textContent = fmt(todayTimes.sunset);
    $('day-length').textContent = fmtDur(todayTimes.dayLength);

    // Best window: evening golden by default; morning if it is before noon and evening is rained off (weather updates later)
    setBestWindow('evening');

    // Timeline: explicit [start, end, kind] segments covering the whole day
    var segs = [
      [0, todayTimes.blueAm[0], 'night'],
      [todayTimes.blueAm[0], todayTimes.blueAm[1], 'blue'],
      [todayTimes.goldenAm[0], todayTimes.goldenAm[1], 'golden'],
      [todayTimes.goldenAm[1], todayTimes.goldenPm[0], 'day'],
      [todayTimes.goldenPm[0], todayTimes.goldenPm[1], 'golden'],
      [todayTimes.bluePm[0], todayTimes.bluePm[1], 'blue'],
      [todayTimes.bluePm[1], 1440, 'night']
    ];
    var tl = $('timeline');
    tl.innerHTML = '';
    segs.forEach(function (s) {
      var w = (s[1] - s[0]) / 1440 * 100;
      if (!(w > 0)) return;
      var seg = document.createElement('div');
      seg.className = 'seg ' + s[2];
      seg.style.width = w + '%';
      seg.title = s[2] + ' ' + fmt(s[0]) + ' – ' + fmt(s[1]);
      tl.appendChild(seg);
    });
    var nowParts = sgtDateParts(new Date());
    var nowMin = new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + TZ * 60;
    nowMin = ((nowMin % 1440) + 1440) % 1440;
    var marker = document.createElement('div');
    marker.className = 'now';
    marker.style.left = (nowMin / 1440 * 100) + '%';
    tl.appendChild(marker);
    $('now-note').textContent = 'Now: ' + fmt(nowMin) + ' SGT';

    // Windows cards
    var wins = [
      { label: 'Blue hour — morning', range: todayTimes.blueAm, note: 'Deep blue sky before the sun clears the horizon. Best for city silhouettes.' },
      { label: 'Golden hour — morning', range: todayTimes.goldenAm, note: 'Soft, warm, low light. Skin tones look their best; streets are still quiet.' },
      { label: 'Golden hour — evening', range: todayTimes.goldenPm, note: 'The classic portrait window — warm backlight, long shadows, glowing skin.' },
      { label: 'Blue hour — evening', range: todayTimes.bluePm, note: 'The sky holds colour after sunset. City lights come on; reflections shine.' }
    ];
    var box = $('windows');
    box.innerHTML = '';
    wins.forEach(function (w) {
      var card = document.createElement('div');
      card.className = 'card window';
      card.innerHTML = '<p class="card-label"></p><p class="w-time"></p><p></p>';
      card.children[0].textContent = w.label;
      card.children[1].textContent = fmtRange(w.range[0], w.range[1]);
      card.children[2].textContent = w.note;
      box.appendChild(card);
    });
  }

  function setBestWindow(which) {
    var w = which === 'morning' ? todayTimes.goldenAm : todayTimes.goldenPm;
    $('best-window').textContent = fmtRange(w[0], w[1]);
    $('best-window-note').textContent = which === 'morning'
      ? 'Morning golden hour — clearer skies and quieter streets.'
      : 'Evening golden hour — the warmest light of the day.';
  }

  /* ---- Week table ---- */
  function renderWeek() {
    var tbody = $('week-body');
    tbody.innerHTML = '';
    weekData.forEach(function (d, i) {
      var tr = document.createElement('tr');
      if (i === 0) tr.className = 'today-row';
      var wx = d.weather;
      var wxCell = wx ? Math.round(wx.cloud) + '% cloud · ' + Math.round(wx.rain) + '% rain' : '—';
      var score = wx ? scoreDay(wx) : null;
      tr.innerHTML = '<td><b></b></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>';
      var c = tr.children;
      c[0].innerHTML = '<b>' + shortLabel(d.date) + '</b>' + (i === 0 ? ' · today' : '');
      c[1].textContent = fmt(d.times.sunrise);
      c[2].textContent = fmtRange(d.times.goldenAm[0], d.times.goldenAm[1]);
      c[3].textContent = fmtRange(d.times.goldenPm[0], d.times.goldenPm[1]);
      c[4].textContent = fmt(d.times.sunset);
      c[5].textContent = wxCell;
      if (score) {
        var s = document.createElement('span');
        s.className = 'score ' + score.cls;
        s.textContent = score.label;
        c[6].appendChild(s);
      } else { c[6].innerHTML = '<span class="score na">—</span>'; }
      var btn = document.createElement('button');
      btn.className = 'plan-link';
      btn.type = 'button';
      btn.textContent = 'Plan →';
      btn.addEventListener('click', function () { planForDate(d.date, d.times); });
      c[7].appendChild(btn);
      tbody.appendChild(tr);
    });
  }

  // Score the worse of the two golden-hour windows for the day.
  function scoreDay(wx) {
    var rain = Math.max(wx.rainAm, wx.rainPm);
    var cloud = Math.max(wx.cloudAm, wx.cloudPm);
    var score = 100 - rain * 0.9 - Math.max(0, cloud - 55) * 0.7 - Math.max(0, 25 - cloud) * 0.3;
    if (score >= 72) return { cls: 'great', label: 'Great' };
    if (score >= 48) return { cls: 'good', label: 'Good' };
    return { cls: 'risky', label: 'Risky' };
  }

  function fetchWeather() {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=1.3521&longitude=103.8198'
      + '&hourly=cloud_cover,precipitation_probability&timezone=Asia%2FSingapore&forecast_days=7';
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var times = j.hourly.time, cloud = j.hourly.cloud_cover, rain = j.hourly.precipitation_probability;
      weekData.forEach(function (d) {
        function at(mins) { // nearest hourly value to a SGT time on this date
          var p = sgtDateParts(d.date);
          var key = p.year + '-' + pad(p.month) + '-' + pad(p.day) + 'T' + pad(Math.floor(mins / 60)) + ':00';
          var idx = times.indexOf(key);
          if (idx < 0) return null;
          return { cloud: cloud[idx] == null ? 50 : cloud[idx], rain: rain[idx] == null ? 20 : rain[idx] };
        }
        var amMid = (d.times.goldenAm[0] + d.times.goldenAm[1]) / 2;
        var pmMid = (d.times.goldenPm[0] + d.times.goldenPm[1]) / 2;
        var am = at(amMid) || { cloud: 50, rain: 20 };
        var pm = at(pmMid) || { cloud: 50, rain: 20 };
        d.weather = {
          cloudAm: am.cloud, rainAm: am.rain, cloudPm: pm.cloud, rainPm: pm.rain,
          cloud: Math.round((am.cloud + pm.cloud) / 2), rain: Math.round(Math.max(am.rain, pm.rain))
        };
      });
      renderWeek();
      $('weather-note').textContent = 'Weather: Open-Meteo forecast for Singapore. Cloud and rain shown for the golden-hour windows. Forecasts change — check again on the day.';
      // Best window today: prefer the golden hour with the lower rain chance
      var w0 = weekData[0].weather;
      if (w0) {
        var nowMin = ((new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + TZ * 60) % 1440 + 1440) % 1440;
        var morningGone = nowMin > todayTimes.goldenAm[1];
        if (morningGone) setBestWindow('evening');
        else setBestWindow(w0.rainAm + w0.cloudAm * 0.2 < w0.rainPm + w0.cloudPm * 0.2 ? 'morning' : 'evening');
      }
    }).catch(function () {
      $('weather-note').textContent = 'Weather forecast could not be loaded (you may be offline). Sun times above are computed on-device and still work.';
      renderWeek();
    });
  }

  /* ---- Places ---- */
  function renderPlaces() {
    var box = $('places');
    box.innerHTML = '';
    PLACES.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'place' + (p.name === selectedPlace ? ' selected' : '');
      b.innerHTML = '<h3></h3><p class="best"></p><p></p>';
      b.children[0].textContent = p.name;
      b.children[1].textContent = 'Best: ' + p.best;
      b.children[2].textContent = p.note;
      b.addEventListener('click', function () {
        selectedPlace = p.name;
        $('plan-place').value = p.name;
        document.querySelectorAll('.place').forEach(function (el) { el.classList.remove('selected'); });
        b.classList.add('selected');
        document.getElementById('plan').scrollIntoView({ behavior: 'smooth' });
      });
      box.appendChild(b);
    });
    var sel = $('plan-place');
    sel.innerHTML = '';
    PLACES.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.name; o.textContent = p.name + ' — best: ' + p.best;
      sel.appendChild(o);
    });
    sel.value = selectedPlace;
    sel.addEventListener('change', function () {
      selectedPlace = sel.value;
      document.querySelectorAll('.place').forEach(function (el) {
        el.classList.toggle('selected', el.children[0].textContent === selectedPlace);
      });
    });
  }

  /* ---- Planner ---- */
  var SESSION_LEN = { portrait: [60, 90], walk: [90, 90], collab: [60, 120] };
  var SESSION_LABEL = { portrait: 'Portrait', walk: 'Photo walk', collab: 'Collab shoot' };

  function planForDate(date, times) {
    var p = sgtDateParts(date);
    $('plan-date').value = p.year + '-' + pad(p.month) + '-' + pad(p.day);
    computePlan(date, times);
    document.getElementById('plan').scrollIntoView({ behavior: 'smooth' });
  }

  function computePlan(date, times) {
    var win = $('plan-window').value;
    var sess = $('plan-session').value;
    var place = $('plan-place').value;
    var range, label;
    if (win === 'morning') { range = times.goldenAm; label = 'morning golden hour'; }
    else if (win === 'blue-evening') { range = times.bluePm; label = 'blue hour after sunset'; }
    else if (win === 'blue-morning') { range = times.blueAm; label = 'blue hour before sunrise'; }
    else { range = times.goldenPm; label = 'evening golden hour'; }
    var start = range[0];
    var len = SESSION_LEN[sess];
    var dur = len[0] === len[1] ? len[0] : len[0]; // start at window start; use the shorter end for the plan
    var end = start + dur;
    var p = sgtDateParts(date);
    var dateStr = p.year + '-' + pad(p.month) + '-' + pad(p.day);
    currentPlan = {
      date: date, dateStr: dateStr, place: place, session: sess,
      start: start, end: end, label: label, range: range
    };
    $('plan-title').textContent = SESSION_LABEL[sess] + ' · ' + place;
    $('plan-detail').textContent = dateLabel(date) + ' · ' + fmt(start) + ' – ' + fmt(end) + ' SGT (' + dur + ' min)';
    $('plan-light').textContent = 'Shoot inside the ' + label + ' (' + fmtRange(range[0], range[1]) + '). Arrive 15 minutes early — the light moves fast in Singapore.';
    $('plan-result').hidden = false;
  }

  function icsFor(plan) {
    function icsTime(dateStr, mins) {
      var h = Math.floor(mins / 60), m = Math.round(mins % 60);
      if (m === 60) { h += 1; m = 0; }
      if (h >= 24) { h -= 24; } // plans never cross midnight in practice; keep same date
      return dateStr.replace(/-/g, '') + 'T' + pad(h) + pad(m) + '00';
    }
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Philmography//Golden Hour Planner//EN',
      'BEGIN:VEVENT',
      'UID:' + plan.dateStr + '-' + plan.session + '-' + Math.round(plan.start) + '@philmography',
      'DTSTAMP:' + icsTime(plan.dateStr, 0).slice(0, 8) + 'T000000Z',
      'DTSTART;TZID=Asia/Singapore:' + icsTime(plan.dateStr, plan.start),
      'DTEND;TZID=Asia/Singapore:' + icsTime(plan.dateStr, plan.end),
      'SUMMARY:' + SESSION_LABEL[plan.session] + ' — ' + plan.place + ' (Philmography)',
      'DESCRIPTION:' + plan.label + ' ' + fmtRange(plan.range[0], plan.range[1]) + ' SGT. Arrive 15 minutes early.',
      'LOCATION:' + plan.place + ', Singapore',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    return lines.join('\r\n');
  }

  function renderSavedPlans() {
    var saved = [];
    try { saved = JSON.parse(localStorage.getItem('ghp-plans') || '[]'); } catch (e) { saved = []; }
    var wrap = $('saved-plans-wrap');
    var ul = $('saved-plans');
    ul.innerHTML = '';
    if (!saved.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    saved.forEach(function (p, i) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      span.textContent = SESSION_LABEL[p.session] + ' · ' + p.place + ' — ' + p.dateStr + ' ' + fmt(p.start) + '–' + fmt(p.end) + ' SGT';
      var del = document.createElement('button');
      del.className = 'del'; del.type = 'button'; del.textContent = 'Remove';
      del.addEventListener('click', function () {
        saved.splice(i, 1);
        try { localStorage.setItem('ghp-plans', JSON.stringify(saved)); } catch (e) {}
        renderSavedPlans();
      });
      li.appendChild(span); li.appendChild(del);
      ul.appendChild(li);
    });
  }

  /* ---- Init ---- */
  function init() {
    for (var i = 0; i < 7; i++) {
      var d = new Date(today.getTime() + i * 86400000);
      weekData.push({ date: d, times: sunTimes(d), weather: null });
    }
    renderToday();
    renderWeek();
    renderPlaces();
    renderSavedPlans();
    fetchWeather();

    var p = sgtDateParts(today);
    $('plan-date').value = p.year + '-' + pad(p.month) + '-' + pad(p.day);
    $('plan-date').min = $('plan-date').value;

    $('plan-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = $('plan-date').value.split('-');
      var date = dateFromSgtParts(+v[0], +v[1], +v[2]);
      computePlan(date, sunTimes(date));
    });
    $('download-ics').addEventListener('click', function () {
      if (!currentPlan) return;
      var blob = new Blob([icsFor(currentPlan)], { type: 'text/calendar' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'philmography-shoot-' + currentPlan.dateStr + '.ics';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    $('save-plan').addEventListener('click', function () {
      if (!currentPlan) return;
      var saved = [];
      try { saved = JSON.parse(localStorage.getItem('ghp-plans') || '[]'); } catch (e) { saved = []; }
      saved.push({
        session: currentPlan.session, place: currentPlan.place,
        dateStr: currentPlan.dateStr, start: currentPlan.start, end: currentPlan.end
      });
      try { localStorage.setItem('ghp-plans', JSON.stringify(saved)); } catch (e) {}
      renderSavedPlans();
      $('save-plan').textContent = 'Saved ✓';
      setTimeout(function () { $('save-plan').textContent = 'Save this plan'; }, 2000);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* 전체화면 도면 뷰어 — 확대 중에는 끌어서 이동, 1배일 때만 좌우 넘김 */
(function () {
  var vw = document.getElementById('vw');
  if (!vw) return;
  var stage = document.getElementById('vwStage'),
      track = document.getElementById('vwTrack'),
      lab = document.getElementById('vwIdx'),
      zb = document.getElementById('vwZoom'),
      hint = document.getElementById('vwHint');
  var shots = [], n = 0, i = 0, scale = 1, tx = 0, ty = 0, dragX = 0, group = null;
  var pts = new Map(), mode = null, s0 = 1, t0 = {x: 0, y: 0}, d0 = 0,
      m0 = {x: 0, y: 0}, p0 = {x: 0, y: 0};
  var MAXS = 5, ZOOMSTEP = 2.6;

  function build(g) {
    group = g;
    shots = [].slice.call(document.querySelectorAll('[data-shot]'))
              .filter(function (im) { return im.getAttribute('data-group') === g; });
    n = shots.length;
    track.textContent = '';
    shots.forEach(function (im) {
      var slide = document.createElement('div');
      slide.className = 'vw-slide';
      var big = document.createElement('img');
      big.src = im.currentSrc || im.src;       // 속성 문자열을 만들지 않는다
      big.alt = '';
      big.draggable = false;
      slide.appendChild(big);
      track.appendChild(slide);
    });
    track.style.width = (n * 100) + '%';
    [].forEach.call(track.children, function (s) { s.style.width = (100 / n) + '%'; });
  }
  function img() { var s = track.children[i]; return s && s.firstElementChild; }
  function limits() {
    var im = img();
    if (!im) return {x: 0, y: 0};
    var w = im.clientWidth * scale, h = im.clientHeight * scale;
    return {x: Math.max(0, (w - stage.clientWidth) / 2),
            y: Math.max(0, (h - stage.clientHeight) / 2)};
  }
  function clamp() {
    var L = limits();
    tx = Math.max(-L.x, Math.min(L.x, tx));
    ty = Math.max(-L.y, Math.min(L.y, ty));
  }
  function render(anim) {
    track.style.transition = anim ? 'transform .22s ease' : 'none';
    track.style.transform = 'translate3d(' + (-i * stage.clientWidth + dragX) + 'px,0,0)';
    [].forEach.call(track.children, function (s, k) {
      var im = s.firstElementChild;
      im.style.transition = anim ? 'transform .22s ease' : 'none';
      im.style.transform = (k === i)
        ? 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')' : 'none';
    });
    lab.textContent = (i + 1) + ' / ' + n;
    var z = scale > 1.01;
    zb.textContent = z ? '축소' : '확대';
    if (hint) hint.textContent = z ? '끌어서 이동 · 두 손가락으로 축소' : '← 좌우로 넘기기 →';
  }
  function reset() { scale = 1; tx = 0; ty = 0; dragX = 0; }
  function open(k) {
    i = k; reset();
    vw.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { render(false); });
  }
  function shut() { vw.hidden = true; document.body.style.overflow = ''; reset(); }

  document.addEventListener('click', function (ev) {
    var im = ev.target.closest('[data-shot]');
    if (!im) return;
    var g = im.getAttribute('data-group') || 'steps';
    build(g);
    open(shots.indexOf(im));
  });
  document.getElementById('vwClose').onclick = shut;
  zb.onclick = function () {
    if (scale > 1.01) { reset(); } else { scale = ZOOMSTEP; tx = 0; ty = 0; }
    render(true);
  };
  window.addEventListener('keydown', function (ev) {
    if (vw.hidden) return;
    if (ev.key === 'Escape') shut();
    if (ev.key === 'ArrowRight' && scale <= 1.01 && i < n - 1) { i++; render(true); }
    if (ev.key === 'ArrowLeft' && scale <= 1.01 && i > 0) { i--; render(true); }
  });
  window.addEventListener('resize', function () { if (!vw.hidden) render(false); });

  function mid() {
    var a = Array.from(pts.values());
    if (a.length < 2) return {x: a[0].x, y: a[0].y};
    return {x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2};
  }
  function dist() {
    var a = Array.from(pts.values());
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
  }
  stage.addEventListener('pointerdown', function (ev) {
    try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
    pts.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
    if (pts.size === 2) {
      mode = 'pinch'; s0 = scale; d0 = dist(); m0 = mid(); t0 = {x: tx, y: ty};
    } else {
      mode = scale > 1.01 ? 'pan' : 'swipe';
      p0 = {x: ev.clientX, y: ev.clientY}; t0 = {x: tx, y: ty}; dragX = 0;
    }
  });
  stage.addEventListener('pointermove', function (ev) {
    if (!pts.has(ev.pointerId)) return;
    pts.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
    if (mode === 'pinch' && pts.size >= 2) {
      var d = dist(), m = mid();
      scale = Math.max(1, Math.min(MAXS, s0 * d / (d0 || 1)));
      tx = t0.x + (m.x - m0.x); ty = t0.y + (m.y - m0.y);
      if (scale <= 1.01) { scale = 1; tx = 0; ty = 0; }
      clamp(); render(false);
    } else if (mode === 'pan') {
      tx = t0.x + (ev.clientX - p0.x); ty = t0.y + (ev.clientY - p0.y);
      clamp(); render(false);
    } else if (mode === 'swipe') {
      dragX = ev.clientX - p0.x;
      if ((i === 0 && dragX > 0) || (i === n - 1 && dragX < 0)) dragX *= 0.35;
      render(false);
    }
  });
  function end(ev) {
    if (!pts.has(ev.pointerId)) return;
    pts.delete(ev.pointerId);
    if (mode === 'swipe') {
      var w = stage.clientWidth;
      if (dragX < -w * 0.18 && i < n - 1) i++;
      else if (dragX > w * 0.18 && i > 0) i--;
      dragX = 0; render(true);
    } else if (mode === 'pinch' && pts.size === 1) {
      var a = Array.from(pts.values())[0];
      mode = scale > 1.01 ? 'pan' : 'swipe';
      p0 = {x: a.x, y: a.y}; t0 = {x: tx, y: ty}; dragX = 0;
      return;
    } else {
      render(true);
    }
    if (pts.size === 0) mode = null;
  }
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('dblclick', function (ev) {
    ev.preventDefault();
    if (scale > 1.01) { reset(); } else { scale = ZOOMSTEP; }
    clamp(); render(true);
  });
})();

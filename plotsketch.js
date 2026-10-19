/* ==========================================================
   plotsketch.js — नक्शे की फोटो से सिर्फ़ चुना हुआ प्लॉट अलग करके
   साफ़ बँटवारा-स्केच बनाना (Master Prompt 11: Plot Isolation & Clean Sketch)

   चरण:
   1. detect()  — रंग से चुना हुआ (highlight) प्लॉट पहचानना, या टैप किए हुए बिंदु से
   2. layout()  — रकवा के अनुपात में समान्तर रेखाओं से हिस्से बाँटना
   3. draw()    — सफ़ेद बैकग्राउंड पर सिर्फ़ वही प्लॉट, रंगीन हिस्से, नाम + रकवा

   सारा काम ब्राउज़र में होता है; कोई फोटो कहीं भेजी नहीं जाती।
   ========================================================== */
(function (root) {
  "use strict";
  const PS = {};
  const FONT = '"Noto Sans Devanagari","Mangal","Nirmala UI","Kohinoor Devanagari","Lohit Devanagari","FreeSans",sans-serif';
  const COLORS = ["#cfe5ff", "#ffe1b8", "#d4f1c5", "#f9d0e6", "#e3d7ff", "#fff3a6", "#c6efec", "#ffd3d0", "#dfe8b8", "#dcdcdc"];
  PS.COLORS = COLORS;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ---------- छोटे औज़ार (mask = Uint8Array, 1 = प्लॉट) ---------- */
  function morph(m, w, h, r, dil) {
    if (r <= 0) return m.slice();
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h), pre = new Int32Array(Math.max(w, h) + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w; pre[0] = 0;
      for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + m[row + x];
      for (let x = 0; x < w; x++) {
        const a = x - r < 0 ? 0 : x - r, b = x + r >= w ? w - 1 : x + r, c = pre[b + 1] - pre[a];
        t[row + x] = dil ? (c > 0 ? 1 : 0) : (c === b - a + 1 ? 1 : 0);
      }
    }
    for (let x = 0; x < w; x++) {
      pre[0] = 0;
      for (let y = 0; y < h; y++) pre[y + 1] = pre[y] + t[y * w + x];
      for (let y = 0; y < h; y++) {
        const a = y - r < 0 ? 0 : y - r, b = y + r >= h ? h - 1 : y + r, c = pre[b + 1] - pre[a];
        o[y * w + x] = dil ? (c > 0 ? 1 : 0) : (c === b - a + 1 ? 1 : 0);
      }
    }
    return o;
  }
  const dilate = (m, w, h, r) => morph(m, w, h, r, true);
  const erode = (m, w, h, r) => morph(m, w, h, r, false);

  // किनारे चिकने करने के लिए: दो बार box-blur फिर 0.5 पर काटना
  function smooth(m, w, h, r) {
    let a = new Float32Array(w * h), b = new Float32Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = m[i];
    const pre = new Float32Array(Math.max(w, h) + 1);
    for (let it = 0; it < 2; it++) {
      for (let y = 0; y < h; y++) {
        const row = y * w; pre[0] = 0;
        for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + a[row + x];
        for (let x = 0; x < w; x++) { const p = Math.max(0, x - r), q = Math.min(w - 1, x + r); b[row + x] = (pre[q + 1] - pre[p]) / (q - p + 1); }
      }
      for (let x = 0; x < w; x++) {
        pre[0] = 0;
        for (let y = 0; y < h; y++) pre[y + 1] = pre[y] + b[y * w + x];
        for (let y = 0; y < h; y++) { const p = Math.max(0, y - r), q = Math.min(h - 1, y + r); a[y * w + x] = (pre[q + 1] - pre[p]) / (q - p + 1); }
      }
    }
    const o = new Uint8Array(w * h);
    for (let i = 0; i < o.length; i++) o[i] = a[i] >= 0.5 ? 1 : 0;
    return o;
  }

  function components(mask, w, h) {
    const N = w * h, lab = new Int32Array(N), stack = new Int32Array(N), info = [null];
    let n = 0;
    for (let i = 0; i < N; i++) {
      if (!mask[i] || lab[i]) continue;
      n++; let sp = 0, cnt = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
      stack[sp++] = i; lab[i] = n;
      while (sp) {
        const p = stack[--sp], x = p % w, y = (p / w) | 0; cnt++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = n; stack[sp++] = p - 1; }
        if (x < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = n; stack[sp++] = p + 1; }
        if (y > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = n; stack[sp++] = p - w; }
        if (y < h - 1 && mask[p + w] && !lab[p + w]) { lab[p + w] = n; stack[sp++] = p + w; }
      }
      info.push({ n: cnt, x0, y0, x1, y1 });
    }
    return { lab, info, count: n };
  }
  function keepComp(c, id, N) { const o = new Uint8Array(N); for (let i = 0; i < N; i++) if (c.lab[i] === id) o[i] = 1; return o; }
  function largest(mask, w, h) {
    const c = components(mask, w, h); let best = 0, bn = 0;
    for (let i = 1; i <= c.count; i++) if (c.info[i].n > bn) { bn = c.info[i].n; best = i; }
    return best ? keepComp(c, best, w * h) : mask;
  }
  // अंदर के छेद (नंबर/टेक्स्ट/रेखाएँ) भर देना
  function fillHoles(mask, w, h) {
    const N = w * h, out = new Uint8Array(N), seen = new Uint8Array(N), stack = new Int32Array(N);
    let sp = 0;
    const push = (p) => { if (!mask[p] && !seen[p]) { seen[p] = 1; stack[sp++] = p; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (sp) {
      const p = stack[--sp], x = p % w, y = (p / w) | 0;
      if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w);
    }
    for (let i = 0; i < N; i++) out[i] = seen[i] ? 0 : 1;
    return out;
  }

  /* ---------- रंग ---------- */
  const isBg = (r, g, b) => r > 226 && g > 226 && b > 226;
  const isDark = (r, g, b) => Math.max(r, g, b) < 105;
  function avgColor(img, x, y, rad) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) {
      const xx = x + i, yy = y + j; if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h) continue;
      const p = (yy * img.w + xx) * 4; r += img.data[p]; g += img.data[p + 1]; b += img.data[p + 2]; n++;
    }
    return n ? [r / n, g / n, b / n] : [255, 255, 255];
  }
  function colorMask(img, c, tol) {
    const d = img.data, N = img.w * img.h, o = new Uint8Array(N), t2 = tol * tol;
    for (let i = 0, p = 0; i < N; i++, p += 4) {
      const dr = d[p] - c[0], dg = d[p + 1] - c[1], db = d[p + 2] - c[2];
      if (dr * dr + dg * dg + db * db <= t2) o[i] = 1;
    }
    return o;
  }
  function floodFrom(mask, w, h, sx, sy) {
    const N = w * h, out = new Uint8Array(N), stack = new Int32Array(N); let sp = 0;
    const s = sy * w + sx; if (!mask[s]) return out;
    out[s] = 1; stack[sp++] = s;
    while (sp) {
      const p = stack[--sp], x = p % w, y = (p / w) | 0;
      if (x > 0 && mask[p - 1] && !out[p - 1]) { out[p - 1] = 1; stack[sp++] = p - 1; }
      if (x < w - 1 && mask[p + 1] && !out[p + 1]) { out[p + 1] = 1; stack[sp++] = p + 1; }
      if (y > 0 && mask[p - w] && !out[p - w]) { out[p - w] = 1; stack[sp++] = p - w; }
      if (y < h - 1 && mask[p + w] && !out[p + w]) { out[p + w] = 1; stack[sp++] = p + w; }
    }
    return out;
  }
  const chroma = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);

  /* ---------- सीमा-रेखा (contour) → बहुभुज ---------- */
  function traceOuter(m, w, h) {
    let sx = -1, sy = -1;
    outer: for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { sx = x; sy = y; break outer; }
    if (sx < 0) return [];
    const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1]; // E SE S SW W NW N NE
    const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] ? 1 : 0);
    const pts = []; let cx = sx, cy = sy, bd = 4, first = null, guard = 0;
    const limit = 8 * w * h;
    for (;;) {
      pts.push([cx + 0.5, cy + 0.5]);
      let found = -1;
      for (let i = 1; i <= 8; i++) { const d = (bd + i) % 8; if (at(cx + DX[d], cy + DY[d])) { found = d; break; } }
      if (found < 0) break;                       // अकेला पिक्सल
      const nx = cx + DX[found], ny = cy + DY[found];
      const pd = (found + 7) % 8, px = cx + DX[pd], py = cy + DY[pd];   // आखिरी जाँचा गया खाली पड़ोसी
      let nb = 0; for (let k = 0; k < 8; k++) if (nx + DX[k] === px && ny + DY[k] === py) { nb = k; break; }
      if (first == null) first = [nx, ny];
      else if (cx === sx && cy === sy && nx === first[0] && ny === first[1]) { pts.pop(); break; }
      cx = nx; cy = ny; bd = nb;
      if (++guard > limit) break;
    }
    return pts;
  }
  function dpOpen(P, a, b, eps, keep) {
    let imax = -1, dmax = 0;
    const [x1, y1] = P[a], [x2, y2] = P[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((P[i][0] - x1) * dy - (P[i][1] - y1) * dx) / L;
      if (d > dmax) { dmax = d; imax = i; }
    }
    if (dmax > eps) { dpOpen(P, a, imax, eps, keep); dpOpen(P, imax, b, eps, keep); } else keep.add(b);
  }
  function simplifyClosed(P, eps) {
    const n = P.length; if (n < 8) return P;
    let far = 0, fd = 0; for (let i = 1; i < n; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > fd) { fd = d; far = i; } }
    const A = P.slice(0, far + 1), B = P.slice(far).concat([P[0]]);
    const k1 = new Set([0]), k2 = new Set([0]);
    dpOpen(A, 0, A.length - 1, eps, k1); dpOpen(B, 0, B.length - 1, eps, k2);
    const out = []; A.forEach((p, i) => { if (k1.has(i)) out.push(p); });
    B.forEach((p, i) => { if (i > 0 && i < B.length - 1 && k2.has(i)) out.push(p); });
    return out.length >= 3 ? out : P;
  }
  // बहुभुज को पिक्सल-मास्क में भरना (even-odd)
  function rasterPoly(poly, w, h) {
    const m = new Uint8Array(w * h), n = poly.length;
    for (let y = 0; y < h; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.max(0, Math.ceil(xs[k] - 0.5)), x1 = Math.min(w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
        for (let x = x0; x <= x1; x++) m[y * w + x] = 1;
      }
    }
    return m;
  }

  /* ==========================================================
     1. पहचान — img = {w, h, data: RGBA}
     o.seed = {x, y} (टैप), o.tol = रंग की सहनशीलता (डिफ़ॉल्ट 34)
     ========================================================== */
  PS.detect = function (img, o) {
    o = o || {};
    const w = img.w, h = img.h, N = w * h, d = img.data, tol = o.tol || 34;
    let mask = null, color = null, how = "auto";
    const fail = (msg) => ({ ok: false, msg, w, h });

    if (o.seed) {
      const sx = clamp(Math.round(o.seed.x), 0, w - 1), sy = clamp(Math.round(o.seed.y), 0, h - 1);
      color = avgColor(img, sx, sy, 2); how = "tap";
      const p = (sy * w + sx) * 4, exact = [d[p], d[p + 1], d[p + 2]];
      if (isDark(exact[0], exact[1], exact[2])) return fail("टैप किसी काली रेखा / अक्षर पर पड़ा। प्लॉट के रंगीन (या खाली) हिस्से के अंदर टैप करें।");
      const white = isBg(color[0], color[1], color[2]);
      const cm = colorMask(img, color, white ? 14 : tol);
      mask = floodFrom(cm, w, h, sx, sy);
      if (!mask[sy * w + sx]) mask = floodFrom(colorMask(img, exact, white ? 14 : tol), w, h, sx, sy);
    } else {
      // रंगीन (highlight) हिस्से के उम्मीदवार: सफ़ेद और काले को छोड़कर सबसे ज़्यादा आने वाले रंग
      const cnt = new Int32Array(4096), sr = new Float64Array(4096), sg = new Float64Array(4096), sb = new Float64Array(4096);
      for (let i = 0, p = 0; i < N; i++, p += 4) {
        const r = d[p], g = d[p + 1], b = d[p + 2];
        if (isBg(r, g, b) || isDark(r, g, b)) continue;
        const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        cnt[k]++; sr[k] += r; sg[k] += g; sb[k] += b;
      }
      const keys = []; for (let k = 0; k < 4096; k++) if (cnt[k] > N * 0.004) keys.push(k);
      keys.sort((a, b) => cnt[b] - cnt[a]);
      const tried = []; let best = null;
      for (const k of keys.slice(0, 14)) {
        const c = [sr[k] / cnt[k], sg[k] / cnt[k], sb[k] / cnt[k]];
        if (tried.some((t) => Math.hypot(t[0] - c[0], t[1] - c[1], t[2] - c[2]) < tol * 0.6)) continue;
        tried.push(c);
        const cm = colorMask(img, c, tol), comp = components(cm, w, h);
        for (let i = 1; i <= comp.count; i++) {
          const b = comp.info[i];
          if (b.n < N * 0.008) continue;
          const edges = (b.x0 === 0) + (b.y0 === 0) + (b.x1 === w - 1) + (b.y1 === h - 1);
          if (edges >= 3) continue;                                   // पूरा बैकग्राउंड जैसा
          const fill = b.n / ((b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1));
          if (fill < 0.12) continue;                                  // बिखरा / जाल जैसा
          const score = b.n * (chroma(c) >= 28 ? 1.3 : 1) * (edges ? 0.7 : 1);
          if (!best || score > best.score) best = { score, c, comp, id: i };
        }
      }
      if (!best) return fail("फोटो में कोई अलग रंग से दिखाया हुआ प्लॉट नहीं मिला। फोटो पर उस प्लॉट के अंदर टैप करके चुनें।");
      mask = keepComp(best.comp, best.id, N); color = best.c;
    }

    // अंदर की पतली रेखाएँ / नंबर भरना, किनारे चिकने करना
    const rr = Math.max(2, Math.round(Math.max(w, h) * 0.006));
    let m = erode(dilate(mask, w, h, rr), w, h, rr);
    m = largest(fillHoles(m, w, h), w, h);
    m = largest(smooth(m, w, h, 2), w, h);
    m = fillHoles(m, w, h);
    m = dilate(m, w, h, 1);                                           // बाहरी बॉर्डर की रेखा भी शामिल
    let area = 0; for (let i = 0; i < N; i++) area += m[i];
    const frac = area / N;
    if (frac < 0.008) return fail("चुना हुआ हिस्सा बहुत छोटा है। प्लॉट के अंदर ठीक से टैप करें।");
    if (frac > 0.9) return fail("पूरा नक्शा ही चुना गया (प्लॉट की सीमा बंद नहीं दिखी)। प्लॉट के अंदर टैप करें या रंग-सहनशीलता घटाएँ।");

    const eps = Math.max(1.6, 0.0045 * Math.max(w, h));
    let poly = simplifyClosed(traceOuter(m, w, h), eps);
    if (poly.length < 3) return fail("प्लॉट की सीमा बन नहीं पाई। फोटो पर टैप करके प्लॉट चुनें।");
    const pm = rasterPoly(poly, w, h);
    let x0 = w, y0 = h, x1 = -1, y1 = -1, pa = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (pm[y * w + x]) { pa++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const warn = [];
    if (x0 <= 1 || y0 <= 1 || x1 >= w - 2 || y1 >= h - 2) warn.push("प्लॉट फोटो के किनारे को छू रहा है — हो सकता है फोटो में प्लॉट कटा हुआ हो।");
    if (poly.length > 40) warn.push("सीमा में बहुत मोड़ दिख रहे हैं; साफ़ फोटो हो तो नतीजा और बेहतर आएगा।");
    return { ok: true, w, h, mask: pm, poly, bbox: { x0, y0, x1, y1 }, area: pa, frac: pa / N, color, how, warn };
  };

  /* ==========================================================
     2. बँटवारा — det = detect() का नतीजा
     o.weights = हिस्सों का अनुपात (रकवा), o.dir = auto | v | h | long, o.rev = क्रम उलटा
     ========================================================== */
  PS.layout = function (det, o) {
    o = o || {};
    const w = det.w, h = det.h, m = det.mask, wts = (o.weights && o.weights.length ? o.weights : [1]).map((x) => (x > 0 ? x : 0));
    const n = wts.length, sumW = wts.reduce((a, b) => a + b, 0) || 1;
    // मुख्य अक्ष (PCA)
    let sx = 0, sy = 0, c = 0;
    for (let y = det.bbox.y0; y <= det.bbox.y1; y++) for (let x = det.bbox.x0; x <= det.bbox.x1; x++) if (m[y * w + x]) { sx += x; sy += y; c++; }
    const mx = sx / c, my = sy / c;
    let sxx = 0, syy = 0, sxy = 0;
    for (let y = det.bbox.y0; y <= det.bbox.y1; y++) for (let x = det.bbox.x0; x <= det.bbox.x1; x++) if (m[y * w + x]) { const dx = x - mx, dy = y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const tr = sxx + syy, df = Math.sqrt(Math.max(0, (sxx - syy) * (sxx - syy) + 4 * sxy * sxy));
    const l1 = (tr + df) / 2, l2 = Math.max((tr - df) / 2, 1e-9), elong = Math.sqrt(l1 / l2);
    let u;
    const dir = o.dir || "auto";
    if (dir === "v") u = [1, 0];
    else if (dir === "h") u = [0, 1];
    else if (dir === "long") u = [Math.cos(th), Math.sin(th)];
    else {
      const deg = Math.abs(th * 180 / Math.PI);                       // 0..90
      if (elong < 1.2) u = [1, 0];                                    // लगभग चौकोर — खड़ी रेखाएँ
      else if (deg <= 25) u = [1, 0];
      else if (deg >= 65) u = [0, 1];
      else u = [Math.cos(th), Math.sin(th)];
    }
    if (u[0] < -1e-9 || (Math.abs(u[0]) < 1e-9 && u[1] < 0)) u = [-u[0], -u[1]];
    const v = [-u[1], u[0]];

    // t = बिंदु का u-अक्ष पर मान; उसका histogram → रकवा के अनुपात पर कटाव
    const ts = new Float32Array(c); let k = 0, tmin = 1e9, tmax = -1e9;
    for (let y = det.bbox.y0; y <= det.bbox.y1; y++) for (let x = det.bbox.x0; x <= det.bbox.x1; x++) if (m[y * w + x]) {
      const t = (x + 0.5) * u[0] + (y + 0.5) * u[1]; ts[k++] = t; if (t < tmin) tmin = t; if (t > tmax) tmax = t;
    }
    const NB = 4096, bw = (tmax - tmin) / NB || 1, hist = new Float64Array(NB);
    for (let i = 0; i < c; i++) hist[Math.min(NB - 1, ((ts[i] - tmin) / bw) | 0)]++;
    const order = []; for (let i = 0; i < n; i++) order.push(o.rev ? n - 1 - i : i);
    const cuts = []; let acc = 0, target = 0, bi = 0, cum = 0;
    for (let i = 0; i < n - 1; i++) {
      acc += wts[order[i]]; target = (acc / sumW) * c;
      while (bi < NB - 1 && cum + hist[bi] < target) { cum += hist[bi]; bi++; }
      const part = hist[bi] ? (target - cum) / hist[bi] : 0;
      cuts.push(tmin + (bi + clamp(part, 0, 1)) * bw);
    }
    // हर पिक्सल का हिस्सा, और हर हिस्से का "सबसे चौड़ा" बिंदु (label के लिए)
    const pid = new Uint8Array(w * h), st = [];
    for (let i = 0; i < n; i++) st.push({ n: 0, x0: w, y0: h, x1: -1, y1: -1 });
    for (let y = det.bbox.y0; y <= det.bbox.y1; y++) for (let x = det.bbox.x0; x <= det.bbox.x1; x++) if (m[y * w + x]) {
      const t = (x + 0.5) * u[0] + (y + 0.5) * u[1]; let s = 0; while (s < cuts.length && t >= cuts[s]) s++;
      pid[y * w + x] = s + 1; const q = st[s]; q.n++; if (x < q.x0) q.x0 = x; if (x > q.x1) q.x1 = x; if (y < q.y0) q.y0 = y; if (y > q.y1) q.y1 = y;
    }
    const parts = [];
    for (let s = 0; s < n; s++) {
      const q = st[s]; let px = mx, py = my, pr = 1;
      if (q.n) {
        const bw2 = q.x1 - q.x0 + 3, bh2 = q.y1 - q.y0 + 3, D = new Float32Array(bw2 * bh2), BIG = 1e6;
        for (let y = 0; y < bh2; y++) for (let x = 0; x < bw2; x++) {
          const gx = q.x0 - 1 + x, gy = q.y0 - 1 + y;
          D[y * bw2 + x] = gx >= 0 && gy >= 0 && gx < w && gy < h && pid[gy * w + gx] === s + 1 ? BIG : 0;
        }
        for (let y = 1; y < bh2 - 1; y++) for (let x = 1; x < bw2 - 1; x++) { const i = y * bw2 + x; if (D[i]) D[i] = Math.min(D[i], D[i - 1] + 3, D[i - bw2] + 3, D[i - bw2 - 1] + 4, D[i - bw2 + 1] + 4); }
        let bestD = -1;
        for (let y = bh2 - 2; y >= 1; y--) for (let x = bw2 - 2; x >= 1; x--) {
          const i = y * bw2 + x; if (D[i]) { D[i] = Math.min(D[i], D[i + 1] + 3, D[i + bw2] + 3, D[i + bw2 + 1] + 4, D[i + bw2 - 1] + 4); if (D[i] > bestD) { bestD = D[i]; px = q.x0 - 1 + x + 0.5; py = q.y0 - 1 + y + 0.5; } }
        }
        pr = Math.max(1, bestD / 3);
      }
      parts.push({ slot: s, item: order[s], frac: q.n / c, wfrac: wts[order[s]] / sumW, px, py, pr });
    }
    return { u, v, cuts, tmin, tmax, parts, n, dir, elong, angle: Math.atan2(u[1], u[0]) * 180 / Math.PI };
  };

  /* ==========================================================
     3. चित्र बनाना — canvas पर (सफ़ेद बैकग्राउंड, सिर्फ़ चुना हुआ प्लॉट)
     info = { head: "खेसरा 123 · कुल रकवा 0-60", items: [{title, area}] }   (items[i] = हिस्सा i)
     ========================================================== */
  PS.draw = function (canvas, det, lay, info) {
    info = info || {};
    const bb = det.bbox, bw = bb.x1 - bb.x0 + 1, bh = bb.y1 - bb.y0 + 1;
    const MAXP = info.maxPlot || 520, pad = 18, headH = info.head ? 46 : 0;
    const S = Math.min(MAXP / bw, MAXP / bh);
    const W = Math.round(Math.max(bw * S + 2 * pad, 340)), H = Math.round(bh * S + 2 * pad + headH);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    const ox = (W - bw * S) / 2 - bb.x0 * S, oy = pad + headH - bb.y0 * S;
    const X = (x) => x * S + ox, Y = (y) => y * S + oy;
    const polyPath = () => { ctx.beginPath(); det.poly.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath(); };
    const BIG = (det.w + det.h) * 2, u = lay.u, v = lay.v;
    const edge = (t, side) => [X(u[0] * t + v[0] * BIG * side), Y(u[1] * t + v[1] * BIG * side)];

    if (info.head) {
      ctx.fillStyle = "#111"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let fs = 24; ctx.font = "700 " + fs + "px " + FONT;
      const tw = ctx.measureText(info.head).width; if (tw > W - 24) { fs = Math.max(11, fs * (W - 24) / tw); ctx.font = "700 " + fs + "px " + FONT; }
      ctx.fillText(info.head, W / 2, headH / 2 + 8);
    }
    // हिस्सों के रंग (प्लॉट की सीमा के अंदर clip करके)
    for (let s = 0; s < lay.n; s++) {
      const ta = s === 0 ? lay.tmin - BIG : lay.cuts[s - 1], tb = s === lay.n - 1 ? lay.tmax + BIG : lay.cuts[s];
      ctx.save(); polyPath(); ctx.clip();
      ctx.fillStyle = COLORS[lay.parts[s].item % COLORS.length];
      const a1 = edge(ta, -1), a2 = edge(ta, 1), b1 = edge(tb, -1), b2 = edge(tb, 1);
      ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b1[0], b1[1]); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // विभाजन रेखाएँ
    ctx.save(); polyPath(); ctx.clip();
    ctx.strokeStyle = "#333"; ctx.lineWidth = 2; ctx.setLineDash([9, 5]);
    lay.cuts.forEach((t) => { const p = edge(t, -1), q = edge(t, 1); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); });
    ctx.restore(); ctx.setLineDash([]);
    // बाहरी सीमा
    polyPath(); ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.stroke();
    // नाम + रकवा
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lay.parts.forEach((p, s) => {
      const it = (info.items && info.items[p.item]) || {}, lines = [it.title, it.area].filter((x) => x);
      if (!lines.length) return;
      const r = p.pr * S, cx = X(p.px), cy = Y(p.py);
      ctx.font = "700 100px " + FONT;
      const wmax = Math.max.apply(null, lines.map((t) => ctx.measureText(t).width)) / 100;
      let fs = Math.min(30, (1.8 * r) / (wmax || 1), (1.7 * r) / (lines.length * 1.25));
      fs = Math.max(8, fs);
      ctx.font = "700 " + fs + "px " + FONT;
      const lh = fs * 1.25, top = cy - (lines.length - 1) * lh / 2;
      lines.forEach((t, i) => {
        ctx.lineWidth = fs * 0.2; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.strokeText(t, cx, top + i * lh);
        ctx.fillStyle = "#111"; ctx.fillText(t, cx, top + i * lh);
      });
    });
    return { w: W, h: H, scale: S };
  };

  // एक कदम में: पहचान + बँटवारा + चित्र
  PS.build = function (canvas, img, o, info) {
    const det = PS.detect(img, o || {});
    if (!det.ok) return { ok: false, msg: det.msg };
    const lay = PS.layout(det, o || {});
    const out = PS.draw(canvas, det, lay, info || {});
    return { ok: true, det, lay, out };
  };

  root.PlotSketch = PS;
})(typeof window !== "undefined" ? window : globalThis);

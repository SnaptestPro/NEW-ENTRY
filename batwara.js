/* ==========================================================
   बँटवारा पंचनामा (Schedule) — DOCX + live preview  (v4)
   - एक पेज पर अधिकतम 5 अनुसूचि, सब एक ही table की अलग-अलग कॉलम में
   - पेज की चौड़ाई/ऊँचाई कॉलम के हिसाब से अपने-आप तय होती है (A3 से चौड़ा भी, Word की सीमा 22 इंच तक)
   - पंक्तियाँ = जितनी entry भरी; खाली कॉलम दिखते ही नहीं
   - रैयत का नाम / पिता / पता एक ही बार (उसकी सारी पंक्तियों में merge)
   - Browser (JSZip global) और Node दोनों में चलता है
   ========================================================== */
(function (root) {

  const MAX_SCHED_PER_PAGE = 5;
  const DEFAULT_DECL = "हम सभी फरीकैन आपस में सहमति से बखुदहा जमीन बँटवारा कर जोत आबाद कर रहे हैं। दिए शेड्यूल पर अंकित खाता एवं खेसरा एवं रकवा पर भविष्य में एक दूसरे की हिस्से की भूमि पर फरीकैन या उनके वंशज दावा नहीं करेंगे। अगर किसी के द्वारा किसी प्रकार का दावा प्रस्तुत किया जाता है तो वह मान्य नहीं होगा। इस पर हम {संख्या} फरीकैन को मंजूर है और अपना हस्ताक्षर किया हूँ।";
  const DEFAULT_SIGN = "गवाह - 1\nगवाह - 2";
  // राजस्व कर्मचारी / अंचल अधिकारी / सामान्य "पक्षकार" हस्ताक्षर अब नहीं छपते (पक्षकार का हस्ताक्षर हर अनुसूचि के नीचे अलग से)
  const SIGN_DROP = /राजस्व\s*(कर्मचारी|अधिकारी)|अंचल\s*अधिकारी|^पक्षकार\s*के\s*हस्ताक्षर/;
  const cleanSign = (txt) => String(txt).split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !SIGN_DROP.test(x)).join("\n");
  const PAPER = { A4: [16838, 11906, 5], A3: [23811, 16838, 5], Legal: [20160, 12240, 5] };   // landscape: चौड़ाई, ऊँचाई, एक पेज पर अनुसूचि
  function getOpts(st) {
    const o = (st && st.opts) || {};
    return { pageNo: o.pageNo !== false, sign: !!o.sign, signLabels: o.signLabels != null ? cleanSign(o.signLabels) : DEFAULT_SIGN,
      border: o.border !== false, partySign: o.partySign !== false,
      totalRow: !!o.totalRow, paper: PAPER[o.paper] ? o.paper : "auto",
      decl: o.decl !== false, declText: o.declText != null ? String(o.declText) : DEFAULT_DECL, declFoot: o.declFoot != null ? String(o.declFoot) : "गवाह का हस्त०",
      rowsPerPage: Math.max(3, Math.min(60, parseInt(o.rowsPerPage, 10) || 12)),
      design: THEMES[o.design] ? o.design : "colorful",
      partyWord: o.partyWord != null && String(o.partyWord).trim() !== "" ? String(o.partyWord).trim() : "auto" };
  }
  // "हम ___ फरीकैन" में क्या लिखें: auto = अनुसूचि की गिनती से; "-" = कुछ नहीं; वरना जो लिखा हो वही
  const PARTY_AUTO = { 1: "", 2: "दोनों", 3: "तीनों", 4: "चारों", 5: "पाँचों" };
  function partyWordFor(opts, n) { const w = String(opts.partyWord || "auto").trim() || "auto"; return w === "-" ? "" : w === "auto" ? (PARTY_AUTO[n] != null ? PARTY_AUTO[n] : "सभी") : w; }
  const fillParty = (txt, word) => String(txt).replace(/\{संख्या\}/g, word).replace(/ {2,}/g, " ");
  const toDec = (ac, dc) => { ac = t(ac); dc = t(dc); if (!ac && !dc) return null; return (parseFloat(ac) || 0) * 100 + (parseFloat(dc) || 0); };
  const fmtDec = (v) => { v = Math.round(v * 100) / 100; const a = Math.floor(v / 100 + 1e-9); return rk(String(a), String(Math.round((v - a * 100) * 100) / 100)); };
  const MARGIN = 560;                 // बाएँ/दाएँ margin (twips) — बॉर्डर के लिए थोड़ी ज़्यादा जगह
  const PAGE_MIN_W = 16838;           // A4 landscape
  const PAGE_MAX_W = 31680;           // Word की अधिकतम चौड़ाई (22 इंच)
  const MAX_SCALE = 2.2;
  const BLOCK_MIN = 3600;             // अनुसूचि header में नाम समाने भर की न्यूनतम चौड़ाई

  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (v) => String(v == null ? "" : v).trim();

  /* ---------- रकवा / चौहद्दी ---------- */
  function rk(ac, dc) {
    ac = t(ac); dc = t(dc);
    if (!ac && !dc) return "";
    const n = parseFloat(dc);
    return (ac || "0") + "-" + (isNaN(n) ? (dc || "0") : String(n));
  }
  const DIRS = [["उ॰", "north"], ["द॰", "south"], ["पू॰", "east"], ["प॰", "west"]];
  function chauLines(x) {
    const out = [];
    DIRS.forEach(([lab, k]) => {
      const v = t(x[k]), ref = t(x[k + "_ref"]);
      if (v || ref) out.push(lab + " " + v + (ref ? " (खे॰ " + ref + ")" : ""));
    });
    return out;
  }
  const one = (v) => { v = t(v); return v ? [v] : []; };

  /* ---------- state -> flat rows ---------- */
  function plotHasData(p) {
    return ["jamabandi", "khata", "khesra", "k_ac", "k_dc", "n_ac", "n_dc"].some((k) => t(p[k])) || !!(p.abhi_img && p.abhi_img.d) ||
      (p.sch || []).some((s) => Object.keys(s).some((k) => t(s[k])));
  }
  function flatten(st, n) {
    const rows = [];
    (st.groups || []).forEach((g, gi) => {
      const nameLines = [];
      if (t(g.name)) nameLines.push(t(g.name));
      if (t(g.rel_naam)) nameLines.push((t(g.rel_type) || "पिता") + "- " + t(g.rel_naam));
      if (t(g.addr)) nameLines.push(t(g.addr));
      (g.plots || []).filter(plotHasData).forEach((p, pi) => {
        rows.push({
          gi, nameLines, jamabandi: t(p.jamabandi), khata: t(p.khata), khesra: t(p.khesra),
          k: rk(p.k_ac, p.k_dc), n: rk(p.n_ac, p.n_dc), kd: toDec(p.k_ac, p.k_dc), nd: toDec(p.n_ac, p.n_dc), img: p.abhi_img && p.abhi_img.d ? p.abhi_img : null,
          sch: Array.from({ length: n }, (_, s) => {
            const x = (p.sch && p.sch[s]) || {};
            return { khata: t(x.khata), khesra: t(x.khesra), k: rk(x.k_ac, x.k_dc), n: rk(x.n_ac, x.n_dc), kd: toDec(x.k_ac, x.k_dc), nd: toDec(x.n_ac, x.n_dc), min_janib: t(x.min_janib), ch: chauLines(x) };
          })
        });
      });
    });
    return rows;
  }

  /* ---------- अनुसूचियों को बराबर हिस्सों में बाँटना (अधिकतम 5) ---------- */
  function splitEven(arr, max) {
    const pages = Math.ceil(arr.length / max), out = [];
    let i = 0;
    for (let p = 0; p < pages; p++) {
      const size = Math.ceil((arr.length - i) / (pages - p));
      out.push(arr.slice(i, i + size)); i += size;
    }
    return out;
  }

  /* ---------- layout model (DOCX और preview दोनों इसी से बनते हैं) ---------- */
  const W = { name: 2000, jam: 700, khata: 680, khesra: 680, k: 760, n: 760,
              s_khata: 680, s_khesra: 680, s_k: 760, s_n: 760, s_min: 700, s_ch: 1300, abhi: 900, abhiImg: 2400 };
  const NB = "\u00a0";
  const EMU = 635;                     // 1 twip = 635 EMU
  const COMB = /[\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962\u0963]/g;
  // शब्द cell में बीच से न टूटे — इसलिए सबसे लंबे शब्द के हिसाब से अक्षर का साइज़
  function fitSz(lines, w, base, min, f) {
    let L = 1;
    (lines || []).forEach((l) => String(l).split(/[ ]+/).forEach((tok) => { L = Math.max(L, tok.replace(COMB, "").length); }));
    return Math.max(min || 10, Math.min(base, Math.floor((w - 90) / (L * (f || 5.8)))));
  }

  // ---- डिज़ाइन (थीम) ----
  const THEMES = {
    colorful: { label: "रंगीन", note: "हर अनुसूचि का अलग हल्का रंग", title: "000000", rule: null, boxBorder: "1F3864", boxFill: "FFFFFF", infoFill: "EEF2F9",
      left: ["B4C6E7", "D9E2F3"], abhi: ["D0CECE", "EDEDED"], blocks: [["BDD7EE", "DDEBF7"], ["C6E0B4", "E2EFDA"], ["FFE699", "FFF2CC"], ["F8CBAD", "FCE4D6"], ["D9C3F0", "EDE1F7"]],
      num: "F2F2F2", headText: "000000", zebra: null, bColor: "000000", oColor: "000000", outer: 12, inner: 6, total: "F2F2F2" },
    classic: { label: "क्लासिक (सादा)", note: "सरकारी फॉर्म जैसा, काला-सफ़ेद प्रिंट के लिए सही", title: "000000", rule: null, boxBorder: "000000", boxFill: "FFFFFF", infoFill: "FFFFFF",
      left: ["D9D9D9", "EFEFEF"], abhi: ["D9D9D9", "EFEFEF"], blocks: [["D9D9D9", "EFEFEF"]],
      num: "FFFFFF", headText: "000000", zebra: null, bColor: "000000", oColor: "000000", outer: 12, inner: 4, total: "E7E6E6" },
    modern: { label: "आधुनिक नीला", note: "गहरा नीला header, एक-एक पंक्ति छोड़कर हल्की पट्टी", title: "1F3864", rule: "1F3864", boxBorder: "1F3864", boxFill: "FFFFFF", infoFill: "E8EEF9",
      left: ["1F3864", "DCE6F5"], abhi: ["44546A", "E4E8EF"], blocks: [["2F5597", "DCE6F5"], ["1F7A8C", "D8EEF2"]],
      num: "EEF2F9", headText: "FFFFFF", zebra: "F4F7FC", bColor: "8EA3C7", oColor: "1F3864", outer: 12, inner: 4, total: "DCE6F5" },
    traditional: { label: "पारंपरिक (मैरून-सुनहरा)", note: "मैरून header, सुनहरी रेखा, क्रीम पट्टी", title: "7B1E2B", rule: "C9A227", boxBorder: "7B1E2B", boxFill: "FFFDF6", infoFill: "FBF1D9",
      left: ["7B1E2B", "F3E2B8"], abhi: ["5B1520", "F3E2B8"], blocks: [["8B3A3A", "F6E8C8"], ["6B4F1D", "EFE2C0"]],
      num: "FBF1D9", headText: "FFFFFF", zebra: "FFFBF0", bColor: "9C7A4B", oColor: "7B1E2B", outer: 12, inner: 4, total: "F3E2B8" }
  };
  function layout(st) {
    const scheds = (st.schedules || []).map((s, i) => {
      const parts = [t(s.name)];
      if (t(s.rel_naam)) parts.push((t(s.rel_type) || "पिता") + "-" + t(s.rel_naam));
      const l2 = parts.filter(Boolean).join(" ");
      const l3 = [t(s.jati) && "जाति:- " + t(s.jati), t(s.nivasi) && "निवासी:- " + t(s.nivasi)].filter(Boolean).join(" , ");
      const detail = [l2, l3].filter(Boolean);
      return { idx: i, no: i + 1, name: t(s.name), detail };
    });
    if (!scheds.length) throw new Error("कम से कम एक अनुसूचि चाहिए।");
    const rows = flatten(st, scheds.length);
    if (!rows.length) throw new Error("कम से कम एक पंक्ति में डाटा भरें।");
    const any = (f) => rows.some(f);

    const showLeft = { jam: any((r) => r.jamabandi), khata: any((r) => r.khata), khesra: any((r) => r.khesra), k: any((r) => r.k), n: any((r) => r.n) };
    if (!Object.values(showLeft).some(Boolean)) showLeft.khesra = true;
    const showSched = scheds.map((sc) => {
      const f = { khata: any((r) => r.sch[sc.idx].khata), khesra: any((r) => r.sch[sc.idx].khesra), k: any((r) => r.sch[sc.idx].k),
                  n: any((r) => r.sch[sc.idx].n), min: any((r) => r.sch[sc.idx].min_janib), ch: any((r) => r.sch[sc.idx].ch.length) };
      if (!Object.values(f).some(Boolean)) f.khesra = true;
      return f;
    });
    const showAbhi = any((r) => r.img), images = [];

    const opts = getOpts(st), fixed = PAPER[opts.paper];
    // फोटो का खाना: एक पेज में rowsPerPage पंक्तियाँ आ जाएँ — इसलिए पंक्ति जितनी ज़्यादा, फोटो उतनी छोटी (सब पेज पर एक ही नाप)
    const R0 = Math.max(1, Math.min(opts.rowsPerPage, rows.length));
    const slotH = Math.max(800, Math.min(1800, Math.floor(((fixed ? fixed[1] - 7000 : 22000 - 7000)) / R0) - 150));
    const slotW = Math.round(slotH * 1.2), abhiW = slotW + 140;
    const parts = splitEven(scheds, fixed ? fixed[2] : MAX_SCHED_PER_PAGE);
    const chunks = parts.map((schedChunk) => {
      const isLast = schedChunk === parts[parts.length - 1];
      const cols = [];
      cols.push({ id: "name", label: ["खतियानी रैयत का", "नाम व पता"], w: W.name });
      if (showLeft.jam) cols.push({ id: "jam", label: ["जमाबंदी", "सांख्या"], w: W.jam });
      if (showLeft.khata) cols.push({ id: "khata", label: ["खाता", "सांख्या"], w: W.khata });
      if (showLeft.khesra) cols.push({ id: "khesra", label: ["खेसरा", "सांख्या"], w: W.khesra });
      if (showLeft.k) cols.push({ id: "k", label: ["खतियानी", "रकवा", "(ए०"+NB+"डी०)"], w: W.k });
      if (showLeft.n) cols.push({ id: "n", label: ["नक्शा", "रकवा", "(ए०"+NB+"डी०)"], w: W.n });
      const nLeft = cols.length, blocks = [];
      schedChunk.forEach((sc) => {
        const sh = showSched[sc.idx], start = cols.length;
        if (sh.khata) cols.push({ id: "s_khata", s: sc.idx, label: ["खाता", "सांख्या"], w: W.s_khata });
        if (sh.khesra) cols.push({ id: "s_khesra", s: sc.idx, label: ["खेसरा", "सांख्या"], w: W.s_khesra });
        if (sh.k) cols.push({ id: "s_k", s: sc.idx, label: ["खतियानी", "रकवा", "(ए०"+NB+"डी०)"], w: W.s_k });
        if (sh.n) cols.push({ id: "s_n", s: sc.idx, label: ["नक्शा", "रकवा", "(ए०"+NB+"डी०)"], w: W.s_n });
        if (sh.min) cols.push({ id: "s_min", s: sc.idx, label: ["मिन", "जानिब"], w: W.s_min });
        if (sh.ch) cols.push({ id: "s_ch", s: sc.idx, label: ["चौहद्दी"], w: W.s_ch, jc: "left" });
        cols.slice(start).forEach((c) => { c.blk = sc.idx % 5; });
        blocks.push({ sc, start, span: cols.length - start });
      });
      if (showAbhi) cols.push({ id: "abhi", label: ["अभियुक्ति"], w: abhiW, blk: -2 });

      // पेज की चौड़ाई: कॉलम जितने, पेज उतना (A4 landscape से 22 इंच तक)
      const natural = cols.reduce((a, c) => a + c.w, 0);
      let pageW = fixed ? fixed[0] : Math.max(PAGE_MIN_W, Math.min(PAGE_MAX_W, natural + 2 * MARGIN));
      let usable = pageW - 2 * MARGIN;
      // अभियुक्ति (फोटो) का कॉलम हर पेज पर एक ही नाप का रहता है; बाकी कॉलम बचे हुए में फैलते हैं
      const fixAb = showAbhi ? abhiW : 0;
      const scale = Math.min(MAX_SCALE, (usable - fixAb) / Math.max(1, natural - fixAb));
      cols.forEach((c) => { c.w = c.id === "abhi" ? fixAb : Math.round(c.w * scale); });
      blocks.forEach((b) => {
        const sl = cols.slice(b.start, b.start + b.span), sum = sl.reduce((a, c) => a + c.w, 0);
        if (sum < BLOCK_MIN) sl.forEach((c) => { c.w = Math.round(c.w * BLOCK_MIN / sum); });
      });
      let raw = cols.reduce((a, c) => a + c.w, 0);
      if (!fixed && raw > usable) { pageW = Math.min(PAGE_MAX_W, raw + 2 * MARGIN); usable = pageW - 2 * MARGIN; }   // खाली अनुसूचि के न्यूनतम खाने से चौड़ाई बढ़ी तो पेज चौड़ा करें, कॉलम न दबाएँ
      if (raw > usable) cols.forEach((c) => { if (c.id !== "abhi") c.w = Math.floor(c.w * (usable - fixAb) / (raw - fixAb)); });
      const total = cols.reduce((a, c) => a + c.w, 0);
      let pageH = fixed ? fixed[1] : Math.max(11906, Math.min(PAGE_MAX_W, Math.round(pageW * 0.7071)));
      const wAt = (from, span) => cols.slice(from, from + span).reduce((a, c) => a + c.w, 0);

      const T = THEMES[opts.design], hc = T.headText;
      const palOf = (c, dark) => c.blk === undefined ? T.left[dark ? 0 : 1] : c.blk === -2 ? T.abhi[dark ? 0 : 1] : T.blocks[c.blk % T.blocks.length][dark ? 0 : 1];
      const labelSz = Math.min.apply(null, cols.filter((c) => c.id !== "abhi").map((c) => fitSz(c.label, c.w, 22, 11)));
      const hdr1 = [{ span: nLeft, lines: ["मोताविक जमाबंदी एवं मोताविक खतियान"], bold: true, shade: T.left[0], color: hc, sz: 20 }];
      blocks.forEach((b) => hdr1.push({ span: b.span, lines: ["अनुसूचि ( Schedule ) सांख्या " + b.sc.no + " बनाम्"].concat(b.sc.detail), bold: true, shade: T.blocks[b.sc.idx % T.blocks.length][0], color: hc, sz: 19 }));
      if (showAbhi) hdr1.push({ span: 1, lines: ["अभियुक्ति"], bold: true, shade: T.abhi[0], color: hc, vm: "restart", head: 3, sz: 19 });
      const hdr2 = cols.map((c) => c.id === "abhi" ? { span: 1, lines: [], vm: "cont", shade: T.abhi[0] } : { span: 1, lines: c.label, bold: true, shade: palOf(c, false), sz: labelSz });
      const hdr3 = cols.map((c, i) => c.id === "abhi" ? { span: 1, lines: [], vm: "cont", shade: T.abhi[0] } : { span: 1, lines: [String(i + 1)], shade: T.num, sz: Math.max(11, labelSz - 4) });

      const mergeState = (i, key, byGroup) => {
        const r = rows[i], prev = rows[i - 1], next = rows[i + 1];
        const eq = (o) => o && o.gi === r.gi && (byGroup || (r[key] !== "" && o[key] === r[key]));
        if (eq(prev)) return "cont";
        if (eq(next)) return "restart";
        return null;
      };
      const bodyRows = rows.map((r, i) => cols.map((c) => {
        const cell = { span: 1, lines: [] };
        switch (c.id) {
          case "name": cell.vm = mergeState(i, "name", true); cell.lines = cell.vm === "cont" ? [] : r.nameLines; cell.jc = "left"; cell.va = "top"; break;
          case "jam": cell.vm = mergeState(i, "jamabandi"); cell.lines = cell.vm === "cont" ? [] : one(r.jamabandi); break;
          case "khata": cell.vm = mergeState(i, "khata"); cell.lines = cell.vm === "cont" ? [] : one(r.khata); break;
          case "khesra": cell.lines = one(r.khesra); break;
          case "k": cell.lines = one(r.k); break;
          case "n": cell.lines = one(r.n); break;
          case "s_khata": cell.lines = one(r.sch[c.s].khata); break;
          case "s_khesra": cell.lines = one(r.sch[c.s].khesra); break;
          case "s_k": cell.lines = one(r.sch[c.s].k); break;
          case "s_n": cell.lines = one(r.sch[c.s].n); break;
          case "s_min": cell.lines = one(r.sch[c.s].min_janib); break;
          case "s_ch": cell.lines = r.sch[c.s].ch; cell.jc = "left"; break;
          case "abhi": if (r.img) {
            // तय खाना: चौड़ाई = कॉलम − थोड़ी जगह; ऊँचाई = चौड़ाई × 0.85; फोटो का अनुपात (aspect) बना रहता है
            const bw = slotW, bh = slotH, ar = (r.img.w || 4) / (r.img.h || 3);
            let wd = bw, ht = Math.round(wd / ar); if (ht > bh) { ht = bh; wd = Math.round(ht * ar); }
            images.push(r.img.d);
            cell.img = { n: images.length, cx: wd * EMU, cy: ht * EMU, wTw: wd, hTw: ht, d: r.img.d }; cell.imgH = bh;
          } break;
        }
        if (T.zebra && i % 2 === 1 && !cell.vm) cell.shade = T.zebra;
        return cell;
      }));
      if (opts.totalRow) {
        const sum = (get) => { let tot = null; rows.forEach((r) => { const v = get(r); if (v != null) tot = (tot || 0) + v; }); return tot == null ? [] : [fmtDec(tot)]; };
        bodyRows.push(cols.map((c) => {
          const cell = { span: 1, lines: [], bold: true, shade: T.total };
          if (c.id === "name") { cell.lines = ["कुल जोड़"]; cell.jc = "left"; }
          else if (c.id === "k") cell.lines = sum((r) => r.kd);
          else if (c.id === "n") cell.lines = sum((r) => r.nd);
          else if (c.id === "s_k") cell.lines = sum((r) => r.sch[c.s].kd);
          else if (c.id === "s_n") cell.lines = sum((r) => r.sch[c.s].nd);
          return cell;
        }));
      }
      // एक जैसे अक्षर-साइज़: संख्या वाले सारे कॉलम एक साइज़, बाकी अपने-अपने
      const NUM = ["jam", "khata", "khesra", "k", "n", "s_khata", "s_khesra", "s_k", "s_n"];
      const colLines = (ci) => [].concat.apply([], bodyRows.map((r) => r[ci].lines));
      const numSz = Math.min.apply(null, [24].concat(cols.map((c, ci) => NUM.indexOf(c.id) >= 0 ? fitSz(colLines(ci), c.w, 24, 12, 7.2) : 24)));
      cols.forEach((c, ci) => {
        const base = c.id === "name" ? 20 : c.id === "s_ch" ? 16 : c.id === "s_min" ? 19 : c.id === "abhi" ? 19 : numSz;
        const sz = NUM.indexOf(c.id) >= 0 ? numSz : fitSz(colLines(ci), c.w, base, 10);
        bodyRows.forEach((r) => { r[ci].sz = sz; });
      });
      bodyRows.forEach((r, ri) => { r.forEach((cell, ci) => { if (cols[ci].id === "name" && !(opts.totalRow && ri === bodyRows.length - 1)) cell.boldFirst = true; }); });
      // ---- पेज की ऊँचाई: पंक्तियों की असली ऊँचाई से (एक पेज में ≈ rowsPerPage खेसरा) ----
      if (!fixed) {
        const MINROW = 520, LH = (z) => z * 15.5, TW = (x, z) => String(x).replace(COMB, "").length * z * 5.8;
        const nl = (lines, z, w) => Math.max(1, (lines || []).reduce((a, l) => a + Math.max(1, Math.ceil(TW(l, z) / Math.max(200, w - 100))), 0));
        const hs = bodyRows.map((r) => Math.max.apply(null, [MINROW].concat(r.map((cell, ci) => cell.vm ? 0 : cell.img ? cell.imgH + 140 : nl(cell.lines, cell.sz || 18, cols[ci].w) * LH(cell.sz || 18) + 80))));
        bodyRows.forEach((r, i) => r.forEach((cell, ci) => {
          if (cell.vm !== "restart") return;
          let j = i; while (j + 1 < bodyRows.length && bodyRows[j + 1][ci].vm === "cont") j++;
          const need = nl(cell.lines, cell.sz || 18, cols[ci].w) * LH(cell.sz || 18) + 80;
          let sum = 0; for (let q = i; q <= j; q++) sum += hs[q];
          if (sum < need) { const add = (need - sum) / (j - i + 1); for (let q = i; q <= j; q++) hs[q] += add; }
        }));
        const hb = headerBlock(st.header || {}, pageW, T), tw = total - 200;
        let top = 1440;
        hb.paras.forEach((p) => { top += Math.max(1, Math.ceil(TW(p.runs.map((r) => r.t).join(""), p.sz) / tw)) * LH(p.sz) + 50; });
        top += 240 + Math.max(1, Math.ceil(TW(hb.info.runs.map((r) => r.t).join(""), hb.info.sz) / tw)) * LH(hb.info.sz) + 220 + 400;
        let pos = 0, h1 = 0;
        hdr1.forEach((cell) => { const w = cols.slice(pos, pos + cell.span).reduce((a, c) => a + c.w, 0); pos += cell.span; h1 = Math.max(h1, nl(cell.lines, cell.sz, w) * LH(cell.sz) + 70); });
        const h2 = Math.max.apply(null, hdr2.map((cell, ci) => cell.vm ? 0 : nl(cell.lines, cell.sz, cols[ci].w) * LH(cell.sz) + 70));
        top += h1 + h2 + LH(labelSz) + 70;
        const R = opts.rowsPerPage, n = hs.length;
        let area = 0;
        if (n <= R) area = hs.reduce((a, b) => a + b, 0);
        else for (let i = 0; i + R <= n; i++) { let sm = 0; for (let q = i; q < i + R; q++) sm += hs[q]; area = Math.max(area, sm); }
        let extra = (opts.partySign ? 1200 + 420 : 0) + (opts.partySign || opts.sign ? 420 : 0) + (opts.border ? 300 : 0);
        if (n <= R && isLast) {
          const dz = declSize(pageW);
          if (opts.decl) {
            const dl = fillParty(opts.declText, partyWordFor(opts, scheds.length)).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
            dl.forEach((l) => { extra += Math.max(1, Math.ceil(TW(l, dz) / tw)) * LH(dz) + 420; });
            if (opts.declFoot.trim()) extra += LH(dz) + 420;
          }
          if (opts.sign) extra += 1300 + 300;
        }
        pageH = Math.max(11906, Math.min(PAGE_MAX_W, Math.round((top + area * 1.06 + extra + 500) / 10) * 10));
      }
      return { cols, total, pageW, pageH, theme: T, headRows: [hdr1, hdr2, hdr3], bodyRows, nLeft, blocks, showAbhi, border: opts.border, images };
    });
    return { header: st.header || {}, theme: THEMES[opts.design], chunks, rowCount: rows.length, schedCount: scheds.length, opts, partySign: opts.partySign, showPlace: opts.partySign || (opts.sign && cleanSign(opts.signLabels) !== ""), decl: opts.decl && (opts.declText.trim() || opts.declFoot.trim()) ? { lines: fillParty(opts.declText, partyWordFor(opts, scheds.length)).split(/\r?\n/).map((x) => x.trim()).filter(Boolean), foot: opts.declFoot.trim() } : null, signLabels: opts.sign ? cleanSign(opts.signLabels).split(/\n/).filter(Boolean).slice(0, 6) : [] };
  }

  /* ---------- पेज के ऊपर का शीर्षक-खंड (असली फॉर्म की तरह: दो box, भरी वैल्यू के नीचे रेखा) ---------- */
  // पेज जितना चौड़ा, अक्षर उतने बड़े (A3 = 1.0)
  function headerBlock(h, pageW, T) {
    T = T || THEMES.colorful;
    const k = Math.max(0.8, Math.min(1.45, pageW / 23814));
    const S = (v) => Math.round(v * k / 2) * 2;
    const NB = "\u00a0";
    const val = (key, min) => {
      const v = t(h[key]);
      if (!v) return { t: "………" + "…".repeat(Math.max(0, (min || 10) - 6)) };
      const pad = Math.max(2, Math.ceil(((min || 10) - v.length) / 2) + 1);
      return { t: NB.repeat(pad) + v + NB.repeat(pad), b: true, u: true };
    };
    const lab = (x) => ({ t: x });
    const paras = [
      { runs: [{ t: "पंचनामा बँटवारा ( Schedule )", b: true, c: T.title }], date: [lab("दिनांक : "), val("date", 12)].map((r) => Object.assign(r, { sz: S(22) })), sz: S(34), jc: "center", rule: T.rule },
      { runs: [lab("आपसी सहमति के आधार पर बँटवारा ( Partition ) का अनुसूचि प्रपत्र , ग्राम पंचायत राज "), val("panchayat", 22), lab(" , हल्का सांख्या "), val("halka", 8)], sz: S(24), jc: "center" },
      { runs: [{ t: "स्थल पर दखल-कब्जा एवं जमाबंदी रकवा से मिलान कर खतियानी रकवा का जमाबंदी बँटवारा", b: true }], sz: S(22), jc: "center" }
    ];
    const r = [];
    r.push(lab("राजस्व ग्राम "), val("mauja", 16), lab(" , थाना सांख्या "), val("thana_no", 8), lab(" , अंचल "), val("anchal", 14),
      lab(" , पुलिस थाना "), val("police_thana", 14), lab(" , अनुमण्डल "), val("anumandal", 16), lab(" , राजस्व थाना "), val("rajasva_thana", 16), lab(" , जिला "), val("jila", 14));
    return { paras, info: { runs: r, sz: S(21) }, T };
  }

  /* ---------- DOCX renderer ---------- */
  const FONT = '<w:rFonts w:ascii="Mangal" w:hAnsi="Mangal" w:cs="Mangal" w:hint="cs"/>';
  function run(text, sz, bold, u, color) {
    return "<w:r><w:rPr>" + FONT + (bold ? "<w:b/><w:bCs/>" : "") + (color ? '<w:color w:val="' + color + '"/>' : "") +
      '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>' + (u ? '<w:u w:val="dotted"/>' : "") + '<w:lang w:bidi="hi-IN"/></w:rPr>' + (text === "\t" ? "<w:tab/>" : '<w:t xml:space="preserve">' + esc(text) + "</w:t>") + "</w:r>";
  }
  function para(text, sz, jc, bold, extra, color) {
    return '<w:p><w:pPr>' + (extra || "") + '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="' + jc + '"/></w:pPr>' + (text === "" ? "" : run(text, sz, bold, false, color)) + "</w:p>";
  }
  function paraRuns(runs, sz, jc, extra, before, after) {
    return '<w:p><w:pPr>' + (extra || "") + '<w:spacing w:before="' + (before || 0) + '" w:after="' + (after || 0) + '" w:line="240" w:lineRule="auto"/><w:jc w:val="' + jc + '"/></w:pPr>' +
      runs.map((r) => run(r.t, r.sz || sz, r.b, r.u, r.c)).join("") + "</w:p>";
  }
  const sectPr = (c, ftr) => '<w:sectPr>' + (ftr ? '<w:footerReference w:type="default" r:id="rIdBatwFooter"/>' : "") + '<w:pgSz w:w="' + c.pageW + '" w:h="' + c.pageH + '" w:orient="landscape"/>' +
    '<w:pgMar w:top="800" w:right="' + MARGIN + '" w:bottom="800" w:left="' + MARGIN + '" w:header="360" w:footer="440" w:gutter="0"/>' +
    (c.border ? '<w:pgBorders w:offsetFrom="page">' + ["top", "left", "bottom", "right"].map((d) => "<w:" + d + ' w:val="single" w:sz="12" w:space="16" w:color="000000"/>').join("") + "</w:pgBorders>" : "") + "</w:sectPr>";

  // स्थान — सबसे नीचे (हस्ताक्षरों के बाद)
  function docxPlace() { return paraRuns([{ t: "स्थान : ……………………………" }], 20, "left", "", 300, 0); }
  // हर अनुसूचि के अपने कॉलम के ठीक नीचे उसी पक्षकार का हस्ताक्षर
  function docxPartySign(ch) {
    const wAt = (from, span) => ch.cols.slice(from, from + span).reduce((a, c) => a + c.w, 0);
    const cell = (w, span, name) => '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : "") +
      '<w:tcMar><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar><w:vAlign w:val="bottom"/></w:tcPr>' +
      (name == null ? para("", 18, "center") :
        para("", 20, "center", false, "<w:keepNext/>") +
        paraRuns([{ t: "हस्ताक्षर / अँगूठा निशान", b: true }], 18, "center", '<w:keepNext/><w:pBdr><w:top w:val="single" w:sz="8" w:space="4" w:color="000000"/></w:pBdr>', 0, 0) +
        (name ? paraRuns([{ t: "( " + name + " )" }], 17, "center", "", 20, 0) : "")) + "</w:tc>";
    let cells = cell(wAt(0, ch.nLeft), ch.nLeft, null);
    ch.blocks.forEach((b) => { cells += cell(wAt(b.start, b.span), b.span, b.sc.name || ("अनुसूचि " + b.sc.no)); });
    if (ch.showAbhi) cells += cell(ch.cols[ch.cols.length - 1].w, 1, null);
    return '<w:tbl><w:tblPr><w:tblW w:w="' + ch.total + '" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>' +
      ch.cols.map((c) => '<w:gridCol w:w="' + c.w + '"/>').join("") + '</w:tblGrid><w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="1250" w:hRule="atLeast"/></w:trPr>' + cells + "</w:tr></w:tbl>" + para("", 10, "left");
  }
  // गवाह आदि के हस्ताक्षर (वैकल्पिक, अंतिम पेज)
  function docxSign(labels, total) {
    if (!labels.length) return "";
    const n = labels.length, w = Math.floor(total / n);
    const cells = labels.map((_, i) => '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/><w:tcMar><w:left w:w="260" w:type="dxa"/><w:right w:w="260" w:type="dxa"/></w:tcMar><w:vAlign w:val="bottom"/></w:tcPr>' +
      para("", 20, "center", false, "<w:keepNext/>") +
      paraRuns([{ t: labels[i], b: true }], 18, "center", '<w:pBdr><w:top w:val="single" w:sz="8" w:space="4" w:color="000000"/></w:pBdr>', 0, 0) + "</w:tc>").join("");
    return '<w:tbl><w:tblPr><w:tblW w:w="' + (w * n) + '" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>' +
      labels.map(() => '<w:gridCol w:w="' + w + '"/>').join("") + '</w:tblGrid><w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="1300" w:hRule="atLeast"/></w:trPr>' + cells + "</w:tr></w:tbl>" + para("", 10, "left");
  }
  function declSize(pageW) { const k = Math.max(0.8, Math.min(1.45, pageW / 23814)); return Math.round(22 * k / 2) * 2; }
  function docxDecl(d, pageW) {
    if (!d) return "";
    const sz = declSize(pageW);
    const ps = d.lines.map((l, i) => paraRuns([{ t: l }], sz, "both", "<w:keepLines/>" + (i === d.lines.length - 1 && d.foot ? "<w:keepNext/>" : ""), i === 0 ? 300 : 120, 0)).join("");
    const foot = d.foot ? paraRuns([{ t: d.foot + "  ", b: true }, { t: "………………………………………" }], sz, "right", "", 420, 0) : "";
    return ps + foot;
  }
  function footerXml() {
    const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
    const r = (x, b) => '<w:r><w:rPr>' + FONT + (b ? "<w:b/>" : "") + '<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>' + x + "</w:r>";
    const fld = (code) => '<w:r><w:rPr>' + FONT + '<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr>' + FONT + '<w:sz w:val="20"/></w:rPr><w:instrText xml:space="preserve"> ' + code + ' </w:instrText></w:r><w:r><w:rPr>' + FONT + '<w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>' + r("<w:t>1</w:t>", true) + '<w:r><w:rPr>' + FONT + '<w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>';
    return H + '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>' +
      r('<w:t xml:space="preserve">पृष्ठ </w:t>') + fld("PAGE") + r('<w:t xml:space="preserve"> / </w:t>') + fld("NUMPAGES") + "</w:p></w:ftr>";
  }

  function docxHeader(hb, total) {
    const T = hb.T;
    const bd = (n) => "<w:" + n + ' w:val="single" w:sz="10" w:space="0" w:color="' + T.boxBorder + '"/>';
    const tcw = '<w:tcW w:w="' + total + '" w:type="dxa"/>';
    const rule = T.rule ? '<w:pBdr><w:bottom w:val="single" w:sz="14" w:space="3" w:color="' + T.rule + '"/></w:pBdr>' : "";
    const ctr = Math.round((total - 216) / 2), rgt = total - 216;
    const tabs = '<w:tabs><w:tab w:val="center" w:pos="' + ctr + '"/><w:tab w:val="right" w:pos="' + rgt + '"/></w:tabs>';
    const ps = hb.paras.map((p, i) => p.date ?
      paraRuns([{ t: "\t" }].concat(p.runs, [{ t: "\t" }], p.date), p.sz, "left", (i === 0 ? rule : "") + tabs, i === 0 ? 0 : 50, 0) :
      paraRuns(p.runs, p.sz, p.jc, i === 0 ? rule : "", i === 0 ? 0 : 50, 0)).join("");
    return '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' +
      bd("top") + bd("left") + bd("bottom") + bd("right") + bd("insideH") +
      '</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="' + total + '"/></w:tblGrid>' +
      "<w:tr><w:tc><w:tcPr>" + tcw + '<w:shd w:val="clear" w:color="auto" w:fill="' + T.boxFill + '"/><w:tcMar><w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>' + ps + "</w:tc></w:tr>" +
      "<w:tr><w:tc><w:tcPr>" + tcw + '<w:shd w:val="clear" w:color="auto" w:fill="' + T.infoFill + '"/><w:tcMar><w:top w:w="110" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>' +
      paraRuns(hb.info.runs, hb.info.sz, "center") + "</w:tc></w:tr></w:tbl>" + para("", 10, "left");
  }

  function drawing(im) {
    const A = "http://schemas.openxmlformats.org/drawingml/2006/main", PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + im.cx + '" cy="' + im.cy + '"/><wp:docPr id="' + (100 + im.n) + '" name="अभियुक्ति ' + im.n + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="' + A + '" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="' + A + '"><a:graphicData uri="' + PIC + '">' +
      '<pic:pic xmlns:pic="' + PIC + '"><pic:nvPicPr><pic:cNvPr id="' + im.n + '" name="batimg' + im.n + '.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdBatImg' + im.n + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + im.cx + '" cy="' + im.cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  function docxCell(cell, w) {
    const sz = cell.sz || 18;
    let pr = '<w:tcW w:w="' + w + '" w:type="dxa"/>';
    if (cell.span > 1) pr += '<w:gridSpan w:val="' + cell.span + '"/>';
    if (cell.vm) pr += cell.vm === "restart" ? '<w:vMerge w:val="restart"/>' : "<w:vMerge/>";
    if (cell.shade) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + cell.shade + '"/>';
    pr += '<w:tcMar><w:top w:w="35" w:type="dxa"/><w:bottom w:w="35" w:type="dxa"/></w:tcMar>';
    pr += '<w:vAlign w:val="' + (cell.va || "center") + '"/>';
    const jc = cell.jc || "center";
    if (cell.img) return "<w:tc><w:tcPr>" + pr + "</w:tcPr>" + '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>' + drawing(cell.img) + "</w:p></w:tc>";
    const ps = cell.lines.length ? cell.lines.map((l, i) => para(l, sz, jc, cell.bold || (cell.boldFirst && i === 0), "", cell.color)).join("") : para("", sz, jc);
    return "<w:tc><w:tcPr>" + pr + "</w:tcPr>" + ps + "</w:tc>";
  }
  function docxTable(ch) {
    const wAt = (from, span) => ch.cols.slice(from, from + span).reduce((a, c) => a + c.w, 0);
    const rowXml = (cells, o) => {
      let pos = 0;
      const xml = cells.map((cell) => { const w = wAt(pos, cell.span); pos += cell.span; return docxCell(cell, w); }).join("");
      return "<w:tr><w:trPr><w:cantSplit/>" + (o.hdr ? "<w:tblHeader/>" : "") + (o.h ? '<w:trHeight w:val="' + o.h + '" w:hRule="atLeast"/>' : "") + "</w:trPr>" + xml + "</w:tr>";
    };
    const T = ch.theme;
    const bd = (n, sz, col) => "<w:" + n + ' w:val="single" w:sz="' + sz + '" w:space="0" w:color="' + (col || T.bColor) + '"/>';
    return '<w:tbl><w:tblPr><w:tblW w:w="' + ch.total + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' +
      bd("top", T.outer, T.oColor) + bd("left", T.outer, T.oColor) + bd("bottom", T.outer, T.oColor) + bd("right", T.outer, T.oColor) + bd("insideH", T.inner) + bd("insideV", T.inner) +
      '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      "<w:tblGrid>" + ch.cols.map((c) => '<w:gridCol w:w="' + c.w + '"/>').join("") + "</w:tblGrid>" +
      ch.headRows.map((r) => rowXml(r, { hdr: true })).join("") + ch.bodyRows.map((r) => rowXml(r, { h: 500 })).join("") + "</w:tbl>";
  }

  /* ---------- DOCX के अंदर पूरा डाटा छिपाकर रखना (ताकि बाद में वही DOCX खोलकर सब वैसा ही भर जाए) ---------- */
  const NS = "urn:batwara:panchnama:v1";
  const b64enc = (str) => typeof btoa === "function" ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, "utf8").toString("base64");
  const b64dec = (b64) => typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");

  async function embedState(zip, st) {
    const payload = b64enc(JSON.stringify({ v: 1, app: "batwara", state: st }));
    const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
    zip.file("customXml/item2.xml", H + '<batwara xmlns="' + NS + '"><state>' + payload + "</state></batwara>");
    zip.file("customXml/itemProps2.xml", H + '<ds:datastoreItem ds:itemID="{5C0E9B7A-3D41-4F6B-8A52-7E1B2C9D4F10}" xmlns:ds="http://schemas.openxmlformats.org/officeDocument/2006/customXml"><ds:schemaRefs><ds:schemaRef ds:uri="' + NS + '"/></ds:schemaRefs></ds:datastoreItem>');
    zip.file("customXml/_rels/item2.xml.rels", H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps" Target="itemProps2.xml"/></Relationships>');
    let rels = await zip.file("word/_rels/document.xml.rels").async("string");
    rels = rels.replace("</Relationships>", '<Relationship Id="rIdBatwara1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item2.xml"/></Relationships>');
    zip.file("word/_rels/document.xml.rels", rels);
    let ct = await zip.file("[Content_Types].xml").async("string");
    ct = ct.replace("</Types>", '<Override PartName="/customXml/itemProps2.xml" ContentType="application/vnd.openxmlformats-officedocument.customXmlProperties+xml"/></Types>');
    zip.file("[Content_Types].xml", ct);
  }

  // DOCX (ArrayBuffer / Blob / Buffer) से डाटा वापस निकालना; न मिले तो null
  async function extractState(JSZip, data) {
    const zip = await JSZip.loadAsync(data);
    const names = Object.keys(zip.files).filter((n) => /^customXml\/item\d+\.xml$/.test(n));
    for (const n of names) {
      const x = await zip.file(n).async("string");
      const m = x.indexOf(NS) >= 0 && x.match(/<state>([^<]+)<\/state>/);
      if (!m) continue;
      try { const o = JSON.parse(b64dec(m[1].trim())); if (o && o.app === "batwara" && o.state) return o.state; } catch (e) {}
    }
    return null;
  }

  async function build(JSZip, templateB64, st) {
    const L = layout(st);
    const zip = await JSZip.loadAsync(templateB64, { base64: true });
    let doc = await zip.file("word/document.xml").async("string");
    const bStart = doc.indexOf("<w:body>") + "<w:body>".length;
    const sectStart = doc.lastIndexOf("<w:sectPr");
    const ftr = L.opts.pageNo;
    // फोटो: हर चंक की फोटो को पूरे document में एक सीध में नंबर देना
    const allImgs = L.chunks[0].images;           // सभी पेज की फोटो एक ही सूची में (क्रम संख्या पहले से एक सीध में)
    const body = L.chunks.map((ch, i) => {
      const last = i === L.chunks.length - 1;
      return docxHeader(headerBlock(L.header, ch.pageW, ch.theme), ch.total) + docxTable(ch) +
        (L.partySign ? para("", 10, "left") + docxPartySign(ch) : "") +
        (last ? para("", 10, "left") + docxDecl(L.decl, ch.pageW) + docxSign(L.signLabels, ch.total) : "") +
        (L.showPlace ? docxPlace() : "") +
        (last ? "" : "<w:p><w:pPr>" + sectPr(ch, ftr) + "</w:pPr></w:p>");
    }).join("");
    doc = doc.slice(0, bStart) + body + sectPr(L.chunks[L.chunks.length - 1], ftr) + "</w:body></w:document>";
    if (allImgs.length) {
      let rl = await zip.file("word/_rels/document.xml.rels").async("string");
      allImgs.forEach((d, k) => {
        zip.file("word/media/batimg" + (k + 1) + ".jpg", d.replace(/^data:[^,]*,/, ""), { base64: true });
        rl = rl.replace("</Relationships>", '<Relationship Id="rIdBatImg' + (k + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/batimg' + (k + 1) + '.jpg"/></Relationships>');
      });
      zip.file("word/_rels/document.xml.rels", rl);
      let ct = await zip.file("[Content_Types].xml").async("string");
      if (!/Extension="jpg"/i.test(ct)) zip.file("[Content_Types].xml", ct.replace("<Override", '<Default Extension="jpg" ContentType="image/jpeg"/><Override'));
    }
    if (ftr) {
      zip.file("word/footer1.xml", footerXml());
      let rl = await zip.file("word/_rels/document.xml.rels").async("string");
      zip.file("word/_rels/document.xml.rels", rl.replace("</Relationships>", '<Relationship Id="rIdBatwFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'));
      let ct = await zip.file("[Content_Types].xml").async("string");
      zip.file("[Content_Types].xml", ct.replace("</Types>", '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'));
    }
    zip.file("word/document.xml", doc);
    await embedState(zip, st);
    return { zip, pageCount: L.chunks.length, rowCount: L.rowCount, schedCount: L.schedCount };
  }

  /* ---------- HTML preview ---------- */
  function previewHtml(st, popts) {
    const print = !!(popts && popts.print);
    const L = layout(st);
    const cellHtml = (tag, cell, rs) => "<" + tag + (cell.span > 1 ? ' colspan="' + cell.span + '"' : "") + (rs > 1 ? ' rowspan="' + rs + '"' : "") +
      ' class="' + (cell.jc === "left" ? "l " : "") + (cell.va === "top" ? "t" : "") + '" style="font-size:' + ((cell.sz || 18) / 2) + "pt" + (cell.shade ? ";background:#" + cell.shade : "") + (cell.color && cell.color !== "000000" ? ";color:#" + cell.color : "") + (cell.bold ? ";font-weight:700" : "") + '">' +
      (cell.img ? '<img class="pv-img" src="' + cell.img.d + '" style="width:' + Math.round(cell.img.wTw / 15) + "px;height:" + Math.round(cell.img.hTw / 15) + 'px">' : cell.lines.map((l, i) => (cell.boldFirst && i === 0 ? "<b>" + esc(l) + "</b>" : esc(l))).join("<br>")) + "</" + tag + ">";
    const runsHtml = (runs) => runs.map((r) => { let x = esc(r.t).replace(/\u00a0/g, "&nbsp;"); if (r.b) x = "<b>" + x + "</b>"; if (r.c && r.c !== "000000") x = '<span style="color:#' + r.c + '">' + x + "</span>"; if (r.u) x = '<span class="pv-u">' + x + "</span>"; return x; }).join("");
    const paraHtml = (p) => {
      const st = "font-size:" + (p.sz / 2) + "pt" + (p.rule ? ";border-bottom:2px solid #" + p.rule + ";padding-bottom:3px" : "");
      if (p.date) return '<div class="pv-titlerow" style="' + st + '"><span class="pv-tl"></span><span class="pv-tc">' + runsHtml(p.runs) + '</span><span class="pv-tr" style="font-size:' + ((p.date[0].sz || p.sz) / 2) + 'pt">' + runsHtml(p.date) + "</span></div>";
      return '<div style="text-align:' + p.jc + ";" + st + '">' + runsHtml(p.runs) + "</div>";
    };
    const partyHtml = (ch, cg) => {
      const w = (from, span) => ch.cols.slice(from, from + span).reduce((a, c) => a + c.w, 0);
      let tds = ch.nLeft ? '<td colspan="' + ch.nLeft + '"></td>' : "";
      ch.blocks.forEach((b) => { tds += '<td colspan="' + b.span + '" class="pv-pcell"><div class="pv-pline">हस्ताक्षर / अँगूठा निशान</div><div class="pv-pname">( ' + esc(b.sc.name || ("अनुसूचि " + b.sc.no)) + " )</div></td>"; });
      if (ch.showAbhi) tds += "<td></td>";
      return '<table class="pv-ps" style="width:' + Math.round(ch.total / 15) + 'px">' + cg + "<tr>" + tds + "</tr></table>";
    };
    return L.chunks.map((ch, ci) => {
      const hb = headerBlock(L.header, ch.pageW, ch.theme), T = ch.theme;
      const cg = "<colgroup>" + ch.cols.map((c) => '<col style="width:' + (c.w / 15).toFixed(1) + 'px">').join("") + "</colgroup>";
      const head = ch.headRows.map((cells) => "<tr>" + cells.map((cell) => cell.vm === "cont" ? "" : cellHtml("th", cell, cell.head)).join("") + "</tr>").join("");
      const bodyRows = ch.bodyRows.map((cells, ri) => "<tr>" + cells.map((cell, k) => {
        if (cell.vm === "cont") return "";
        let rs = 1;
        if (cell.vm === "restart") { for (let j = ri + 1; j < ch.bodyRows.length && ch.bodyRows[j][k].vm === "cont"; j++) rs++; }
        return cellHtml("td", cell, rs);
      }).join("") + "</tr>").join("");
      const pw = Math.round(ch.total / 15);
      const declHtml = (L.decl)
        ? '<div class="pv-decl" style="font-size:' + (declSize(ch.pageW) / 2) + 'pt">' + L.decl.lines.map((l) => "<p>" + esc(l) + "</p>").join("") + (L.decl.foot ? '<div class="pv-declfoot"><b>' + esc(L.decl.foot) + "</b>&nbsp;&nbsp;………………………………………</div>" : "") + "</div>" : "";
      const lastCh = ci === L.chunks.length - 1;
      const signHtml = (L.partySign ? partyHtml(ch, cg) : "") + (lastCh ? declHtml : "") +
        ((lastCh && L.signLabels.length) ? '<div class="pv-sign" style="width:' + pw + 'px">' + L.signLabels.map((l) => "<div><span>" + esc(l) + "</span></div>").join("") + "</div>" : "") +
        (L.showPlace ? '<div class="pv-place">स्थान : ……………………………</div>' : "");
      const footHtml = L.opts.pageNo ? '<div class="pv-foot">पृष्ठ ' + (ci + 1) + " / " + L.chunks.length + "</div>" : "";
      const bw = L.opts.border ? ["<div class=\"pv-border\" style=\"width:" + (pw + 16) + "px\">", "</div>"] : ["", ""];
      if (print) return '<section class="pv-print pg' + ci + '">' + bw[0] + '<div class="pv-sheet" style="width:' + pw + 'px">' +
        '<div class="pv-head"><div class="pv-box" style="border-color:#' + T.boxBorder + ';background:#' + T.boxFill + '">' + hb.paras.map(paraHtml).join("") + "</div>" +
        '<div class="pv-info" style="border-color:#' + T.boxBorder + ';background:#' + T.infoFill + ';font-size:' + (hb.info.sz / 2) + 'pt">' + runsHtml(hb.info.runs) + "</div></div>" +
        '<table class="pv" style="width:' + pw + 'px;--bc:#' + T.bColor + ';--oc:#' + T.oColor + '">' + cg + "<thead>" + head + "</thead><tbody>" + bodyRows + "</tbody></table>" + signHtml + "</div>" + bw[1] + "</section>";
      return '<div class="pv-page"><div class="pv-bar"><span class="pv-cap">पेज ' + (ci + 1) + " / " + L.chunks.length + " · " + ch.cols.length + ' कॉलम</span>' +
        '<button type="button" class="btn ghost sm" data-act="pvToggle">पूरा आकार / स्क्रीन में फिट</button></div>' +
        '<div class="pv-scroll" data-pw="' + (pw + (L.opts.border ? 16 : 0)) + '"><div class="pv-zoom">' + bw[0] + '<div class="pv-sheet" style="width:' + pw + 'px">' +
        '<div class="pv-head">' + '<div class="pv-box" style="border-color:#' + T.boxBorder + ';background:#' + T.boxFill + '">' + hb.paras.map(paraHtml).join("") + "</div>" +
        '<div class="pv-info" style="border-color:#' + T.boxBorder + ';background:#' + T.infoFill + ';font-size:' + (hb.info.sz / 2) + 'pt">' + runsHtml(hb.info.runs) + "</div></div>" +
        '<table class="pv" style="width:' + pw + 'px;--bc:#' + T.bColor + ';--oc:#' + T.oColor + '">' + cg + "<thead>" + head + "</thead><tbody>" + bodyRows + "</tbody></table>" + signHtml + footHtml + "</div>" + bw[1] + "</div></div></div>";
    }).join("");
  }

  // PDF / प्रिंट: हर पेज का अपना @page साइज़ (named pages) + पृष्ठ संख्या
  function printHtml(st) {
    const L = layout(st);
    const mm = (tw) => (tw / 1440 * 25.4).toFixed(1) + "mm";
    const foot = L.opts.pageNo ? ' @bottom-center { content: "पृष्ठ " counter(page) " / " counter(pages); font: 10pt Mangal, "Nirmala UI", "Noto Sans Devanagari", sans-serif; }' : "";
    const css = L.chunks.map((ch, i) => "@page pg" + i + " { size: " + mm(ch.pageW) + " " + mm(ch.pageH) + "; margin: 12mm 6mm 14mm 6mm;" + foot + " } .pv-print.pg" + i + " { page: pg" + i + "; }").join("\n");
    return { html: previewHtml(st, { print: true }), css };
  }

  root.BatwaraDocx = { build, layout, previewHtml, printHtml, extractState, partyWordFor, fillParty, themes: THEMES };
  if (typeof module !== "undefined" && module.exports) module.exports = root.BatwaraDocx;

})(typeof window !== "undefined" ? window : globalThis);

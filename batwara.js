/* ==========================================================
   बँटवारा पंचनामा (Schedule) DOCX बनाने वाला module  — v3
   - असली Word table बनाता है (fixed template-shapes नहीं)
   - पंक्तियाँ = जितनी entry भरी गई, उतनी ही
   - अनुसूचि कॉलम = जितनी अनुसूचि बनाई, उतने ही (एक पेज पर अधिकतम 3, ज़्यादा हों तो अगला पेज)
   - जो कॉलम पूरी तरह खाली है वो दिखता ही नहीं
   - रैयत का नाम / पिता / पता हर रैयत का एक ही बार (उसकी सारी पंक्तियों में merge)
   - Browser (JSZip global) और Node दोनों में चलता है
   ========================================================== */
(function (root) {

  const MAX_SCHED_PER_PAGE = 3;
  const USABLE = 22374;           // A3 landscape, 720 margins (twips)
  const MAX_SCALE = 2.5;
  const BLOCK_MIN = 3800;         // अनुसूचि के header में नाम समाने भर की न्यूनतम चौड़ाई

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (v) => String(v == null ? "" : v).trim();

  /* ---------- रकवा ---------- */
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

  /* ---------- XML helpers ---------- */
  function run(text, sz, bold) {
    return '<w:r><w:rPr><w:rFonts w:hint="cs"/>' + (bold ? "<w:b/><w:bCs/>" : "") +
      '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/><w:lang w:bidi="hi-IN"/></w:rPr>' +
      '<w:t xml:space="preserve">' + esc(text) + "</w:t></w:r>";
  }
  function para(text, sz, jc, bold) {
    return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="' + jc + '"/></w:pPr>' +
      (text === "" ? "" : run(text, sz, bold)) + "</w:p>";
  }
  function tc(w, lines, o) {
    o = o || {};
    const sz = o.sz || 18, jc = o.jc || "center";
    let pr = '<w:tcW w:w="' + w + '" w:type="dxa"/>';
    if (o.span > 1) pr += '<w:gridSpan w:val="' + o.span + '"/>';
    if (o.vm) pr += o.vm === "restart" ? '<w:vMerge w:val="restart"/>' : "<w:vMerge/>";
    if (o.shade) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shade + '"/>';
    pr += '<w:vAlign w:val="' + (o.va || "center") + '"/>';
    const ps = (lines && lines.length) ? lines.map((l) => para(l, sz, jc, o.bold)).join("") : para("", sz, jc);
    return "<w:tc><w:tcPr>" + pr + "</w:tcPr>" + ps + "</w:tc>";
  }
  function tr(cells, o) {
    o = o || {};
    return "<w:tr><w:trPr><w:cantSplit/>" + (o.hdr ? "<w:tblHeader/>" : "") +
      (o.h ? '<w:trHeight w:val="' + o.h + '" w:hRule="atLeast"/>' : "") + "</w:trPr>" + cells.join("") + "</w:tr>";
  }

  /* ---------- state -> flat rows ---------- */
  function plotHasData(p) {
    const f = ["jamabandi", "khata", "khesra", "k_ac", "k_dc", "n_ac", "n_dc", "abhiyukti"];
    return f.some((k) => t(p[k])) ||
      (p.sch || []).some((s) => Object.keys(s).some((k) => t(s[k])));
  }
  function flatten(st, schedCount) {
    const rows = [];
    (st.groups || []).forEach((g, gi) => {
      const plots = (g.plots || []).filter(plotHasData);
      const nameLines = [];
      if (t(g.name)) nameLines.push(t(g.name));
      if (t(g.rel_naam)) nameLines.push((t(g.rel_type) || "पिता") + "- " + t(g.rel_naam));
      if (t(g.addr)) nameLines.push(t(g.addr));
      plots.forEach((p, pi) => {
        rows.push({
          gi, first: pi === 0, nameLines,
          jamabandi: t(p.jamabandi), khata: t(p.khata), khesra: t(p.khesra),
          k: rk(p.k_ac, p.k_dc), n: rk(p.n_ac, p.n_dc), abhiyukti: t(p.abhiyukti),
          sch: Array.from({ length: schedCount }, (_, s) => {
            const x = (p.sch && p.sch[s]) || {};
            return { khata: t(x.khata), khesra: t(x.khesra), k: rk(x.k_ac, x.k_dc), n: rk(x.n_ac, x.n_dc), min_janib: t(x.min_janib), ch: chauLines(x) };
          })
        });
      });
    });
    return rows;
  }

  /* ---------- एक chunk (कुछ अनुसूचियाँ) का table ---------- */
  const W = { name: 2600, jam: 800, khata: 800, khesra: 800, k: 950, n: 950,
              s_khata: 750, s_khesra: 750, s_k: 950, s_n: 950, s_min: 1000, s_ch: 1700, abhi: 1300 };

  function buildTable(rows, schedChunk, showLeft, showSched, showAbhi) {
    // columns: [{key,label,w,get,merge?,sz,jc}]
    const cols = [];
    cols.push({ id: "name", label: ["खतियानी रैयत का नाम व पता"], w: W.name, left: true });
    if (showLeft.jam) cols.push({ id: "jam", label: ["जमाबंदी", "सांख्या"], w: W.jam, left: true });
    if (showLeft.khata) cols.push({ id: "khata", label: ["खाता", "सांख्या"], w: W.khata, left: true });
    if (showLeft.khesra) cols.push({ id: "khesra", label: ["खेसरा", "सांख्या"], w: W.khesra, left: true });
    if (showLeft.k) cols.push({ id: "k", label: ["खतियानी रकवा", "(ए० डी०)"], w: W.k, left: true });
    if (showLeft.n) cols.push({ id: "n", label: ["नक्शा रकवा", "(ए० डी०)"], w: W.n, left: true });
    const nLeft = cols.length;
    const blocks = [];
    schedChunk.forEach((sc) => {
      const sh = showSched[sc.idx], start = cols.length;
      if (sh.khata) cols.push({ id: "s_khata", s: sc.idx, label: ["खाता", "सांख्या"], w: W.s_khata });
      if (sh.khesra) cols.push({ id: "s_khesra", s: sc.idx, label: ["खेसरा", "सांख्या"], w: W.s_khesra });
      if (sh.k) cols.push({ id: "s_k", s: sc.idx, label: ["खतियानी रकवा", "(ए० डी०)"], w: W.s_k });
      if (sh.n) cols.push({ id: "s_n", s: sc.idx, label: ["नक्शा रकवा", "(ए० डी०)"], w: W.s_n });
      if (sh.min) cols.push({ id: "s_min", s: sc.idx, label: ["मिन जानिब"], w: W.s_min });
      if (sh.ch) cols.push({ id: "s_ch", s: sc.idx, label: ["चौहद्दी"], w: W.s_ch, jc: "left" });
      blocks.push({ sc, span: cols.length - start });
    });
    if (showAbhi) cols.push({ id: "abhi", label: ["अभियुक्ति"], w: W.abhi });

    const natural = cols.reduce((a, c) => a + c.w, 0);
    const scale = Math.min(MAX_SCALE, USABLE / natural);
    cols.forEach((c) => { c.w = Math.round(c.w * scale); });
    // हर अनुसूचि-block कम से कम BLOCK_MIN चौड़ा, फिर पूरे table को पेज में समेटना
    let p0 = nLeft;
    blocks.forEach((b) => {
      const sl = cols.slice(p0, p0 + b.span), sum = sl.reduce((a, c) => a + c.w, 0);
      if (sum < BLOCK_MIN) sl.forEach((c) => { c.w = Math.round(c.w * BLOCK_MIN / sum); });
      p0 += b.span;
    });
    const raw = cols.reduce((a, c) => a + c.w, 0);
    if (raw > USABLE) cols.forEach((c) => { c.w = Math.floor(c.w * USABLE / raw); });
    const total = cols.reduce((a, c) => a + c.w, 0);

    const grid = "<w:tblGrid>" + cols.map((c) => '<w:gridCol w:w="' + c.w + '"/>').join("") + "</w:tblGrid>";
    const wsum = (a, b) => cols.slice(a, b).reduce((x, c) => x + c.w, 0);

    // header row 1 (group titles)
    const h1 = [tc(wsum(0, nLeft), ["मोताविक जमाबंदी एवं मोताविक खतियान"], { span: nLeft, sz: 18, bold: true, shade: "F2F2F2" })];
    let pos = nLeft;
    blocks.forEach((b) => {
      h1.push(tc(wsum(pos, pos + b.span), ["अनुसूचि ( Schedule ) सांख्या " + b.sc.no + " बनाम् " + b.sc.name], { span: b.span, sz: 18, bold: true, shade: "F2F2F2" }));
      pos += b.span;
    });
    if (showAbhi) h1.push(tc(cols[cols.length - 1].w, ["अभियुक्ति"], { sz: 18, bold: true, shade: "F2F2F2", vm: "restart" }));
    // header row 2 (labels)
    const h2 = cols.map((c) => c.id === "abhi" ? tc(c.w, [], { vm: "cont" }) : tc(c.w, c.label, { sz: 16, bold: true }));
    // header row 3 (numbers)
    const h3 = cols.map((c, i) => c.id === "abhi" ? tc(c.w, [], { vm: "cont" }) : tc(c.w, [String(i + 1)], { sz: 15 }));

    const out = [tr(h1, { hdr: true }), tr(h2, { hdr: true }), tr(h3, { hdr: true })];

    // data rows with vertical merge on left columns
    const groupEnd = {};  // gi -> last row index
    rows.forEach((r, i) => { groupEnd[r.gi] = i; });
    const vm = (rows, i, key, byGroup) => {
      // returns "restart" | "cont" | null for a merged cell
      const r = rows[i], prev = rows[i - 1], next = rows[i + 1];
      const same = (a, b) => a && b && a.gi === r.gi && (byGroup || (a[key] !== "" && a[key] === r[key] && b[key] === r[key]));
      const contPrev = prev && prev.gi === r.gi && (byGroup || (r[key] !== "" && prev[key] === r[key]));
      const contNext = next && next.gi === r.gi && (byGroup || (r[key] !== "" && next[key] === r[key]));
      if (contPrev) return "cont";
      if (contNext) return "restart";
      return null;
    };
    rows.forEach((r, i) => {
      const cells = cols.map((c) => {
        switch (c.id) {
          case "name": { const m = vm(rows, i, "name", true); return tc(c.w, m === "cont" ? [] : r.nameLines, { jc: "left", va: "top", sz: r.nameLines.join("").length > 70 ? 15 : 17, vm: m }); }
          case "jam": { const m = vm(rows, i, "jamabandi"); return tc(c.w, m === "cont" ? [] : one(r.jamabandi), { vm: m }); }
          case "khata": { const m = vm(rows, i, "khata"); return tc(c.w, m === "cont" ? [] : one(r.khata), { vm: m }); }
          case "khesra": return tc(c.w, one(r.khesra), {});
          case "k": return tc(c.w, one(r.k), {});
          case "n": return tc(c.w, one(r.n), {});
          case "s_khata": return tc(c.w, one(r.sch[c.s].khata), {});
          case "s_khesra": return tc(c.w, one(r.sch[c.s].khesra), {});
          case "s_k": return tc(c.w, one(r.sch[c.s].k), {});
          case "s_n": return tc(c.w, one(r.sch[c.s].n), {});
          case "s_min": return tc(c.w, one(r.sch[c.s].min_janib), { sz: 16 });
          case "s_ch": return tc(c.w, r.sch[c.s].ch, { sz: 15, jc: "left" });
          case "abhi": return tc(c.w, one(r.abhiyukti), { sz: 16 });
        }
        return tc(c.w, [], {});
      });
      out.push(tr(cells, { h: 560 }));
    });

    return '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/><w:jc w:val="center"/>' +
      '<w:tblBorders>' + ["top", "left", "bottom", "right", "insideH", "insideV"].map((b) => '<w:' + b + ' w:val="single" w:sz="6" w:space="0" w:color="000000"/>').join("") + "</w:tblBorders>" +
      '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      grid + out.join("") + "</w:tbl>";
  }

  /* ---------- पेज के ऊपर की पंक्तियाँ ---------- */
  function headerParas(h) {
    const g = (k) => t(h[k]) || "………………";
    return para("पंचनामा बँटवारा ( Schedule )", 26, "center", true) +
      para("आपसी सहमति के आधार पर बँटवारा ( Partition ) का अनुसूचि प्रपत्र , ग्राम पंचायत राज " + g("panchayat") + " , हल्का सांख्या " + g("halka"), 22, "center") +
      para("स्थल पर दखल-कब्जा एवं जमाबंदी रकवा से मिलान कर खतियानी रकवा का जमाबंदी बँटवारा", 22, "center") +
      para("राजस्व ग्राम " + g("mauja") + " , थाना सांख्या " + g("thana_no") + " , अंचल " + g("anchal") + " , पुलिस थाना " + g("police_thana") +
        " , अनुमण्डल " + g("anumandal") + " , राजस्व थाना " + g("rajasva_thana") + " , जिला " + g("jila"), 20, "left") +
      para("", 10, "left");
  }

  /* ---------- अनुसूचियों को बराबर हिस्सों में बाँटना (अधिकतम 3) ---------- */
  function splitEven(arr, max) {
    const pages = Math.ceil(arr.length / max), out = [];
    let i = 0;
    for (let p = 0; p < pages; p++) {
      const size = Math.ceil((arr.length - i) / (pages - p));
      out.push(arr.slice(i, i + size)); i += size;
    }
    return out;
  }

  /* ---------- main ---------- */
  async function build(JSZip, templateB64, st) {
    const zip = await JSZip.loadAsync(templateB64, { base64: true });
    let doc = await zip.file("word/document.xml").async("string");
    const bStart = doc.indexOf("<w:body>") + "<w:body>".length;
    const sectStart = doc.lastIndexOf("<w:sectPr");

    const scheds = (st.schedules || []).map((s, i) => ({ idx: i, no: i + 1, name: t(s.name) }));
    if (!scheds.length) throw new Error("कम से कम एक अनुसूचि चाहिए।");
    const rows = flatten(st, scheds.length);
    if (!rows.length) throw new Error("कम से कम एक पंक्ति में डाटा भरें।");

    // कौन-से कॉलम खाली हैं (पूरे डाटा में) — वही छुपाने हैं
    const any = (f) => rows.some((r) => f(r));
    const showLeft = {
      jam: any((r) => r.jamabandi), khata: any((r) => r.khata), khesra: any((r) => r.khesra),
      k: any((r) => r.k), n: any((r) => r.n)
    };
    if (!showLeft.khesra && !showLeft.k && !showLeft.n && !showLeft.jam && !showLeft.khata) showLeft.khesra = true;
    const showSched = scheds.map((sc) => {
      const f = {
        khata: any((r) => r.sch[sc.idx].khata), khesra: any((r) => r.sch[sc.idx].khesra),
        k: any((r) => r.sch[sc.idx].k), n: any((r) => r.sch[sc.idx].n),
        min: any((r) => r.sch[sc.idx].min_janib), ch: any((r) => r.sch[sc.idx].ch.length)
      };
      if (!Object.values(f).some(Boolean)) f.khesra = true;   // पूरी तरह खाली अनुसूचि में भी कम से कम एक कॉलम
      return f;
    });
    const showAbhi = any((r) => r.abhiyukti);

    const chunks = splitEven(scheds, MAX_SCHED_PER_PAGE);
    const body = chunks.map((ch, i) =>
      headerParas(st.header || {}) + buildTable(rows, ch, showLeft, showSched, showAbhi) +
      (i < chunks.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : para("", 10, "left"))
    ).join("");

    doc = doc.slice(0, bStart) + body + doc.slice(sectStart);
    zip.file("word/document.xml", doc);
    return { zip, pageCount: chunks.length, rowCount: rows.length, schedCount: scheds.length };
  }

  root.BatwaraDocx = { build };
  if (typeof module !== "undefined" && module.exports) module.exports = root.BatwaraDocx;

})(typeof window !== "undefined" ? window : globalThis);

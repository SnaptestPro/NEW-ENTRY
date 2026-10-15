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
  const MARGIN = 360;                 // बाएँ/दाएँ margin (twips)
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
    return ["jamabandi", "khata", "khesra", "k_ac", "k_dc", "n_ac", "n_dc", "abhiyukti"].some((k) => t(p[k])) ||
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
          k: rk(p.k_ac, p.k_dc), n: rk(p.n_ac, p.n_dc), abhiyukti: t(p.abhiyukti),
          sch: Array.from({ length: n }, (_, s) => {
            const x = (p.sch && p.sch[s]) || {};
            return { khata: t(x.khata), khesra: t(x.khesra), k: rk(x.k_ac, x.k_dc), n: rk(x.n_ac, x.n_dc), min_janib: t(x.min_janib), ch: chauLines(x) };
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
  const W = { name: 2400, jam: 650, khata: 650, khesra: 650, k: 750, n: 750,
              s_khata: 600, s_khesra: 600, s_k: 750, s_n: 750, s_min: 750, s_ch: 1350, abhi: 1000 };

  function layout(st) {
    const scheds = (st.schedules || []).map((s, i) => ({ idx: i, no: i + 1, name: t(s.name) }));
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
    const showAbhi = any((r) => r.abhiyukti);

    const chunks = splitEven(scheds, MAX_SCHED_PER_PAGE).map((schedChunk) => {
      const cols = [];
      cols.push({ id: "name", label: ["खतियानी रैयत का नाम व पता"], w: W.name });
      if (showLeft.jam) cols.push({ id: "jam", label: ["जमाबंदी", "सांख्या"], w: W.jam });
      if (showLeft.khata) cols.push({ id: "khata", label: ["खाता", "सांख्या"], w: W.khata });
      if (showLeft.khesra) cols.push({ id: "khesra", label: ["खेसरा", "सांख्या"], w: W.khesra });
      if (showLeft.k) cols.push({ id: "k", label: ["खतियानी रकवा", "(ए० डी०)"], w: W.k });
      if (showLeft.n) cols.push({ id: "n", label: ["नक्शा रकवा", "(ए० डी०)"], w: W.n });
      const nLeft = cols.length, blocks = [];
      schedChunk.forEach((sc) => {
        const sh = showSched[sc.idx], start = cols.length;
        if (sh.khata) cols.push({ id: "s_khata", s: sc.idx, label: ["खाता", "सांख्या"], w: W.s_khata });
        if (sh.khesra) cols.push({ id: "s_khesra", s: sc.idx, label: ["खेसरा", "सांख्या"], w: W.s_khesra });
        if (sh.k) cols.push({ id: "s_k", s: sc.idx, label: ["खतियानी रकवा", "(ए० डी०)"], w: W.s_k });
        if (sh.n) cols.push({ id: "s_n", s: sc.idx, label: ["नक्शा रकवा", "(ए० डी०)"], w: W.s_n });
        if (sh.min) cols.push({ id: "s_min", s: sc.idx, label: ["मिन जानिब"], w: W.s_min });
        if (sh.ch) cols.push({ id: "s_ch", s: sc.idx, label: ["चौहद्दी"], w: W.s_ch, jc: "left" });
        blocks.push({ sc, start, span: cols.length - start });
      });
      if (showAbhi) cols.push({ id: "abhi", label: ["अभियुक्ति"], w: W.abhi });

      // पेज की चौड़ाई: कॉलम जितने, पेज उतना (A4 landscape से 22 इंच तक)
      const natural = cols.reduce((a, c) => a + c.w, 0);
      const pageW = Math.max(PAGE_MIN_W, Math.min(PAGE_MAX_W, natural + 2 * MARGIN));
      const usable = pageW - 2 * MARGIN;
      const scale = Math.min(MAX_SCALE, usable / natural);
      cols.forEach((c) => { c.w = Math.round(c.w * scale); });
      blocks.forEach((b) => {
        const sl = cols.slice(b.start, b.start + b.span), sum = sl.reduce((a, c) => a + c.w, 0);
        if (sum < BLOCK_MIN) sl.forEach((c) => { c.w = Math.round(c.w * BLOCK_MIN / sum); });
      });
      const raw = cols.reduce((a, c) => a + c.w, 0);
      if (raw > usable) cols.forEach((c) => { c.w = Math.floor(c.w * usable / raw); });
      const total = cols.reduce((a, c) => a + c.w, 0);
      const pageH = Math.max(11906, Math.min(PAGE_MAX_W, Math.round(pageW * 0.7071)));
      // कॉलम ज़्यादा हों तो अक्षर थोड़े छोटे
      const dsz = cols.length > 30 ? 3 : cols.length > 22 ? 2 : 0;

      const hdr1 = [{ span: nLeft, lines: ["मोताविक जमाबंदी एवं मोताविक खतियान"], bold: true, shade: "F2F2F2" }];
      blocks.forEach((b) => hdr1.push({ span: b.span, lines: ["अनुसूचि ( Schedule ) सांख्या " + b.sc.no + " बनाम् " + b.sc.name], bold: true, shade: "F2F2F2" }));
      if (showAbhi) hdr1.push({ span: 1, lines: ["अभियुक्ति"], bold: true, shade: "F2F2F2", vm: "restart", head: 3 });
      const hdr2 = cols.map((c) => c.id === "abhi" ? { span: 1, lines: [], vm: "cont" } : { span: 1, lines: c.label, bold: true, small: 1 });
      const hdr3 = cols.map((c, i) => c.id === "abhi" ? { span: 1, lines: [], vm: "cont" } : { span: 1, lines: [String(i + 1)], small: 2 });

      const mergeState = (i, key, byGroup) => {
        const r = rows[i], prev = rows[i - 1], next = rows[i + 1];
        const eq = (o) => o && o.gi === r.gi && (byGroup || (r[key] !== "" && o[key] === r[key]));
        if (eq(prev)) return "cont";
        if (eq(next)) return "restart";
        return null;
      };
      const body = rows.map((r, i) => cols.map((c) => {
        const cell = { span: 1, lines: [] };
        switch (c.id) {
          case "name": cell.vm = mergeState(i, "name", true); cell.lines = cell.vm === "cont" ? [] : r.nameLines; cell.jc = "left"; cell.va = "top"; cell.small = r.nameLines.join("").length > 70 ? 1 : 0; break;
          case "jam": cell.vm = mergeState(i, "jamabandi"); cell.lines = cell.vm === "cont" ? [] : one(r.jamabandi); break;
          case "khata": cell.vm = mergeState(i, "khata"); cell.lines = cell.vm === "cont" ? [] : one(r.khata); break;
          case "khesra": cell.lines = one(r.khesra); break;
          case "k": cell.lines = one(r.k); break;
          case "n": cell.lines = one(r.n); break;
          case "s_khata": cell.lines = one(r.sch[c.s].khata); break;
          case "s_khesra": cell.lines = one(r.sch[c.s].khesra); break;
          case "s_k": cell.lines = one(r.sch[c.s].k); break;
          case "s_n": cell.lines = one(r.sch[c.s].n); break;
          case "s_min": cell.lines = one(r.sch[c.s].min_janib); cell.small = 1; break;
          case "s_ch": cell.lines = r.sch[c.s].ch; cell.jc = "left"; cell.small = 2; break;
          case "abhi": cell.lines = one(r.abhiyukti); cell.small = 1; break;
        }
        return cell;
      }));
      return { cols, total, pageW, pageH, dsz, headRows: [hdr1, hdr2, hdr3], bodyRows: body };
    });
    return { header: st.header || {}, chunks, rowCount: rows.length, schedCount: scheds.length };
  }

  /* ---------- पेज के ऊपर की पंक्तियाँ (text) ---------- */
  function headerLines(h) {
    const g = (k) => t(h[k]) || "………………";
    return [
      { text: "पंचनामा बँटवारा ( Schedule )", sz: 26, jc: "center", bold: true },
      { text: "आपसी सहमति के आधार पर बँटवारा ( Partition ) का अनुसूचि प्रपत्र , ग्राम पंचायत राज " + g("panchayat") + " , हल्का सांख्या " + g("halka"), sz: 22, jc: "center" },
      { text: "स्थल पर दखल-कब्जा एवं जमाबंदी रकवा से मिलान कर खतियानी रकवा का जमाबंदी बँटवारा", sz: 22, jc: "center" },
      { text: "राजस्व ग्राम " + g("mauja") + " , थाना सांख्या " + g("thana_no") + " , अंचल " + g("anchal") + " , पुलिस थाना " + g("police_thana") +
        " , अनुमण्डल " + g("anumandal") + " , राजस्व थाना " + g("rajasva_thana") + " , जिला " + g("jila"), sz: 20, jc: "left" }
    ];
  }

  /* ---------- DOCX renderer ---------- */
  function run(text, sz, bold) {
    return '<w:r><w:rPr><w:rFonts w:hint="cs"/>' + (bold ? "<w:b/><w:bCs/>" : "") +
      '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/><w:lang w:bidi="hi-IN"/></w:rPr><w:t xml:space="preserve">' + esc(text) + "</w:t></w:r>";
  }
  function para(text, sz, jc, bold, extra) {
    return '<w:p><w:pPr>' + (extra || "") + '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="' + jc + '"/></w:pPr>' + (text === "" ? "" : run(text, sz, bold)) + "</w:p>";
  }
  const sectPr = (c) => '<w:sectPr><w:pgSz w:w="' + c.pageW + '" w:h="' + c.pageH + '" w:orient="landscape"/>' +
    '<w:pgMar w:top="720" w:right="' + MARGIN + '" w:bottom="720" w:left="' + MARGIN + '" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>';

  function docxCell(cell, w, dsz, isHead) {
    const base = isHead ? 18 : 18;
    const sz = Math.max(11, base - (cell.small || 0) * 1 - dsz);
    let pr = '<w:tcW w:w="' + w + '" w:type="dxa"/>';
    if (cell.span > 1) pr += '<w:gridSpan w:val="' + cell.span + '"/>';
    if (cell.vm) pr += cell.vm === "restart" ? '<w:vMerge w:val="restart"/>' : "<w:vMerge/>";
    if (cell.shade) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + cell.shade + '"/>';
    pr += '<w:vAlign w:val="' + (cell.va || "center") + '"/>';
    const jc = cell.jc || "center";
    const ps = cell.lines.length ? cell.lines.map((l) => para(l, sz, jc, cell.bold)).join("") : para("", sz, jc);
    return "<w:tc><w:tcPr>" + pr + "</w:tcPr>" + ps + "</w:tc>";
  }
  function docxTable(ch) {
    const wAt = (from, span) => ch.cols.slice(from, from + span).reduce((a, c) => a + c.w, 0);
    const rowXml = (cells, o) => {
      let pos = 0;
      const xml = cells.map((cell) => { const w = wAt(pos, cell.span); pos += cell.span; return docxCell(cell, w, ch.dsz, o.hdr); }).join("");
      return "<w:tr><w:trPr><w:cantSplit/>" + (o.hdr ? "<w:tblHeader/>" : "") + (o.h ? '<w:trHeight w:val="' + o.h + '" w:hRule="atLeast"/>' : "") + "</w:trPr>" + xml + "</w:tr>";
    };
    return '<w:tbl><w:tblPr><w:tblW w:w="' + ch.total + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' +
      ["top", "left", "bottom", "right", "insideH", "insideV"].map((b) => "<w:" + b + ' w:val="single" w:sz="6" w:space="0" w:color="000000"/>').join("") +
      '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      "<w:tblGrid>" + ch.cols.map((c) => '<w:gridCol w:w="' + c.w + '"/>').join("") + "</w:tblGrid>" +
      ch.headRows.map((r) => rowXml(r, { hdr: true })).join("") + ch.bodyRows.map((r) => rowXml(r, { h: 560 })).join("") + "</w:tbl>";
  }

  async function build(JSZip, templateB64, st) {
    const L = layout(st);
    const zip = await JSZip.loadAsync(templateB64, { base64: true });
    let doc = await zip.file("word/document.xml").async("string");
    const bStart = doc.indexOf("<w:body>") + "<w:body>".length;
    const sectStart = doc.lastIndexOf("<w:sectPr");
    const hdr = headerLines(L.header);
    const body = L.chunks.map((ch, i) => {
      const last = i === L.chunks.length - 1;
      return hdr.map((p) => para(p.text, p.sz, p.jc, p.bold)).join("") + para("", 10, "left") + docxTable(ch) +
        (last ? para("", 10, "left") : "<w:p><w:pPr>" + sectPr(ch) + "</w:pPr></w:p>");
    }).join("");
    doc = doc.slice(0, bStart) + body + sectPr(L.chunks[L.chunks.length - 1]) + "</w:body></w:document>";
    zip.file("word/document.xml", doc);
    return { zip, pageCount: L.chunks.length, rowCount: L.rowCount, schedCount: L.schedCount };
  }

  /* ---------- HTML preview ---------- */
  function previewHtml(st) {
    const L = layout(st), hdr = headerLines(L.header);
    return L.chunks.map((ch, ci) => {
      const cg = "<colgroup>" + ch.cols.map((c) => '<col style="width:' + (c.w / ch.total * 100).toFixed(2) + '%">').join("") + "</colgroup>";
      const tdr = (cells, tag) => {
        let pos = 0;
        return "<tr>" + cells.map((cell) => {
          pos += cell.span;
          if (cell.vm === "cont") return "";
          const rs = cell.vm === "restart" ? (cell.head ? ' rowspan="' + cell.head + '"' : "") : "";
          return "<" + tag + (cell.span > 1 ? ' colspan="' + cell.span + '"' : "") + rs + ' class="' + (cell.jc === "left" ? "l " : "") + (cell.va === "top" ? "t " : "") + (cell.small ? "s" + cell.small : "") + '"' + ">" + cell.lines.map(esc).join("<br>") + "</" + tag + ">";
        }).join("") + "</tr>";
      };
      // body rows: rowspan हिसाब से
      const bodyRows = ch.bodyRows.map((cells, ri) => {
        let out = "<tr>";
        cells.forEach((cell, ci2) => {
          if (cell.vm === "cont") return;
          let rs = 1;
          if (cell.vm === "restart") { for (let j = ri + 1; j < ch.bodyRows.length && ch.bodyRows[j][ci2].vm === "cont"; j++) rs++; }
          out += "<td" + (rs > 1 ? ' rowspan="' + rs + '"' : "") + ' class="' + (cell.jc === "left" ? "l " : "") + (cell.va === "top" ? "t " : "") + (cell.small ? "s" + cell.small : "") + '">' + cell.lines.map(esc).join("<br>") + "</td>";
        });
        return out + "</tr>";
      }).join("");
      return '<div class="pv-page"><div class="pv-cap">पेज ' + (ci + 1) + " / " + L.chunks.length + " · " + ch.cols.length + " कॉलम</div>" +
        '<div class="pv-head">' + hdr.map((p) => '<div class="' + (p.jc === "center" ? "c" : "") + (p.bold ? " b" : "") + '">' + esc(p.text) + "</div>").join("") + "</div>" +
        '<div class="pv-scroll"><table class="pv">' + cg + "<thead>" + tdr(ch.headRows[0], "th") + tdr(ch.headRows[1], "th") + tdr(ch.headRows[2], "th") + "</thead><tbody>" + bodyRows + "</tbody></table></div></div>";
    }).join("");
  }

  root.BatwaraDocx = { build, layout, previewHtml };
  if (typeof module !== "undefined" && module.exports) module.exports = root.BatwaraDocx;

})(typeof window !== "undefined" ? window : globalThis);

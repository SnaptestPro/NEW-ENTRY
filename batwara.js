/* ==========================================================
   बँटवारा पंचनामा (Schedule) DOCX भरने वाला module
   - template (batwara_template.js) के floating shapes के ऊपर text boxes लगाकर data भरता है
   - Browser (JSZip global) और Node दोनों में चलता है
   ========================================================== */
(function (root) {

  /* ---------- cell / column geometry (EMU, template से नापा हुआ) ---------- */
  const ROW_Y = [3415030, 4264660, 5101590, 5941060, 6784373];
  const ROW_H = 835000;
  const ROWS_PER_PAGE = 5;
  const OWNERS_PER_PAGE = 3;

  const LEFT = [-273685, 687705, 1207135, 1708785, 2207895, 2706735, 3224463];
  const SCHED = [
    [3224463, 3680493, 4137693, 4598670, 5055870, 5712990, 6677555],
    [6675860, 7131314, 7582535, 8039735, 8497000, 9224540, 10132093],
    [10134567, 10595165, 11064240, 11507470, 11964670, 12633960, 13595350]
  ];
  const ABHI = [13583653, 14461223];

  /* template में schedule header / top header वाले shapes का क्रम */
  const SHAPE_SCHED_HDR = [69, 70, 71];
  const SHAPE_TOP_HDR = 73;      // राजस्व ग्राम ... जिला
  const SHAPE_PANCHAYAT = 75;    // ग्राम पंचायत राज ... हल्का

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------- रकवा helpers ---------- */
  function toDec(ekad, dec) {           // कुल डेसीमल (2 दशमलव तक)
    const e = parseFloat(ekad), d = parseFloat(dec);
    if (isNaN(e) && isNaN(d)) return null;
    return Math.round(((isNaN(e) ? 0 : e) * 100 + (isNaN(d) ? 0 : d)) * 100) / 100;
  }
  function fmtDec(totalDec) {
    if (totalDec == null) return "";
    const acre = Math.floor(totalDec / 100 + 1e-9);
    const dec = Math.round((totalDec - acre * 100) * 100) / 100;
    return acre + "-" + dec;
  }

  /* ---------- text box (overlay) बनाना ---------- */
  let _id = 5000, _rh = 251900000;
  function run(text, sz, bold) {
    return '<w:r><w:rPr><w:rFonts w:hint="cs"/>' + (bold ? "<w:b/><w:bCs/>" : "") +
      '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/><w:lang w:bidi="hi-IN"/></w:rPr>' +
      '<w:t xml:space="preserve">' + esc(text) + "</w:t></w:r>";
  }
  function para(text, sz, jc, bold) {
    return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="' +
      jc + '"/></w:pPr>' + run(text, sz, bold) + "</w:p>";
  }
  function box(x, y, w, h, lines, o) {
    o = o || {};
    if (!lines || !lines.length) return "";
    const sz = o.sz || 16, jc = o.jc || "center", anchor = o.anchor || "ctr";
    const id = ++_id, rh = ++_rh;
    const paras = lines.map((l) => para(l, sz, jc, o.bold)).join("");
    return '<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>' +
      '<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="' + rh +
      '" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>' +
      '<wp:positionH relativeFrom="column"><wp:posOffset>' + Math.round(x) + "</wp:posOffset></wp:positionH>" +
      '<wp:positionV relativeFrom="paragraph"><wp:posOffset>' + Math.round(y) + "</wp:posOffset></wp:positionV>" +
      '<wp:extent cx="' + Math.round(w) + '" cy="' + Math.round(h) + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>' +
      '<wp:docPr id="' + id + '" name="Data ' + id + '"/><wp:cNvGraphicFramePr/>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp>' +
      '<wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + Math.round(w) + '" cy="' + Math.round(h) + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr>' +
      "<wps:txbx><w:txbxContent>" + paras + "</w:txbxContent></wps:txbx>" +
      '<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="18000" tIns="18000" rIns="18000" bIns="18000" anchor="' + anchor + '"><a:noAutofit/></wps:bodyPr>' +
      "</wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>";
  }
  function cell(colX0, colX1, rowIdx, lines, o) {
    return box(colX0 + 15000, ROW_Y[rowIdx] + 15000, colX1 - colX0 - 30000, ROW_H - 30000, lines, o);
  }

  /* ---------- template के dotted blanks भरना ---------- */
  function fillBlanks(shapeXml, values) {
    // लगातार आने वाले "……" वाले runs = एक blank
    const re = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
    const items = [];
    let m;
    while ((m = re.exec(shapeXml))) items.push({ start: m.index, end: m.index + m[0].length, text: m[1] });
    // groups बनाओ
    const groups = [];
    let cur = null;
    items.forEach((it) => {
      const blankish = /^[\s\u2026.]*$/.test(it.text);
      const hasDots = it.text.indexOf("\u2026") >= 0;
      if (blankish && (hasDots || cur)) {
        if (!cur) { cur = []; groups.push(cur); }
        cur.push(it);
      } else cur = null;
    });
    const real = groups.filter((g) => g.some((it) => it.text.indexOf("\u2026") >= 0));
    // पीछे से replace ताकि offsets न बिगड़ें
    const edits = [];
    real.forEach((g, gi) => {
      const val = values[gi];
      if (!val) return;
      g.forEach((it, k) => {
        edits.push({ start: it.start, end: it.end, text: k === 0 ? val : "", first: k === 0 });
      });
    });
    edits.sort((a, b) => b.start - a.start);
    let out = shapeXml;
    edits.forEach((ed) => {
      out = out.slice(0, ed.start) + '<w:t xml:space="preserve">' + (ed.first ? " " : "") + esc(ed.text) + (ed.first ? " " : "") + "</w:t>" + out.slice(ed.end);
    });
    return out;
  }

  /* ---------- text को cell की चौड़ाई के हिसाब से फ़िट करना ---------- */
  function fit(lines, base) {
    const L = Math.max.apply(null, lines.map((l) => String(l).length).concat([0]));
    return L > 12 ? Math.max(base - 5, 10) : L > 7 ? Math.max(base - 3, 12) : base;
  }
  function rk(ac, dc) {
    ac = String(ac == null ? "" : ac).trim(); dc = String(dc == null ? "" : dc).trim();
    if (!ac && !dc) return "";
    const n = parseFloat(dc);
    return (ac || "0") + "-" + (isNaN(n) ? (dc || "0") : String(n));
  }
  const REL = { "पिता": "पिता", "पति": "पति", "अभिभावक": "अभिभावक" };
  const DIRS = [["उ॰", "north"], ["द॰", "south"], ["पू॰", "east"], ["प॰", "west"]];
  function chauLines(x) {
    const out = [];
    DIRS.forEach(([lab, k]) => {
      const t = (x[k] || "").trim(), ref = (x[k + "_ref"] || "").trim();
      if (t || ref) out.push(lab + " " + t + (ref ? " (खे॰ " + ref + ")" : ""));
    });
    return out;
  }
  const one = (v) => { v = String(v == null ? "" : v).trim(); return v ? [v] : []; };
  function hasData(r) {
    const f = ["name", "rel_naam", "addr", "jamabandi", "khata", "khesra", "k_ac", "k_dc", "n_ac", "n_dc", "abhiyukti"];
    return f.some((k) => String(r[k] || "").trim()) ||
      (r.sch || []).some((s) => Object.keys(s).some((k) => String(s[k] || "").trim()));
  }
  function chunk(arr, n) { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; }

  /* ---------- एक page की XML (template paragraph + overlay) ---------- */
  function buildPage(paraTemplate, ctx, pageNo) {
    let idx = -1;
    let xml = paraTemplate.replace(/<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>/g, (m) => {
      idx++;
      const si = SHAPE_SCHED_HDR.indexOf(idx);
      if (si >= 0) {
        const sc = ctx.schedules[si];
        if (!sc) return m;
        return m.split("...... बनाम्").join(sc.no + " बनाम् " + esc(sc.name));
      }
      if (idx === SHAPE_TOP_HDR) {
        const h = ctx.header;
        return fillBlanks(m, [h.mauja, h.thana_no, h.anchal, h.police_thana, h.anumandal, h.rajasva_thana, h.jila]);
      }
      if (idx === SHAPE_PANCHAYAT) {
        const h = ctx.header;
        let r = fillBlanks(m, [h.panchayat, h.halka]);
        if (h.panchayat) r = r.split('<w:t xml:space="preserve">. , </w:t>').join('<w:t xml:space="preserve"> , </w:t>');
        return r;
      }
      return m;
    });

    if (pageNo > 0) {
      xml = xml.replace(/_x0000_s(\d+)/g, (m, n) => "_x0000_s" + (Number(n) + pageNo * 3000));
      xml = xml.replace(/ w14:(paraId|textId)="[^"]*"/g, "").replace(/ wp14:(anchorId|editId)="[^"]*"/g, "");
    }
    let docPr = 0;
    xml = xml.replace(/<wp:docPr id="\d+"/g, () => '<wp:docPr id="' + (++docPr + pageNo * 200) + '"');

    let ov = "";
    ctx.rows.forEach((row, r) => {
      if (row.name.length) {
        const tot = row.name.join("").length;
        ov += cell(LEFT[0], LEFT[1], r, row.name, { sz: tot > 70 ? 13 : 15, jc: "left", anchor: "t" });
      }
      [[1, row.jamabandi], [2, row.khata], [3, row.khesra]].forEach(([c, v]) => {
        if (v.length) ov += cell(LEFT[c], LEFT[c + 1], r, v, { sz: fit(v, 16) });
      });
      if (row.k.length) ov += cell(LEFT[4], LEFT[5], r, row.k, { sz: fit(row.k, 16) });
      if (row.n.length) ov += cell(LEFT[5], LEFT[6], r, row.n, { sz: fit(row.n, 16) });

      ctx.schedules.forEach((sc, s) => {
        const cx = SCHED[s], d = row.sch[s] || {};
        if (d.khata && d.khata.length) ov += cell(cx[0], cx[1], r, d.khata, { sz: fit(d.khata, 16) });
        if (d.khesra && d.khesra.length) ov += cell(cx[1], cx[2], r, d.khesra, { sz: fit(d.khesra, 16) });
        if (d.k && d.k.length) ov += cell(cx[2], cx[3], r, d.k, { sz: fit(d.k, 16) });
        if (d.n && d.n.length) ov += cell(cx[3], cx[4], r, d.n, { sz: fit(d.n, 16) });
        if (d.min_janib && d.min_janib.length) ov += cell(cx[4], cx[5], r, d.min_janib, { sz: 15 });
        if (d.ch && d.ch.length) ov += cell(cx[5], cx[6], r, d.ch, { sz: 14, jc: "left" });
      });
      if (row.abhiyukti.length) ov += cell(ABHI[0], ABHI[1], r, row.abhiyukti, { sz: 15 });
    });

    const last = xml.lastIndexOf("</w:p>");
    xml = xml.slice(0, last) + ov + xml.slice(last);
    if (pageNo > 0) xml = xml.replace(/^(<w:p\b[^>]*>)/, "$1<w:pPr><w:pageBreakBefore/></w:pPr>");
    return xml;
  }

  /* ---------- form state -> page context ---------- */
  function toCtxRow(r, sg) {
    const nm = [];
    if ((r.name || "").trim()) nm.push(r.name.trim());
    if ((r.rel_naam || "").trim()) nm.push((REL[r.rel_type] || "पिता") + "- " + r.rel_naam.trim());
    if ((r.addr || "").trim()) nm.push(r.addr.trim());
    return {
      name: nm,
      jamabandi: one(r.jamabandi), khata: one(r.khata), khesra: one(r.khesra),
      k: one(rk(r.k_ac, r.k_dc)), n: one(rk(r.n_ac, r.n_dc)),
      abhiyukti: one(r.abhiyukti),
      sch: sg.map((sc) => {
        const x = (r.sch && r.sch[sc.idx]) || {};
        return { khata: one(x.khata), khesra: one(x.khesra), k: one(rk(x.k_ac, x.k_dc)), n: one(rk(x.n_ac, x.n_dc)), min_janib: one(x.min_janib), ch: chauLines(x) };
      })
    };
  }

  /* ---------- main ---------- */
  async function build(JSZip, templateB64, st) {
    const zip = await JSZip.loadAsync(templateB64, { base64: true });
    let doc = await zip.file("word/document.xml").async("string");
    const bStart = doc.indexOf("<w:body>") + "<w:body>".length;
    const sectStart = doc.lastIndexOf("<w:sectPr");
    const paraTemplate = doc.slice(bStart, sectStart);

    const rows = (st.rows || []).filter(hasData);
    if (!rows.length) throw new Error("कम से कम एक पंक्ति में डाटा भरें।");
    const scheds = (st.schedules || []).map((s, i) => ({ idx: i, no: i + 1, name: (s.name || "").trim() }));
    if (!scheds.length) throw new Error("कम से कम एक अनुसूचि चाहिए।");

    const pages = [];
    chunk(rows, ROWS_PER_PAGE).forEach((rc) => {
      chunk(scheds, OWNERS_PER_PAGE).forEach((sg) => {
        pages.push({ header: st.header || {}, schedules: sg, rows: rc.map((r) => toCtxRow(r, sg)) });
      });
    });

    _id = 5000; _rh = 251900000;
    const body = pages.map((p, i) => buildPage(paraTemplate, p, i)).join("");
    doc = doc.slice(0, bStart) + body + doc.slice(sectStart);
    zip.file("word/document.xml", doc);
    return { zip, pageCount: pages.length };
  }

  root.BatwaraDocx = { build };
  if (typeof module !== "undefined" && module.exports) module.exports = root.BatwaraDocx;

})(typeof window !== "undefined" ? window : globalThis);

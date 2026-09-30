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

  /* ---------- एक page की XML (template paragraph + overlay) ---------- */
  function buildPage(paraTemplate, ctx, pageNo) {
    let idx = -1;
    let xml = paraTemplate.replace(/<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>/g, (m) => {
      idx++;
      const si = SHAPE_SCHED_HDR.indexOf(idx);
      if (si >= 0) {
        const owner = ctx.owners[si];
        if (!owner) return m;
        return m.split("...... बनाम्").join(owner.no + " बनाम् " + esc(owner.name));
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

    /* ids को unique रखना */
    if (pageNo > 0) {
      xml = xml.replace(/_x0000_s(\d+)/g, (m, n) => "_x0000_s" + (Number(n) + pageNo * 3000));
      xml = xml.replace(/ w14:(paraId|textId)="[^"]*"/g, "")
               .replace(/ wp14:(anchorId|editId)="[^"]*"/g, "");
    }
    let docPr = 0;
    xml = xml.replace(/<wp:docPr id="\d+"/g, () => '<wp:docPr id="' + (++docPr + pageNo * 200) + '"');
    /* overlay ids (5000+) पहले से unique हैं */

    /* ---- data cells ---- */
    let ov = "";
    const rows = ctx.rows;
    rows.forEach((row, r) => {
      // बायाँ हिस्सा (मौताबिक जमाबंदी एवं खतियान)
      if (row.name) ov += cell(LEFT[0], LEFT[1], r, row.name, { sz: 15, jc: "left", anchor: "t" });
      if (row.jamabandi) ov += cell(LEFT[1], LEFT[2], r, [row.jamabandi], { sz: 16 });
      if (row.oldKhata) ov += cell(LEFT[2], LEFT[3], r, row.oldKhata, { sz: 16 });
      if (row.oldKhesra) ov += cell(LEFT[3], LEFT[4], r, row.oldKhesra, { sz: 16 });
      if (row.totalRakba) {
        ov += cell(LEFT[4], LEFT[5], r, [row.totalRakba], { sz: 15 });
        ov += cell(LEFT[5], LEFT[6], r, [row.totalRakba], { sz: 15 });
      }
      // तीन अनुसूचियाँ
      ctx.owners.forEach((ow, s) => {
        const cx = SCHED[s];
        const d = row.byOwner[s] || {};
        if (d.khata) ov += cell(cx[0], cx[1], r, [d.khata], { sz: 16 });
        if (d.khesra) ov += cell(cx[1], cx[2], r, [d.khesra], { sz: 16 });
        if (d.rakba) {
          ov += cell(cx[2], cx[3], r, [d.rakba], { sz: 15 });
          ov += cell(cx[3], cx[4], r, [d.rakba], { sz: 15 });
        }
        if (d.minJanib) ov += cell(cx[4], cx[5], r, [d.minJanib], { sz: 15 });
        if (d.chauhaddi && d.chauhaddi.length) ov += cell(cx[5], cx[6], r, d.chauhaddi, { sz: 14, jc: "left" });
      });
      if (row.abhiyukti) ov += cell(ABHI[0], ABHI[1], r, [row.abhiyukti], { sz: 15 });
    });

    const last = xml.lastIndexOf("</w:p>");
    xml = xml.slice(0, last) + ov + xml.slice(last);
    if (pageNo > 0) {
      xml = xml.replace(/^(<w:p\b[^>]*>)/, "$1<w:pPr><w:pageBreakBefore/></w:pPr>");
    }
    return xml;
  }

  /* ---------- entries → pages का data model ---------- */
  const REL = { "पिता का नाम": "पिता", "पति का नाम": "पति", "अभिभावक का नाम": "अभिभावक" };
  const DIRS = [["उ॰", "north"], ["द॰", "south"], ["पू॰", "east"], ["प॰", "west"]];

  function chauhaddiLines(get) {
    const out = [];
    DIRS.forEach(([lab, key]) => {
      const t = get(key), ref = get(key + "_ref");
      if (t || ref) out.push(lab + " " + (t || "") + (ref ? " (" + ref + ")" : ""));
    });
    return out;
  }

  function entryHasData(e) {
    const t = e.tab1 || {};
    return !!(t.khesra_no || t.raiyat_naam);
  }

  function ownersOf(e) {
    const t = e.tab1, list = [];
    const mainRakba = toDec(t.ekad, t.decimal);
    list.push({
      name: t.raiyat_naam || "",
      khata: t.naya_khata || "",
      khesra: t.khesra_no || "",
      rakbaDec: mainRakba,
      minJanib: t.min_janib || "",
      chauhaddi: chauhaddiLines((k) => (e.tab3 || {})[k] || "")
    });
    if (e.tab2 && e.tab2.hasOther === "yes") {
      (e.tab2.shareholders || []).forEach((s) => {
        list.push({
          name: s.naam || "",
          khata: s.khata || "",
          khesra: s.khesra || "",
          rakbaDec: toDec(s.ekad, s.decimal),
          minJanib: s.min_janib || "",
          chauhaddi: chauhaddiLines((k) => s["ch_" + k] || "")
        });
      });
    }
    return list;
  }

  function leftName(e) {
    const t = e.tab1, lines = [];
    if (t.raiyat_naam) lines.push(t.raiyat_naam);
    if (t.relation_naam) lines.push((REL[t.relation_type] || "पिता") + "- " + t.relation_naam);
    const addr = [t.addr1, t.addr2].filter(Boolean).join(", ");
    if (addr) lines.push(addr + (t.pin ? " - " + t.pin : ""));
    return lines;
  }

  function buildRows(e, owners) {
    const t = e.tab1;
    const totalDec = owners.reduce((a, o) => a + (o.rakbaDec || 0), 0);
    const anyRakba = owners.some((o) => o.rakbaDec != null);
    const old = t.oldKhataList || [];
    const rows = [];
    const first = {
      name: leftName(e),
      jamabandi: t.jamabandi || "",
      oldKhata: old.map((o) => o.khata).filter(Boolean),
      oldKhesra: old.length ? old.map((o) => o.khesra).filter(Boolean) : [t.ref_khesra_no || t.khesra_no].filter(Boolean),
      totalRakba: anyRakba ? fmtDec(totalDec) : "",
      abhiyukti: t.abhiyukti || "",
      byOwner: owners.map((o) => ({
        khata: o.khata, khesra: o.khesra,
        rakba: o.rakbaDec != null ? fmtDec(o.rakbaDec) : "",
        minJanib: o.minJanib, chauhaddi: o.chauhaddi
      }))
    };
    rows.push(first);
    ((e.tab4 && e.tab4.extraList) || []).forEach((x) => {
      rows.push({
        oldKhesra: [x.ref || x.khesra].filter(Boolean),
        byOwner: owners.map((o, i) => (i === 0 ? { khesra: x.khesra } : {}))
      });
    });
    return rows;
  }

  function chunk(arr, n) {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  }

  /* ---------- main ---------- */
  async function build(JSZip, templateB64, entries, header) {
    const zip = await JSZip.loadAsync(templateB64, { base64: true });
    let doc = await zip.file("word/document.xml").async("string");

    const bStart = doc.indexOf("<w:body>") + "<w:body>".length;
    const sectStart = doc.lastIndexOf("<w:sectPr");
    const paraTemplate = doc.slice(bStart, sectStart);

    const pages = [];
    entries.filter(entryHasData).forEach((e) => {
      const owners = ownersOf(e);
      owners.forEach((o, i) => { o.no = i + 1; });
      const rows = buildRows(e, owners);
      chunk(owners, OWNERS_PER_PAGE).forEach((ownerChunk) => {
        chunk(rows, ROWS_PER_PAGE).forEach((rowChunk) => {
          const s0 = ownerChunk[0].no - 1;
          const rc = rowChunk.map((r) => Object.assign({}, r, {
            byOwner: ownerChunk.map((_, k) => r.byOwner[s0 + k] || {})
          }));
          pages.push({ owners: ownerChunk, rows: rc, header: header || {} });
        });
      });
    });
    if (!pages.length) throw new Error("कोई भरी हुई entry नहीं मिली।");

    _id = 5000; _rh = 251900000;
    const body = pages.map((p, i) => buildPage(paraTemplate, p, i)).join("");
    doc = doc.slice(0, bStart) + body + doc.slice(sectStart);
    zip.file("word/document.xml", doc);
    return { zip, pageCount: pages.length };
  }

  root.BatwaraDocx = { build };
  if (typeof module !== "undefined" && module.exports) module.exports = root.BatwaraDocx;

})(typeof window !== "undefined" ? window : globalThis);

/* ==========================================================
   बँटवारा पंचनामा — फॉर्म (DOCX के कॉलम 1-25 के अनुसार)
   डाटा ब्राउज़र के localStorage में अपने-आप सेव होता है
   ========================================================== */
(function () {
  "use strict";

  const KEY = "batwaraForm_v3", OLD_KEY = "batwaraForm_v2";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const HEADER_FIELDS = [
    ["panchayat", "ग्राम पंचायत राज"], ["halka", "हल्का सांख्या"], ["mauja", "राजस्व ग्राम"],
    ["thana_no", "थाना सांख्या"], ["anchal", "अंचल"], ["police_thana", "पुलिस थाना"],
    ["anumandal", "अनुमण्डल"], ["rajasva_thana", "राजस्व थाना"], ["jila", "जिला"]
  ];
  const STEPS = [
    ["गाँव / थाना विवरण", "DOCX की ऊपरी पंक्तियाँ"],
    ["अनुसूचियाँ", "पक्षकार (बनाम)"],
    ["खतियानी पंक्तियाँ", "कॉलम 1 से 25"],
    ["जाँच व डाउनलोड", "अंतिम मिलान"]
  ];

  /* ---------- data model ---------- */
  const blankSch = () => ({
    khata: "", khesra: "", k_ac: "", k_dc: "", n_ac: "", n_dc: "", min_janib: "",
    north: "", north_ref: "", south: "", south_ref: "", east: "", east_ref: "", west: "", west_ref: ""
  });
  const blankPlot = (n, prev) => ({
    jamabandi: prev ? prev.jamabandi : "", khata: prev ? prev.khata : "", khesra: "", k_ac: "", k_dc: "", n_ac: "", n_dc: "",
    abhiyukti: "", sch: Array.from({ length: n }, blankSch)
  });
  // एक रैयत (नाम/पिता/पता एक ही बार) + उसकी कई खेसरा-पंक्तियाँ (plots)
  const blankGroup = (n) => ({ name: "", rel_type: "पिता", rel_naam: "", addr: "", plots: [blankPlot(n)] });
  const blankSched = () => ({ name: "", rel_type: "पिता", rel_naam: "", jati: "", nivasi: "निज ग्राम" });
  const freshState = () => ({ header: {}, schedules: [blankSched()], groups: [blankGroup(1)] });

  function normalize(st) {
    st.header = st.header || {};
    if (!Array.isArray(st.schedules) || !st.schedules.length) st.schedules = [blankSched()];
    st.schedules.forEach((x) => { if (x.rel_type == null) x.rel_type = "पिता"; ["rel_naam", "jati", "nivasi"].forEach((k) => { if (x[k] == null) x[k] = ""; }); });
    if (!Array.isArray(st.groups) || !st.groups.length) st.groups = [blankGroup(st.schedules.length)];
    st.groups.forEach((g) => {
      if (!Array.isArray(g.plots) || !g.plots.length) g.plots = [blankPlot(st.schedules.length)];
      g.plots.forEach((r) => {
        r.sch = Array.isArray(r.sch) ? r.sch : [];
        while (r.sch.length < st.schedules.length) r.sch.push(blankSch());
        r.sch.length = st.schedules.length;
      });
    });
    return st;
  }
  // पुराने (v2) डाटा को नए ढाँचे में बदलना: एक जैसे नाम+पिता+पता वाली लगातार पंक्तियाँ = एक रैयत
  function migrate(old) {
    const st = { header: old.header || {}, schedules: old.schedules || [blankSched()], groups: [] };
    (old.rows || []).forEach((r) => {
      const last = st.groups[st.groups.length - 1];
      const same = last && (last.name || "").trim() === (r.name || "").trim() && (last.rel_naam || "").trim() === (r.rel_naam || "").trim() && (last.addr || "").trim() === (r.addr || "").trim();
      const plot = { jamabandi: r.jamabandi, khata: r.khata, khesra: r.khesra, k_ac: r.k_ac, k_dc: r.k_dc, n_ac: r.n_ac, n_dc: r.n_dc, abhiyukti: r.abhiyukti, sch: r.sch };
      if (same) last.plots.push(plot);
      else st.groups.push({ name: r.name, rel_type: r.rel_type || "पिता", rel_naam: r.rel_naam, addr: r.addr, plots: [plot] });
    });
    return st;
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) {}
    try { const raw = localStorage.getItem(OLD_KEY); if (raw) return normalize(migrate(JSON.parse(raw))); } catch (e) {}
    return normalize(freshState());
  }

  let state = load();
  const ui = { step: 0, openGroup: 0, openPlot: {}, schTab: {} };

  let saveTimer = null;
  function save() {
    const el = $("#saveState");
    el.textContent = "● सेव हो रहा है…"; el.classList.add("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); el.textContent = "● स्वतः सेव हो गया"; }
      catch (e) { el.textContent = "● सेव नहीं हो पाया"; }
      el.classList.remove("saving");
    }, 350);
  }

  function toast(msg, err) {
    const t = $("#toast");
    t.textContent = msg; t.className = "toast show" + (err ? " err" : "");
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = "toast"; }, 3200);
  }

  /* ---------- path get / set ---------- */
  const getP = (p) => p.split(".").reduce((o, k) => (o == null ? o : o[k]), state);
  function setP(p, v) {
    const ks = p.split("."), last = ks.pop();
    ks.reduce((o, k) => o[k], state)[last] = v;
  }

  /* ---------- रकवा गणित ---------- */
  const toD = (ac, dc) => {
    const a = parseFloat(ac), d = parseFloat(dc);
    if (isNaN(a) && isNaN(d)) return null;
    return Math.round(((isNaN(a) ? 0 : a) * 100 + (isNaN(d) ? 0 : d)) * 100) / 100;
  };
  const fmtD = (t) => {
    const a = Math.floor(t / 100 + 1e-9), d = Math.round((t - a * 100) * 100) / 100;
    return a + "-" + d;
  };
  function bal(row) {
    const kT = toD(row.k_ac, row.k_dc), nT = toD(row.n_ac, row.n_dc);
    let kS = 0, nS = 0, kAny = false, nAny = false;
    row.sch.forEach((s) => {
      const k = toD(s.k_ac, s.k_dc); if (k != null) { kS += k; kAny = true; }
      const n = toD(s.n_ac, s.n_dc); if (n != null) { nS += n; nAny = true; }
    });
    return { kT, nT, kS, nS, kAny, nAny };
  }
  function status(row) {
    const b = bal(row);
    if (b.kT == null && b.nT == null) return { cls: "idle", txt: "रकवा भरें" };
    if (!b.kAny && !b.nAny) return { cls: "idle", txt: "बँटवारा बाकी" };
    const msgs = [];
    if (b.kT != null && Math.abs(b.kT - b.kS) > 0.005) msgs.push("खतियानी " + (b.kT > b.kS ? "बाकी " + fmtD(b.kT - b.kS) : "अधिक " + fmtD(b.kS - b.kT)));
    if (b.nT != null && b.nAny && Math.abs(b.nT - b.nS) > 0.005) msgs.push("नक्शा " + (b.nT > b.nS ? "बाकी " + fmtD(b.nT - b.nS) : "अधिक " + fmtD(b.nS - b.nT)));
    return msgs.length ? { cls: "warn", txt: "⚠ " + msgs.join(" · ") } : { cls: "ok", txt: "✓ रकवा मिलान सही" };
  }
  function balHtml(row) {
    const b = bal(row), one = (lab, T, S, any) => {
      if (T == null) return "";
      return "<span>" + lab + ": कुल <b>" + fmtD(T) + "</b> · बँटा <b>" + (any ? fmtD(S) : "0-0") + "</b> · बाकी <b>" + fmtD(Math.max(T - S, 0)) + "</b></span>";
    };
    return one("खतियानी रकवा", b.kT, b.kS, b.kAny) + one("नक्शा रकवा", b.nT, b.nS, b.nAny) ||
      "<span>ऊपर (कॉलम 5-6) में कुल रकवा भरते ही यहाँ बँटवारे का मिलान दिखेगा।</span>";
  }
  const plotHasData = (r) =>
    ["jamabandi", "khata", "khesra", "k_ac", "k_dc", "n_ac", "n_dc", "abhiyukti"].some((k) => String(r[k] || "").trim()) ||
    r.sch.some((s) => Object.keys(s).some((k) => String(s[k] || "").trim()));

  /* ---------- field builders ---------- */
  function fld(p, label, o) {
    o = o || {};
    const v = h(getP(p));
    const lab = "<span>" + label + (o.sub ? "<i>" + o.sub + "</i>" : "") + "</span>";
    if (o.area) return '<label class="fld ' + (o.cls || "") + '">' + lab + '<textarea data-p="' + p + '" rows="' + (o.rows || 2) + '" placeholder="' + h(o.ph || "") + '">' + v + "</textarea></label>";
    return '<label class="fld ' + (o.cls || "") + '">' + lab + '<input type="text" data-p="' + p + '" value="' + v + '" placeholder="' + h(o.ph || "") + '"' + (o.num ? ' inputmode="decimal"' : "") + "></label>";
  }
  function rk(pAc, pDc, label, cls) {
    return '<div class="rk ' + (cls || "") + '"><span>' + label + '</span><div class="rk-in">' +
      '<label><input type="text" inputmode="decimal" data-p="' + pAc + '" value="' + h(getP(pAc)) + '" placeholder="0"><em>एकड़</em></label>' +
      '<label><input type="text" inputmode="decimal" data-p="' + pDc + '" value="' + h(getP(pDc)) + '" placeholder="0"><em>डेसीमल</em></label>' +
      "</div></div>";
  }

  /* ---------- steps nav ---------- */
  function renderSteps() {
    $("#steps").innerHTML = STEPS.map((s, i) =>
      '<button type="button" class="step ' + (i === ui.step ? "active" : i < ui.step ? "done" : "") + '" data-act="step" data-i="' + i + '">' +
      '<span class="num">' + (i < ui.step ? "✓" : i + 1) + '</span><span><div class="t">' + s[0] + '</div><div class="s">' + s[1] + "</div></span></button>"
    ).join("");
    $("#stepLabel").textContent = "चरण " + (ui.step + 1) + " / " + STEPS.length;
    $("#btnBack").style.visibility = ui.step === 0 ? "hidden" : "visible";
    $("#btnNext").style.display = ui.step === STEPS.length - 1 ? "none" : "";
  }

  /* ---------- Step 1 : header ---------- */
  function headerPreview() {
    const g = (k) => h(state.header[k] || "………");
    return "राजस्व ग्राम <b>" + g("mauja") + "</b>, थाना सांख्या <b>" + g("thana_no") + "</b>, अंचल <b>" + g("anchal") +
      "</b>, पुलिस थाना <b>" + g("police_thana") + "</b>, अनुमण्डल <b>" + g("anumandal") + "</b>, राजस्व थाना <b>" +
      g("rajasva_thana") + "</b>, जिला <b>" + g("jila") + "</b><br>ग्राम पंचायत राज <b>" + g("panchayat") + "</b>, हल्का सांख्या <b>" + g("halka") + "</b>";
  }
  function panelHeader() {
    return '<div class="card"><div class="card-h"><div><h2>गाँव / थाना विवरण</h2><div class="hint">ये जानकारी DOCX के सबसे ऊपर वाली दो पंक्तियों में अपने-आप भर जाएगी (सभी पेज पर)।</div></div></div>' +
      '<div class="card-b"><div class="grid g3">' +
      HEADER_FIELDS.map((f) => fld("header." + f[0], f[1])).join("") +
      '</div><div class="live-line" id="hdrPreview">' + headerPreview() + "</div></div></div>";
  }

  /* ---------- Step 2 : schedules ---------- */
  function panelSchedules() {
    const items = state.schedules.map((s, i) => {
      const P = "schedules." + i + ".";
      return '<div class="sch-edit c' + (i % 5) + '"><div class="sch-no">' + (i + 1) + "</div>" +
        '<div class="grid g4">' +
        fld(P + "name", "अनुसूचि " + (i + 1) + " — बनाम् (हिस्सेदार का नाम)", { cls: "span2", ph: "जैसे: रामलखन प्रसाद" }) +
        '<div class="fld span2"><span>पिता / पति का नाम</span><div class="rel"><select data-p="' + P + 'rel_type">' +
        ["पिता", "पति", "अभिभावक"].map((o) => "<option" + (s.rel_type === o ? " selected" : "") + ">" + o + "</option>").join("") +
        '</select><input type="text" data-p="' + P + 'rel_naam" value="' + h(s.rel_naam) + '"></div></div>' +
        fld(P + "jati", "जाति", { ph: "जैसे: चमार" }) + fld(P + "nivasi", "निवासी", { ph: "निज ग्राम" }) +
        "</div>" +
        (state.schedules.length > 1 ? '<button type="button" class="btn danger sm" data-act="delSched" data-s="' + i + '">हटाएँ</button>' : "<span></span>") +
        "</div>";
    }).join("");
    return '<div class="card"><div class="card-h"><div><h2>अनुसूचियाँ (पक्षकार)</h2><div class="hint">हर हिस्सेदार की एक अनुसूचि। नाम, पिता/पति, जाति, निवासी — ये सब अनुसूचि के header में छपेंगे (जो खाली छोड़ेंगे वो छपेगा नहीं)। एक पेज पर अधिकतम 5 अनुसूचि; ज़्यादा हों तो अगला पेज।</div></div>' +
      '<button type="button" class="btn soft" data-act="addSched">+ अनुसूचि जोड़ें</button></div>' +
      '<div class="card-b"><div class="sch-list">' + items + "</div></div></div>";
  }

  /* ---------- Step 3 : रैयत (एक बार) + खेसरा पंक्तियाँ ---------- */
  const gName = (g) => (g.name || "").trim() || "नया रैयत";
  function plotSummary(r) {
    const meta = [r.khata && "खाता " + r.khata, r.khesra && "खेसरा " + r.khesra].filter(Boolean).join(" · ");
    return "<b>" + (h(meta) || "खेसरा विवरण भरें") + "</b>";
  }
  function groupSummary(g) {
    const n = g.plots.filter(plotHasData).length;
    return "<b>" + h(gName(g)) + "</b><small>" + (n ? n + " खेसरा पंक्ति" : "पंक्ति भरी नहीं") + "</small>";
  }
  function schCard(gi, pi, k) {
    const SP = "groups." + gi + ".plots." + pi + ".sch." + k + ".";
    const sc = state.schedules[k], x = state.groups[gi].plots[pi].sch[k];
    const has = Object.keys(x).some((q) => String(x[q] || "").trim());
    const dirs = [["उत्तर", "north"], ["दक्षिण", "south"], ["पूर्व", "east"], ["पश्चिम", "west"]];
    const chau = '<div class="chau">' + dirs.map((d) => '<span class="dir">' + d[0] + "</span>" +
      '<input type="text" placeholder="नाम" data-p="' + SP + d[1] + '" value="' + h(getP(SP + d[1])) + '">' +
      '<input type="text" placeholder="खेसरा" data-p="' + SP + d[1] + '_ref" value="' + h(getP(SP + d[1] + "_ref")) + '">').join("") + "</div>";
    return '<div class="sch-card c' + (k % 5) + (has ? " filled" : "") + '"><div class="sch-card-h"><b>' + (k + 1) + "</b><span>" + (h(sc.name) || "अनुसूचि " + (k + 1)) + "</span></div>" +
      '<div class="sch-card-b"><div class="mini2">' +
      fld(SP + "khata", "खाता") + fld(SP + "khesra", "खेसरा") + "</div>" +
      rk(SP + "k_ac", SP + "k_dc", "खतियानी रकवा", "sm") + rk(SP + "n_ac", SP + "n_dc", "नक्शा रकवा", "sm") +
      fld(SP + "min_janib", "मिन जानिब") +
      '<details class="chau-box"' + (/north|south|east|west/.test(Object.keys(x).filter((q) => String(x[q] || "").trim()).join()) ? " open" : "") + "><summary>चौहद्दी (उ॰ द॰ पू॰ प॰)</summary>" + chau + "</details></div></div>";
  }
  function plotForm(gi, pi, r) {
    const P = "groups." + gi + ".plots." + pi + ".";
    const key = gi + "-" + pi;
    return '<div class="row-body">' +
      '<div class="sec"><div class="sec-t">जमाबंदी · खाता · खेसरा · कुल रकवा <small>रैयत के नाम के सामने की कॉलम</small></div><div class="grid g5">' +
      fld(P + "jamabandi", "जमाबंदी सांख्या") + fld(P + "khata", "खाता सांख्या") + fld(P + "khesra", "खेसरा सांख्या") +
      rk(P + "k_ac", P + "k_dc", "खतियानी रकवा", "sm") + rk(P + "n_ac", P + "n_dc", "नक्शा रकवा", "sm") +
      "</div></div>" +
      '<div class="sec"><div class="sec-t">अनुसूचि-वार बँटवारा <small>जिस अनुसूचि में हिस्सा नहीं है उसे खाली छोड़ दें</small></div>' +
      '<div class="sch-grid">' + state.schedules.map((_, k) => schCard(gi, pi, k)).join("") + "</div>" +
      '<div class="bal" data-bal="' + key + '">' + balHtml(r) + "</div></div>" +
      '<div class="sec"><div class="grid g2">' + fld(P + "abhiyukti", "अभियुक्ति (वैकल्पिक)", { cls: "span2" }) + "</div></div></div>";
  }
  function panelRows() {
    const cards = state.groups.map((g, gi) => {
      const open = ui.openGroup === gi, G = "groups." + gi + ".";
      const op = ui.openPlot[gi] == null ? 0 : ui.openPlot[gi];
      let body = "";
      if (open) {
        body = '<div class="row-body"><div class="sec"><div class="sec-t">रैयत की जानकारी <small>सिर्फ़ एक बार भरें — सारी खेसरा पंक्तियों में अपने-आप जुड़ेगी</small></div><div class="grid g4">' +
          fld(G + "name", "खतियानी रैयत का नाम", { cls: "span2", ph: "नाम" }) +
          '<div class="fld span2"><span>पिता / पति का नाम</span><div class="rel">' +
          '<select data-p="' + G + 'rel_type">' + ["पिता", "पति", "अभिभावक"].map((o) => "<option" + (g.rel_type === o ? " selected" : "") + ">" + o + "</option>").join("") + "</select>" +
          '<input type="text" data-p="' + G + 'rel_naam" value="' + h(g.rel_naam) + '"></div></div>' +
          fld(G + "addr", "पता", { cls: "span4", ph: "गाँव, पोस्ट…" }) +
          "</div></div>" +
          '<div class="sec"><div class="sec-t">खेसरा पंक्तियाँ <small>हर खेसरा = रिज़ल्ट की एक पंक्ति</small></div>' +
          g.plots.map((p, pi) => {
            const st = status(p), pOpen = op === pi;
            return '<div class="row-card ' + (pOpen ? "open" : "") + '"><div class="row-head" data-act="togglePlot" data-g="' + gi + '" data-p="' + pi + '"><div class="row-n">' + (pi + 1) + "</div>" +
              '<div class="row-sum" data-psum="' + gi + "-" + pi + '">' + plotSummary(p) + "</div>" +
              '<span class="badge ' + st.cls + '" data-badge="' + gi + "-" + pi + '">' + st.txt + "</span>" +
              '<div class="row-actions">' +
              (g.plots.length > 1 ? '<button type="button" class="btn danger sm" data-act="delPlot" data-g="' + gi + '" data-p="' + pi + '" title="हटाएँ">🗑 <span>हटाएँ</span></button>' : "") +
              "</div></div>" + (pOpen ? plotForm(gi, pi, p) : "") + "</div>";
          }).join("") +
          '<button type="button" class="add-row" data-act="addPlot" data-g="' + gi + '">+ इसी रैयत की नई खेसरा पंक्ति</button></div></div>';
      }
      return '<div class="row-card ' + (open ? "open" : "") + '">' +
        '<div class="row-head" data-act="toggleGroup" data-g="' + gi + '"><div class="row-n">' + (gi + 1) + "</div>" +
        '<div class="row-sum" data-gsum="' + gi + '">' + groupSummary(g) + "</div>" +
        '<div class="row-actions">' +
        (state.groups.length > 1 ? '<button type="button" class="btn danger sm" data-act="delGroup" data-g="' + gi + '" title="हटाएँ">🗑 <span>हटाएँ</span></button>' : "") +
        "</div></div>" + body + "</div>";
    }).join("");
    return '<div class="info">हर <b>रैयत</b> का नाम / पिता / पता सिर्फ़ <b>एक बार</b> भरें। उसके नीचे जितने <b>खेसरा</b> हों उतनी पंक्तियाँ जोड़ें। रिज़ल्ट में उतनी ही पंक्तियाँ और उतनी ही अनुसूचि आएँगी जितनी आपने भरी — खाली कॉलम दिखेंगे ही नहीं।</div>' +
      cards + '<button type="button" class="add-row" data-act="addGroup">+ नया रैयत जोड़ें</button>';
  }

  /* ---------- Step 4 : review ---------- */
  function panelReview() {
    const flat = [];
    state.groups.forEach((g, gi) => g.plots.forEach((p, pi) => { if (plotHasData(p)) flat.push({ g, gi, p, pi }); }));
    const checks = [];
    const missing = HEADER_FIELDS.filter((f) => !String(state.header[f[0]] || "").trim()).map((f) => f[1]);
    checks.push(missing.length ? ["warn", "गाँव / थाना विवरण अधूरा: " + missing.join(", ")] : ["ok", "गाँव / थाना विवरण पूरा है।"]);
    const unnamed = state.schedules.map((s, i) => (String(s.name || "").trim() ? null : i + 1)).filter(Boolean);
    checks.push(unnamed.length ? ["warn", "इन अनुसूचियों में नाम (बनाम) नहीं भरा: " + unnamed.join(", ")] : ["ok", "सभी अनुसूचियों के नाम भरे हैं।"]);
    if (!flat.length) checks.push(["err", "अभी किसी पंक्ति में डाटा नहीं है — DOCX नहीं बन सकता।"]);
    else {
      let bad = 0;
      flat.forEach((x) => { const s = status(x.p); if (s.cls === "warn") { bad++; checks.push(["warn", gName(x.g) + " / खेसरा " + (x.p.khesra || x.pi + 1) + ": " + s.txt.replace("⚠ ", "")]); } });
      if (!bad) checks.push(["ok", "सभी पंक्तियों का रकवा मिलान सही है।"]);
    }
    const pages = Math.ceil(state.schedules.length / 5);
    const trs = flat.map((x, i) => {
      const r = x.p, s = status(r), k = toD(r.k_ac, r.k_dc), n = toD(r.n_ac, r.n_dc);
      return "<tr><td>" + (i + 1) + "</td><td><b>" + h(x.pi === 0 ? x.g.name : "〃") + "</b><br><small>" + h(x.pi === 0 && x.g.rel_naam ? x.g.rel_type + ": " + x.g.rel_naam : "") + "</small></td>" +
        "<td>" + h(r.jamabandi) + "</td><td>" + h(r.khata) + "</td><td>" + h(r.khesra) + "</td>" +
        "<td>" + (k == null ? "—" : fmtD(k)) + "</td><td>" + (n == null ? "—" : fmtD(n)) + '</td><td><span class="badge ' + s.cls + '">' + s.txt + "</span></td></tr>";
    }).join("");
    let preview = "";
    try { preview = flat.length ? BatwaraDocx.previewHtml(state) : ""; } catch (e) { preview = ""; }
    return '<div class="card"><div class="card-h"><div><h2>जाँच</h2><div class="hint">डाउनलोड से पहले एक बार मिलान देख लें (चेतावनी होने पर भी DOCX बन सकता है)।</div></div></div>' +
      '<div class="card-b"><ul class="checks">' + checks.map((c) => '<li class="' + c[0] + '"><span>' + (c[0] === "ok" ? "✓" : c[0] === "warn" ? "⚠" : "✕") + "</span><span>" + h(c[1]) + "</span></li>").join("") + "</ul></div></div>" +
      (preview ? '<div class="card"><div class="card-h"><div><h2>रिज़ल्ट का नमूना (DOCX ऐसा ही बनेगा)</h2><div class="hint">खाली कॉलम नहीं दिखते · रैयत का नाम एक बार · पेज का साइज़ कॉलम के हिसाब से अपने-आप</div></div></div><div class="card-b">' + preview + "</div></div>" : "") +
      '<div class="card"><div class="card-h"><h2>पंक्तियों का सार</h2></div><div class="card-b tbl-wrap">' +
      (flat.length ? '<table class="tbl"><thead><tr><th>क्र.</th><th>रैयत</th><th>जमाबंदी</th><th>खाता</th><th>खेसरा</th><th>खतियानी रकवा</th><th>नक्शा रकवा</th><th>बँटवारा</th></tr></thead><tbody>' + trs + "</tbody></table>" : "<p>कोई पंक्ति नहीं।</p>") +
      "</div></div>" +
      '<div class="card"><div class="card-b dl-box"><div><h2 style="margin:0 0 4px;color:var(--navy)">DOCX तैयार करें</h2><p>' + flat.length + " पंक्ति · " + state.schedules.length + " अनुसूचि · " + pages + " पेज (एक पेज पर अधिकतम 5 अनुसूचि, पेज का साइज़ अपने-आप)</p></div>" +
      '<button type="button" class="btn primary lg" data-act="download">⬇ DOCX डाउनलोड करें</button></div></div>';
  }

  /* ---------- render ---------- */
  function render() {
    document.body.dataset.step = ui.step;
    renderSteps();
    $("#panel").innerHTML = [panelHeader, panelSchedules, panelRows, panelReview][ui.step]();
    fitPreview();
  }
  // result का नमूना: स्क्रीन की चौड़ाई में फिट (या पूरा असली आकार)
  function fitPreview() {
    $$(".pv-scroll").forEach((el) => {
      const pw = Number(el.dataset.pw) || 1, z = el.closest(".pv-page").classList.contains("full") ? 1 : Math.min(1, (el.clientWidth - 2) / pw);
      const zoomEl = $(".pv-zoom", el);
      if (zoomEl) { zoomEl.style.zoom = z; }
    });
  }
  window.addEventListener("resize", fitPreview);
  function updateLive() {
    if (ui.step === 0) { const el = $("#hdrPreview"); if (el) el.innerHTML = headerPreview(); }
    if (ui.step === 2) {
      state.groups.forEach((g, gi) => {
        const gs = $('[data-gsum="' + gi + '"]'); if (gs) gs.innerHTML = groupSummary(g);
        g.plots.forEach((p, pi) => {
          const k = gi + "-" + pi;
          const b = $('[data-badge="' + k + '"]'); if (b) { const s = status(p); b.className = "badge " + s.cls; b.textContent = s.txt; }
          const sm = $('[data-psum="' + k + '"]'); if (sm) sm.innerHTML = plotSummary(p);
          const bl = $('[data-bal="' + k + '"]'); if (bl) bl.innerHTML = balHtml(p);
        });
      });
    }
  }
  function go(i) { ui.step = Math.max(0, Math.min(STEPS.length - 1, i)); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }

  /* ---------- events ---------- */
  document.addEventListener("input", (e) => {
    const p = e.target && e.target.dataset && e.target.dataset.p;
    if (!p || !/\./.test(p)) return;
    setP(p, e.target.value);
    save(); updateLive();
  });
  document.addEventListener("change", (e) => {
    const p = e.target && e.target.dataset && e.target.dataset.p;
    if (p && /\./.test(p) && e.target.tagName === "SELECT") { setP(p, e.target.value); save(); }
  });

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const d = t.dataset, act = d.act, i = Number(d.i), s = Number(d.s), gi = Number(d.g), pi = Number(d.p);
    const n = state.schedules.length;
    if (act === "step") go(i);
    else if (act === "toggleGroup") { ui.openGroup = ui.openGroup === gi ? -1 : gi; render(); }
    else if (act === "togglePlot") { ui.openPlot[gi] = ui.openPlot[gi] === pi ? -1 : pi; render(); }
    else if (act === "addGroup") { state.groups.push(blankGroup(n)); ui.openGroup = state.groups.length - 1; ui.openPlot[ui.openGroup] = 0; save(); render(); }
    else if (act === "addPlot") {
      const g = state.groups[gi], prev = g.plots[g.plots.length - 1];
      g.plots.push(blankPlot(n, prev)); ui.openPlot[gi] = g.plots.length - 1; save(); render();
    }
    else if (act === "delPlot") {
      e.stopPropagation();
      if (!confirm("यह खेसरा पंक्ति हमेशा के लिए हट जाएगी। ठीक है?")) return;
      snapshot("खेसरा पंक्ति हटाने से पहले"); state.groups[gi].plots.splice(pi, 1); ui.openPlot[gi] = 0; save(); render();
    }
    else if (act === "delGroup") {
      e.stopPropagation();
      if (!confirm("रैयत " + (gi + 1) + " और उसकी सारी पंक्तियाँ हमेशा के लिए हट जाएँगी। ठीक है?")) return;
      snapshot("रैयत हटाने से पहले"); state.groups.splice(gi, 1); ui.openGroup = Math.min(ui.openGroup, state.groups.length - 1); ui.openPlot = {}; save(); render();
    }
    else if (act === "addSched") {
      state.schedules.push(blankSched()); state.groups.forEach((g) => g.plots.forEach((r) => r.sch.push(blankSch()))); save(); render();
    }
    else if (act === "delSched") {
      if (!confirm("अनुसूचि " + (s + 1) + " और उसका सारा डाटा हट जाएगा। ठीक है?")) return;
      snapshot("अनुसूचि हटाने से पहले"); state.schedules.splice(s, 1); state.groups.forEach((g) => g.plots.forEach((r) => r.sch.splice(s, 1))); ui.schTab = {}; save(); render();
    }
    else if (act === "pvToggle") { t.closest(".pv-page").classList.toggle("full"); fitPreview(); }
    else if (act === "download") download();
  });

  $("#btnNext").addEventListener("click", () => go(ui.step + 1));
  $("#btnBack").addEventListener("click", () => go(ui.step - 1));
  $("#btnDownload").addEventListener("click", download);
  $("#btnDemo").addEventListener("click", () => {
    const hasData = state.groups.some((g) => (g.name || "").trim() || g.plots.some(plotHasData)) || state.schedules.some((s) => (s.name || "").trim());
    if (hasData && !confirm("अभी भरा हुआ डाटा हटकर डेमो डाटा आ जाएगा। ठीक है?")) return;
    snapshot("डेमो भरने से पहले");
    state = demoState();
    ui.step = 3; ui.openGroup = 0; ui.openPlot = {}; ui.schTab = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    render(); window.scrollTo({ top: 0 }); toast("डेमो डाटा भर गया — नीचे नमूना देखें, फिर DOCX डाउनलोड करें।");
  });
  $("#btnNew").addEventListener("click", () => {
    if (!confirm("सभी अनुसूचियाँ और पंक्तियाँ साफ़ हो जाएँगी (गाँव / थाना विवरण बचा रहेगा)। नया फॉर्म शुरू करें?")) return;
    snapshot("नया फॉर्म शुरू करने से पहले");
    const hd = state.header;
    state = normalize(freshState()); state.header = hd;
    ui.step = 1; ui.openGroup = 0; ui.openPlot = {}; ui.schTab = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    render(); toast("नया फॉर्म तैयार है।");
  });

  /* ---------- पिछला डाटा (history): पिछले 20 तक, browser में सेव ---------- */
  const HKEY = "batwaraHistory_v1", HMAX = 20;
  // history में तभी रखें जब रैयत / खेसरा / अनुसूचि-नाम में कुछ भरा हो (सिर्फ़ गाँव का नाम नहीं)
  const stateHasData = (st) => st.groups.some((g) => (g.name || "").trim() || (g.rel_naam || "").trim() || g.plots.some(plotHasData)) ||
    st.schedules.some((s) => (s.name || "").trim());
  function histLoad() { try { const a = JSON.parse(localStorage.getItem(HKEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function histSave(list) {
    for (;;) {
      try { localStorage.setItem(HKEY, JSON.stringify(list)); return; }
      catch (e) { if (list.length <= 1) return; list.pop(); }   // जगह कम पड़े तो सबसे पुराना हटे
    }
  }
  function snapshot(reason) {
    if (!stateHasData(state)) return;
    const json = JSON.stringify(state), list = histLoad();
    if (list[0] && list[0].json === json) { list[0].ts = Date.now(); list[0].reason = reason; }
    else list.unshift({ id: Date.now() + "-" + Math.random().toString(36).slice(2, 6), ts: Date.now(), reason, json });
    histSave(list.slice(0, HMAX)); histCount();
  }
  function histCount() { const el = $("#histCount"); if (el) el.textContent = histLoad().length; }
  function histMeta(json) {
    try {
      const st = normalize(JSON.parse(json));
      const raiyat = st.groups.filter((g) => (g.name || "").trim() || g.plots.some(plotHasData));
      const rows = st.groups.reduce((n, g) => n + g.plots.filter(plotHasData).length, 0);
      return { title: raiyat.length ? raiyat.map((g) => (g.name || "").trim() || "नाम नहीं").slice(0, 2).join(", ") + (raiyat.length > 2 ? " +" + (raiyat.length - 2) : "") : "(रैयत नहीं भरे)",
        place: (st.header.mauja || "").trim(), line: raiyat.length + " रैयत · " + rows + " पंक्ति · " + st.schedules.length + " अनुसूचि" };
    } catch (e) { return { title: "(पढ़ा नहीं जा सका)", place: "", line: "" }; }
  }
  function histRender() {
    const list = histLoad(), box = $("#histList");
    if (!list.length) { box.innerHTML = '<div class="hist-empty">अभी कोई पिछला डाटा नहीं है।<br><small>जब आप नया फॉर्म शुरू करेंगे, कुछ हटाएँगे या DOCX डाउनलोड करेंगे, तब पहले का डाटा यहाँ आ जाएगा।</small></div>'; return; }
    box.innerHTML = list.map((it, i) => {
      const m = histMeta(it.json), d = new Date(it.ts);
      const when = d.toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" });
      return '<div class="hist-item"><div class="hist-n">' + (i + 1) + '</div><div class="hist-info"><b>' + h(m.title) + "</b>" +
        '<span>' + h(m.place ? m.place + " · " : "") + h(m.line) + '</span><small>' + h(when) + " · " + h(it.reason || "") + "</small></div>" +
        '<div class="hist-act"><button type="button" class="btn primary sm" data-hact="restore" data-id="' + h(it.id) + '">खोलें</button>' +
        '<button type="button" class="btn danger sm" data-hact="del" data-id="' + h(it.id) + '">हटाएँ</button></div></div>';
    }).join("");
  }
  function histOpen() { histRender(); $("#histModal").hidden = false; }
  function histClose() { $("#histModal").hidden = true; }
  $("#btnHist").addEventListener("click", histOpen);
  $("#histClose").addEventListener("click", histClose);
  $("#histModal").addEventListener("click", (e) => { if (e.target.id === "histModal") histClose(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") histClose(); });
  $("#histClear").addEventListener("click", () => {
    if (!histLoad().length || !confirm("सारा पिछला डाटा हमेशा के लिए हट जाएगा। ठीक है?")) return;
    histSave([]); histCount(); histRender();
  });
  $("#histList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hact]"); if (!b) return;
    const list = histLoad(), it = list.find((x) => x.id === b.dataset.id); if (!it) return;
    if (b.dataset.hact === "del") { histSave(list.filter((x) => x.id !== it.id)); histCount(); histRender(); return; }
    if (stateHasData(state) && !confirm("अभी का डाटा हट जाएगा (वो भी 'पिछला डाटा' में सेव रहेगा)। यह पिछला डाटा खोलें?")) return;
    snapshot("पिछला डाटा खोलने से पहले");
    try { state = normalize(JSON.parse(it.json)); } catch (err) { toast("यह डाटा खुल नहीं पाया", true); return; }
    ui.step = 3; ui.openGroup = 0; ui.openPlot = {}; ui.schTab = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) {}
    histClose(); render(); window.scrollTo({ top: 0 }); toast("पिछला डाटा खुल गया।");
  });

  /* ---------- डेमो डाटा (एक क्लिक में पूरा फॉर्म) ---------- */
  function demoState() {
    const names = ["विष्णु कुमार", "सोनू कुमार", "चंदन कुमार", "ओमकार ठाकुर", "रमेश प्रसाद"];
    const chau = { north: "आरी", north_ref: "233", south: "रास्ता", south_ref: "", east: "सोनू कुमार", east_ref: "236", west: "नहर", west_ref: "" };
    // shares: {अनुसूचि-क्रम: डेसीमल}
    const plot = (jam, khata, khesra, totalDec, shares, extra) => {
      const p = blankPlot(5);
      p.jamabandi = jam; p.khata = khata; p.khesra = khesra;
      const ac = Math.floor(totalDec / 100), dc = totalDec - ac * 100;
      p.k_ac = String(ac); p.k_dc = String(dc); p.n_ac = String(ac); p.n_dc = String(dc);
      Object.keys(shares).forEach((k) => {
        const d = shares[k], a = Math.floor(d / 100), c = d - a * 100;
        Object.assign(p.sch[k], { khata: khata, khesra: khesra, k_ac: String(a), k_dc: String(c), n_ac: String(a), n_dc: String(c) });
      });
      return Object.assign(p, extra || {});
    };
    const g1 = { name: "राजेश कुमार शर्मा", rel_type: "पिता", rel_naam: "रामस्वरूप ठाकुर", addr: "ग्राम बखरी, पो० बखरी, सीतामढ़ी", plots: [
      plot("1324", "56", "234", 120, { 0: 24, 1: 24, 2: 24, 3: 24, 4: 24 }),
      plot("1324", "56", "235", 60, { 0: 20, 1: 20, 2: 20 }),
      plot("1324", "56", "236", 50, { 3: 25, 4: 25 })
    ] };
    Object.assign(g1.plots[0].sch[0], chau, { min_janib: "पूरब" });
    Object.assign(g1.plots[1].sch[1], { north: "आरी", north_ref: "234", south: "सड़क" });
    const g2 = { name: "सुनीता देवी", rel_type: "पति", rel_naam: "अशोक साह", addr: "ग्राम बखरी, पो० बखरी, सीतामढ़ी", plots: [
      plot("1325", "57", "310", 100, { 0: 40, 1: 30, 3: 30 }),
      plot("1325", "57", "311", 25, { 4: 25 })
    ] };
    const g3 = { name: "मोहन यादव", rel_type: "पिता", rel_naam: "स्व० बालेश्वर यादव", addr: "ग्राम रीगा, पो० रीगा, सीतामढ़ी", plots: [
      plot("1330", "61", "405", 75, { 0: 15, 1: 15, 2: 15, 3: 15, 4: 15 }, { abhiyukti: "वारिसान" })
    ] };
    Object.assign(g3.plots[0].sch[2], chau);
    return normalize({
      header: { panchayat: "गणेशपुर", halka: "रीगा", mauja: "बखरी", thana_no: "251", anchal: "रीगा", police_thana: "रीगा", anumandal: "सीतामढ़ी सदर", rajasva_thana: "सीतामढ़ी सदर", jila: "सीतामढ़ी" },
      schedules: names.map((n, i) => ({ name: n, rel_type: "पिता", rel_naam: ["राम विलास राम", "गंगादेव राम", "बिफई राम", "स्व० शिवनाथ ठाकुर", "हरिनंदन प्रसाद"][i], jati: ["चमार", "चमार", "चमार", "ठाकुर", "तेली"][i], nivasi: "निज ग्राम" })), groups: [g1, g2, g3]
    });
  }

  /* ---------- DOCX download ---------- */
  async function download() {
    try {
      const r = await BatwaraDocx.build(JSZip, BATWARA_TEMPLATE_B64, state);
      const blob = await r.zip.generateAsync({
        type: "blob", compression: "DEFLATE",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "batwara_panchnama.docx";
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      snapshot("DOCX डाउनलोड के समय"); toast("DOCX तैयार — " + r.rowCount + " पंक्ति, " + r.schedCount + " अनुसूचि");
    } catch (err) { toast(err.message || "DOCX नहीं बन पाया", true); }
  }

  histCount();
  render();
})();

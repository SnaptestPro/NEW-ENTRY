/* ==========================================================
   बँटवारा पंचनामा — फॉर्म (DOCX के कॉलम 1-25 के अनुसार)
   डाटा ब्राउज़र के localStorage में अपने-आप सेव होता है
   ========================================================== */
(function () {
  "use strict";

  const KEY = "batwaraForm_v2";
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
  const blankRow = (n) => ({
    name: "", rel_type: "पिता", rel_naam: "", addr: "",
    jamabandi: "", khata: "", khesra: "", k_ac: "", k_dc: "", n_ac: "", n_dc: "",
    abhiyukti: "", sch: Array.from({ length: n }, blankSch)
  });
  const freshState = () => ({ header: {}, schedules: [{ name: "" }], rows: [blankRow(1)] });

  function normalize(st) {
    st.header = st.header || {};
    if (!Array.isArray(st.schedules) || !st.schedules.length) st.schedules = [{ name: "" }];
    if (!Array.isArray(st.rows) || !st.rows.length) st.rows = [blankRow(st.schedules.length)];
    st.rows.forEach((r) => {
      r.sch = Array.isArray(r.sch) ? r.sch : [];
      while (r.sch.length < st.schedules.length) r.sch.push(blankSch());
      r.sch.length = st.schedules.length;
    });
    return st;
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) {}
    return normalize(freshState());
  }

  let state = load();
  const ui = { step: 0, openRow: 0, schTab: {} };

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
  const rowHasData = (r) =>
    ["name", "rel_naam", "addr", "jamabandi", "khata", "khesra", "k_ac", "k_dc", "n_ac", "n_dc", "abhiyukti"].some((k) => String(r[k] || "").trim()) ||
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
    const items = state.schedules.map((s, i) =>
      '<div class="sch-item"><div class="sch-no">' + (i + 1) + "</div>" +
      fld("schedules." + i + ".name", "अनुसूचि (Schedule) सांख्या " + (i + 1) + " — बनाम् (हिस्सेदार का नाम)", { ph: "जैसे: रामलखन प्रसाद" }) +
      (state.schedules.length > 1 ? '<button type="button" class="btn danger sm" data-act="delSched" data-s="' + i + '">हटाएँ</button>' : "<span></span>") +
      "</div>").join("");
    return '<div class="card"><div class="card-h"><div><h2>अनुसूचियाँ (पक्षकार)</h2><div class="hint">हर हिस्सेदार की एक अनुसूचि। DOCX में हर पेज पर 3 अनुसूचि आती हैं; ज़्यादा होने पर अगला पेज अपने-आप बनेगा।</div></div>' +
      '<button type="button" class="btn soft" data-act="addSched">+ अनुसूचि जोड़ें</button></div>' +
      '<div class="card-b"><div class="sch-list">' + items + "</div></div></div>";
  }

  /* ---------- Step 3 : rows ---------- */
  function rowSummary(r, i) {
    const nm = (r.name || "").trim() || "नई पंक्ति";
    const meta = [r.jamabandi && "जमाबंदी " + r.jamabandi, r.khata && "खाता " + r.khata, r.khesra && "खेसरा " + r.khesra].filter(Boolean).join(" · ");
    return '<b>' + h(nm) + "</b><small>" + (h(meta) || "विवरण भरा नहीं गया") + "</small>";
  }
  function rowForm(r, i) {
    const P = "rows." + i + ".";
    const sIdx = Math.min(ui.schTab[i] || 0, state.schedules.length - 1);
    const SP = P + "sch." + sIdx + ".";
    const pills = state.schedules.map((s, k) =>
      '<button type="button" class="pill ' + (k === sIdx ? "on" : "") + '" data-act="schTab" data-i="' + i + '" data-s="' + k + '">अनुसूचि ' + (k + 1) + (s.name ? " — " + h(s.name) : "") + "</button>").join("");
    const dirs = [["उत्तर", "north"], ["दक्षिण", "south"], ["पूर्व", "east"], ["पश्चिम", "west"]];
    const chau = '<div class="chau"><span class="head"></span><span class="head">चौहद्दी (नाम)</span><span class="head">Ref. खेसरा सं॰</span>' +
      dirs.map((d) => '<span class="dir">' + d[0] + "</span>" +
        '<input type="text" data-p="' + SP + d[1] + '" value="' + h(getP(SP + d[1])) + '">' +
        '<input type="text" data-p="' + SP + d[1] + '_ref" value="' + h(getP(SP + d[1] + "_ref")) + '">').join("") + "</div>";

    return '<div class="row-body">' +
      '<div class="sec"><div class="sec-t">मौताबिक जमाबंदी एवं मौताबिक खतियान <small>कॉलम 1 – 6</small></div><div class="grid g4">' +
      fld(P + "name", "खतियानी रैयत का नाम", { sub: "कॉलम 1", cls: "span2", ph: "नाम" }) +
      '<div class="fld span2"><span>पिता / पति का नाम<i>कॉलम 1</i></span><div class="rel">' +
      '<select data-p="' + P + 'rel_type">' + ["पिता", "पति", "अभिभावक"].map((o) => "<option" + (r.rel_type === o ? " selected" : "") + ">" + o + "</option>").join("") + "</select>" +
      '<input type="text" data-p="' + P + 'rel_naam" value="' + h(r.rel_naam) + '"></div></div>' +
      fld(P + "addr", "पता", { sub: "कॉलम 1", cls: "span4", ph: "गाँव, पोस्ट…" }) +
      fld(P + "jamabandi", "जमाबंदी सांख्या", { sub: "कॉलम 2" }) +
      fld(P + "khata", "खाता सांख्या", { sub: "कॉलम 3" }) +
      fld(P + "khesra", "खेसरा सांख्या", { sub: "कॉलम 4" }) +
      "<div></div>" +
      rk(P + "k_ac", P + "k_dc", "खतियानी रकवा (ए० डी०) — कॉलम 5", "span2") +
      rk(P + "n_ac", P + "n_dc", "नक्शा रकवा (ए० डी०) — कॉलम 6", "span2") +
      "</div></div>" +

      '<div class="sec"><div class="sec-t">अनुसूचि-वार बँटवारा <small>कॉलम 7 – 24</small></div>' +
      '<div class="pills">' + pills + "</div>" +
      '<div class="grid g4">' +
      fld(SP + "khata", "खाता सांख्या", { sub: "अनुसूचि " + (sIdx + 1) }) +
      fld(SP + "khesra", "खेसरा सांख्या") +
      fld(SP + "min_janib", "मिन जानिब", { cls: "span2" }) +
      rk(SP + "k_ac", SP + "k_dc", "खतियानी रकवा (ए० डी०)", "span2") +
      rk(SP + "n_ac", SP + "n_dc", "नक्शा रकवा (ए० डी०)", "span2") +
      '<div class="span4"><div class="fld"><span>चौहद्दी</span></div>' + chau + "</div>" +
      "</div>" +
      '<div class="bal" data-bal="' + i + '">' + balHtml(r) + "</div></div>" +

      '<div class="sec"><div class="sec-t">अभियुक्ति <small>कॉलम 25</small></div><div class="grid g2">' +
      fld(P + "abhiyukti", "अभियुक्ति", { cls: "span2" }) + "</div></div></div>";
  }
  function panelRows() {
    const cards = state.rows.map((r, i) => {
      const open = ui.openRow === i, st = status(r);
      return '<div class="row-card ' + (open ? "open" : "") + '">' +
        '<div class="row-head" data-act="toggleRow" data-i="' + i + '"><div class="row-n">' + (i + 1) + "</div>" +
        '<div class="row-sum" data-sum="' + i + '">' + rowSummary(r, i) + "</div>" +
        '<span class="badge ' + st.cls + '" data-badge="' + i + '">' + st.txt + "</span>" +
        '<div class="row-actions">' +
        '<button type="button" class="btn ghost sm" data-act="copyRow" data-i="' + i + '" title="इस पंक्ति की कॉपी">⧉ <span>कॉपी</span></button>' +
        (state.rows.length > 1 ? '<button type="button" class="btn danger sm" data-act="delRow" data-i="' + i + '" title="हटाएँ">🗑 <span>हटाएँ</span></button>' : "") +
        "</div></div>" + (open ? rowForm(r, i) : "") + "</div>";
    }).join("");
    return '<div class="info">हर पंक्ति DOCX की एक पंक्ति है। पहले <b>कॉलम 1-6</b> (मौताबिक जमाबंदी एवं खतियान) भरें, फिर हर <b>अनुसूचि</b> का हिस्सा (कॉलम 7-24)। रकवा का जोड़ अपने-आप मिलाया जाता है।</div>' +
      cards + '<button type="button" class="add-row" data-act="addRow">+ नई पंक्ति जोड़ें</button>';
  }

  /* ---------- Step 4 : review ---------- */
  function panelReview() {
    const rows = state.rows.filter(rowHasData);
    const checks = [];
    const missing = HEADER_FIELDS.filter((f) => !String(state.header[f[0]] || "").trim()).map((f) => f[1]);
    checks.push(missing.length ? ["warn", "गाँव / थाना विवरण अधूरा: " + missing.join(", ")] : ["ok", "गाँव / थाना विवरण पूरा है।"]);
    const unnamed = state.schedules.map((s, i) => (String(s.name || "").trim() ? null : i + 1)).filter(Boolean);
    checks.push(unnamed.length ? ["warn", "इन अनुसूचियों में नाम (बनाम) नहीं भरा: " + unnamed.join(", ")] : ["ok", "सभी अनुसूचियों के नाम भरे हैं।"]);
    if (!rows.length) checks.push(["err", "अभी किसी पंक्ति में डाटा नहीं है — DOCX नहीं बन सकता।"]);
    else {
      let bad = 0;
      rows.forEach((r) => { const s = status(r); if (s.cls === "warn") { bad++; checks.push(["warn", "पंक्ति " + (state.rows.indexOf(r) + 1) + ": " + s.txt.replace("⚠ ", "")]); } });
      if (!bad) checks.push(["ok", "सभी पंक्तियों का रकवा मिलान सही है।"]);
    }
    const pages = Math.max(1, Math.ceil(rows.length / 5)) * Math.ceil(state.schedules.length / 3);
    const trs = rows.map((r) => {
      const s = status(r), k = toD(r.k_ac, r.k_dc), n = toD(r.n_ac, r.n_dc);
      return "<tr><td>" + (state.rows.indexOf(r) + 1) + "</td><td><b>" + h(r.name) + "</b><br><small>" + h(r.rel_naam ? r.rel_type + ": " + r.rel_naam : "") + "</small></td>" +
        "<td>" + h(r.jamabandi) + "</td><td>" + h(r.khata) + "</td><td>" + h(r.khesra) + "</td>" +
        "<td>" + (k == null ? "—" : fmtD(k)) + "</td><td>" + (n == null ? "—" : fmtD(n)) + '</td><td><span class="badge ' + s.cls + '">' + s.txt + "</span></td></tr>";
    }).join("");
    return '<div class="card"><div class="card-h"><div><h2>जाँच</h2><div class="hint">डाउनलोड से पहले एक बार मिलान देख लें (चेतावनी होने पर भी DOCX बन सकता है)।</div></div></div>' +
      '<div class="card-b"><ul class="checks">' + checks.map((c) => '<li class="' + c[0] + '"><span>' + (c[0] === "ok" ? "✓" : c[0] === "warn" ? "⚠" : "✕") + "</span><span>" + h(c[1]) + "</span></li>").join("") + "</ul></div></div>" +
      '<div class="card"><div class="card-h"><h2>पंक्तियों का सार</h2></div><div class="card-b tbl-wrap">' +
      (rows.length ? '<table class="tbl"><thead><tr><th>क्र.</th><th>रैयत</th><th>जमाबंदी</th><th>खाता</th><th>खेसरा</th><th>खतियानी रकवा</th><th>नक्शा रकवा</th><th>बँटवारा</th></tr></thead><tbody>' + trs + "</tbody></table>" : "<p>कोई पंक्ति नहीं।</p>") +
      "</div></div>" +
      '<div class="card"><div class="card-b dl-box"><div><h2 style="margin:0 0 4px;color:var(--navy)">DOCX तैयार करें</h2><p>' + rows.length + " पंक्ति · " + state.schedules.length + " अनुसूचि · लगभग " + pages + " पेज (A3 landscape)</p></div>" +
      '<button type="button" class="btn primary lg" data-act="download">⬇ DOCX डाउनलोड करें</button></div></div>';
  }

  /* ---------- render ---------- */
  function render() {
    document.body.dataset.step = ui.step;
    renderSteps();
    $("#panel").innerHTML = [panelHeader, panelSchedules, panelRows, panelReview][ui.step]();
  }
  function updateLive() {
    if (ui.step === 0) { const el = $("#hdrPreview"); if (el) el.innerHTML = headerPreview(); }
    if (ui.step === 2) {
      state.rows.forEach((r, i) => {
        const b = $('[data-badge="' + i + '"]'); if (b) { const s = status(r); b.className = "badge " + s.cls; b.textContent = s.txt; }
        const sm = $('[data-sum="' + i + '"]'); if (sm) sm.innerHTML = rowSummary(r, i);
        const bl = $('[data-bal="' + i + '"]'); if (bl) bl.innerHTML = balHtml(r);
      });
    }
  }
  function go(i) { ui.step = Math.max(0, Math.min(STEPS.length - 1, i)); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }

  /* ---------- events ---------- */
  document.addEventListener("input", (e) => {
    const p = e.target && e.target.dataset && e.target.dataset.p;
    if (!p) return;
    setP(p, e.target.value);
    save(); updateLive();
  });
  document.addEventListener("change", (e) => {
    const p = e.target && e.target.dataset && e.target.dataset.p;
    if (p && e.target.tagName === "SELECT") { setP(p, e.target.value); save(); }
  });

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act, i = Number(t.dataset.i), s = Number(t.dataset.s);
    if (act === "step") go(i);
    else if (act === "toggleRow") { ui.openRow = ui.openRow === i ? -1 : i; render(); }
    else if (act === "schTab") { ui.schTab[i] = s; render(); }
    else if (act === "addRow") { state.rows.push(blankRow(state.schedules.length)); ui.openRow = state.rows.length - 1; save(); render(); }
    else if (act === "copyRow") {
      e.stopPropagation();
      const c = JSON.parse(JSON.stringify(state.rows[i]));
      state.rows.splice(i + 1, 0, c); ui.openRow = i + 1; save(); render(); toast("पंक्ति की कॉपी बन गई।");
    }
    else if (act === "delRow") {
      e.stopPropagation();
      if (!confirm("पंक्ति " + (i + 1) + " हमेशा के लिए हट जाएगी। ठीक है?")) return;
      state.rows.splice(i, 1); ui.openRow = Math.min(ui.openRow, state.rows.length - 1); save(); render();
    }
    else if (act === "addSched") {
      state.schedules.push({ name: "" }); state.rows.forEach((r) => r.sch.push(blankSch())); save(); render();
    }
    else if (act === "delSched") {
      if (!confirm("अनुसूचि " + (s + 1) + " और उसका सारा डाटा हट जाएगा। ठीक है?")) return;
      state.schedules.splice(s, 1); state.rows.forEach((r) => r.sch.splice(s, 1)); ui.schTab = {}; save(); render();
    }
    else if (act === "download") download();
  });

  $("#btnNext").addEventListener("click", () => go(ui.step + 1));
  $("#btnBack").addEventListener("click", () => go(ui.step - 1));
  $("#btnDownload").addEventListener("click", download);
  $("#btnNew").addEventListener("click", () => {
    if (!confirm("सभी अनुसूचियाँ और पंक्तियाँ साफ़ हो जाएँगी (गाँव / थाना विवरण बचा रहेगा)। नया फॉर्म शुरू करें?")) return;
    const hd = state.header;
    state = normalize(freshState()); state.header = hd;
    ui.step = 1; ui.openRow = 0; ui.schTab = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    render(); toast("नया फॉर्म तैयार है।");
  });

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
      toast("DOCX तैयार — " + r.pageCount + " पेज");
    } catch (err) { toast(err.message || "DOCX नहीं बन पाया", true); }
  }

  render();
})();

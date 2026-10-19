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
    ["anumandal", "अनुमण्डल"], ["rajasva_thana", "राजस्व थाना"], ["jila", "जिला"], ["date", "दिनांक (शीर्षक के बगल में)"]
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
    abhi_img: null, sch: Array.from({ length: n }, blankSch)
  });
  // एक रैयत (नाम/पिता/पता एक ही बार) + उसकी कई खेसरा-पंक्तियाँ (plots)
  const blankGroup = (n) => ({ name: "", rel_type: "पिता", rel_naam: "", addr: "", plots: [blankPlot(n)] });
  const blankSched = () => ({ name: "", rel_type: "पिता", rel_naam: "", jati: "", nivasi: "निज ग्राम" });
  const freshState = () => ({ header: {}, schedules: [blankSched()], groups: [blankGroup(1)] });

  const OLD_DECL = "हम सभी फरीकैन आपस में सहमति से बखुदहा जमीन बँटवारा कर जोत आबाद कर रहे हैं। दिए शेड्यूल पर अंकित खाता एवं खेसरा एवं रकवा पर भविष्य में एक दूसरे की हिस्से की भूमि पर फरीकैन या उनके वंशज दावा नहीं करेंगे। अगर किसी के द्वारा किसी प्रकार का दावा प्रस्तुत किया जाता है तो वह मान्य नहीं होगा। इस पर हम दोनों फरीकैन को मंजूर है और अपना हस्ताक्षर किया हूँ।";
  const DEFAULT_DECL = "हम सभी फरीकैन आपस में सहमति से बखुदहा जमीन बँटवारा कर जोत आबाद कर रहे हैं। दिए शेड्यूल पर अंकित खाता एवं खेसरा एवं रकवा पर भविष्य में एक दूसरे की हिस्से की भूमि पर फरीकैन या उनके वंशज दावा नहीं करेंगे। अगर किसी के द्वारा किसी प्रकार का दावा प्रस्तुत किया जाता है तो वह मान्य नहीं होगा। इस पर हम {संख्या} फरीकैन को मंजूर है और अपना हस्ताक्षर किया हूँ।";
  const DEFAULT_SIGN = "गवाह - 1\nगवाह - 2";
  const SIGN_DROP = /राजस्व\s*(कर्मचारी|अधिकारी)|अंचल\s*अधिकारी|^पक्षकार\s*के\s*हस्ताक्षर/;
  function normalize(st) {
    st.header = st.header || {};
    st.opts = Object.assign({ pageNo: true, border: true, partySign: true, sign: false, totalRow: false, paper: "auto", signLabels: DEFAULT_SIGN, decl: true, declText: DEFAULT_DECL, declFoot: "गवाह का हस्त०", partyWord: "auto", rowsPerPage: 12, design: "colorful" }, st.opts || {});
    if (st.opts.declText === OLD_DECL) st.opts.declText = DEFAULT_DECL;   // पुराना डिफ़ॉल्ट पाठ → नया (जिसमें संख्या बदली जा सकती है)
    st.opts.signLabels = String(st.opts.signLabels == null ? DEFAULT_SIGN : st.opts.signLabels).split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !SIGN_DROP.test(x)).join("\n");
    if (st.opts.partyWord == null || String(st.opts.partyWord).trim() === "") st.opts.partyWord = "auto";
    if (!Array.isArray(st.schedules) || !st.schedules.length) st.schedules = [blankSched()];
    st.schedules.forEach((x) => { if (x.rel_type == null) x.rel_type = "पिता"; ["rel_naam", "jati", "nivasi"].forEach((k) => { if (x[k] == null) x[k] = ""; }); });
    if (!Array.isArray(st.groups) || !st.groups.length) st.groups = [blankGroup(st.schedules.length)];
    st.groups.forEach((g) => {
      if (!Array.isArray(g.plots) || !g.plots.length) g.plots = [blankPlot(st.schedules.length)];
      g.plots.forEach((r) => {
        r.sch = Array.isArray(r.sch) ? r.sch : [];
        while (r.sch.length < st.schedules.length) r.sch.push(blankSch());
        r.sch.length = st.schedules.length;
        r.sch.forEach((x) => { if (!String(x.khata || "").trim() && r.khata) x.khata = r.khata; if (!String(x.khesra || "").trim() && r.khesra) x.khesra = r.khesra; });
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
      const plot = { jamabandi: r.jamabandi, khata: r.khata, khesra: r.khesra, k_ac: r.k_ac, k_dc: r.k_dc, n_ac: r.n_ac, n_dc: r.n_dc, sch: r.sch };
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
  const ui = { step: 0, openGroup: 0, openPlot: {}, schTab: {}, pick: {}, origs: {} };

  let saveTimer = null;
  function save() {
    const el = $("#saveState");
    el.textContent = "● सेव हो रहा है…"; el.classList.add("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); el.textContent = "● स्वतः सेव हो गया"; caseTouch(); }
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
    ["jamabandi", "khata", "khesra", "k_ac", "k_dc", "n_ac", "n_dc"].some((k) => String(r[k] || "").trim()) || !!(r.abhi_img && r.abhi_img.d) ||
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
      HEADER_FIELDS.map((f) => fld("header." + f[0], f[1], f[0] === "date" ? { ph: "जैसे: 19/10/2026 (खाली छोड़ें तो ……… छपेगा)" } : {})).join("") +
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
  function pickOf(gi, pi) {
    const key = gi + "-" + pi, n = state.schedules.length;
    if (!ui.pick[key] || ui.pick[key].length !== n) {
      const sch = state.groups[gi].plots[pi].sch;
      const has = sch.map((x) => ["k_ac", "k_dc", "n_ac", "n_dc"].some((q) => String(x[q] || "").trim()));
      ui.pick[key] = has.some(Boolean) ? has : sch.map(() => true);
    }
    return ui.pick[key];
  }
  // दशमलव (डिसमिल) → रकवा के दो हिस्से
  const splitDec = (v) => { v = Math.max(0, Math.round(v * 100) / 100); const a = Math.floor(v / 100 + 1e-9); return { ac: String(a), dc: String(Math.round((v - a * 100) * 100) / 100) }; };
  function setShare(plot, k, kv, nv) {
    const x = plot.sch[k];
    if (kv != null) { const s = splitDec(kv); x.k_ac = s.ac; x.k_dc = s.dc; }
    if (nv != null) { const s = splitDec(nv); x.n_ac = s.ac; x.n_dc = s.dc; }
    if (!String(x.khata || "").trim()) x.khata = plot.khata || "";
    if (!String(x.khesra || "").trim()) x.khesra = plot.khesra || "";
  }
  function clearShare(plot, k) { const x = plot.sch[k]; x.k_ac = x.k_dc = x.n_ac = x.n_dc = ""; }
  function splitEqual(gi, pi) {
    const plot = state.groups[gi].plots[pi], pk = pickOf(gi, pi), idx = pk.map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
    const kT = toD(plot.k_ac, plot.k_dc), nT = toD(plot.n_ac, plot.n_dc);
    if (!idx.length) { toast("पहले उन अनुसूचियों पर ✓ लगाएँ जिनमें हिस्सा है।", true); return; }
    if (kT == null && nT == null) { toast("पहले ऊपर कुल रकवा (खतियानी/नक्शा) भरें।", true); return; }
    const part = (T) => { if (T == null) return null; const cents = Math.round(T * 100), base = Math.floor(cents / idx.length), rem = cents - base * idx.length; return idx.map((_, i) => (base + (i < rem ? 1 : 0)) / 100); };
    const kp = part(kT), np = part(nT);
    plot.sch.forEach((_, k) => { const at = idx.indexOf(k); if (at < 0) clearShare(plot, k); else setShare(plot, k, kp ? kp[at] : null, np ? np[at] : null); });
    save(); render(); toast("रकवा " + idx.length + " अनुसूचि में बराबर बँट गया।");
  }
  function fillRest(gi, pi, k) {
    const plot = state.groups[gi].plots[pi], kT = toD(plot.k_ac, plot.k_dc), nT = toD(plot.n_ac, plot.n_dc);
    if (kT == null && nT == null) { toast("पहले ऊपर कुल रकवा भरें।", true); return; }
    let kO = 0, nO = 0;
    plot.sch.forEach((x, q) => { if (q === k) return; kO += toD(x.k_ac, x.k_dc) || 0; nO += toD(x.n_ac, x.n_dc) || 0; });
    setShare(plot, k, kT == null ? null : Math.max(0, kT - kO), nT == null ? null : Math.max(0, nT - nO));
    pickOf(gi, pi)[k] = true;
    save(); render(); toast("बाकी रकवा अनुसूचि " + (k + 1) + " में डाल दिया।");
  }
  function schCard(gi, pi, k) {
    const SP = "groups." + gi + ".plots." + pi + ".sch." + k + ".";
    const sc = state.schedules[k], x = state.groups[gi].plots[pi].sch[k];
    const has = Object.keys(x).some((q) => String(x[q] || "").trim());
    const dirs = [["उत्तर", "north"], ["दक्षिण", "south"], ["पूर्व", "east"], ["पश्चिम", "west"]];
    const chau = '<div class="chau">' + dirs.map((d) => '<span class="dir">' + d[0] + "</span>" +
      '<input type="text" placeholder="नाम" data-p="' + SP + d[1] + '" value="' + h(getP(SP + d[1])) + '">' +
      '<input type="text" placeholder="खेसरा" data-p="' + SP + d[1] + '_ref" value="' + h(getP(SP + d[1] + "_ref")) + '">').join("") + "</div>";
    const pk = pickOf(gi, pi);
    return '<div class="sch-card c' + (k % 5) + (has ? " filled" : "") + '"><div class="sch-card-h"><b>' + (k + 1) + "</b><span>" + (h(sc.name) || "अनुसूचि " + (k + 1)) + "</span>" +
      '<label class="pick" title="इस खेसरा में इस अनुसूचि का हिस्सा है"><input type="checkbox" data-pick="' + gi + "-" + pi + "-" + k + '"' + (pk[k] ? " checked" : "") + "> हिस्सा</label></div>" +
      '<div class="sch-card-b"><div class="mini2">' +
      fld(SP + "khata", "खाता") + fld(SP + "khesra", "खेसरा") + "</div>" +
      rk(SP + "k_ac", SP + "k_dc", "खतियानी रकवा", "sm") + rk(SP + "n_ac", SP + "n_dc", "नक्शा रकवा", "sm") +
      fld(SP + "min_janib", "मिन जानिब") +
      '<button type="button" class="btn soft sm rest" data-act="restFill" data-g="' + gi + '" data-p="' + pi + '" data-s="' + k + '">⤵ बाकी रकवा इसे दो</button>' +
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
      '<div class="split-bar"><span>जिन अनुसूचियों में हिस्सा है उन पर ✓ लगाएँ, फिर →</span><button type="button" class="btn primary sm" data-act="splitEq" data-g="' + gi + '" data-p="' + pi + '">⚖ कुल रकवा बराबर बाँटो</button></div>' +
      '<div class="sch-grid">' + state.schedules.map((_, k) => schCard(gi, pi, k)).join("") + "</div>" +
      '<div class="bal" data-bal="' + key + '">' + balHtml(r) + "</div></div>" +
      '<div class="sec"><div class="sec-t">अभियुक्ति — प्लॉट का स्केच <small>नक्शे की फोटो डालें — सिर्फ़ चुना हुआ प्लॉट अलग होकर, हिस्सों में बँटा साफ़ स्केच अपने-आप बनेगा</small></div>' +
      '<div class="abhi-up">' + (r.abhi_img && r.abhi_img.d ? '<img class="abhi-thumb" alt="अभियुक्ति" src="' + r.abhi_img.d + '">' : '<div class="abhi-empty">अभी स्केच नहीं लगा</div>') +
      '<div class="abhi-btns"><label class="btn primary sm">✨ नक्शे की फोटो चुनें (ऑटो स्केच)<input type="file" accept="image/*" hidden data-abhi="' + gi + "-" + pi + '" data-mode="auto"></label>' +
      (ui.origs[key] ? '<button type="button" class="btn soft sm" data-act="sketchEdit" data-g="' + gi + '" data-p="' + pi + '">✎ स्केच बदलें</button>' : "") +
      '<label class="btn soft sm" title="फोटो जैसी है वैसी ही लगेगी">🖼 सादी फोटो (बिना बदलाव)<input type="file" accept="image/*" hidden data-abhi="' + gi + "-" + pi + '" data-mode="raw"></label>' +
      (r.abhi_img && r.abhi_img.d ? '<button type="button" class="btn danger sm" data-act="abhiDel" data-g="' + gi + '" data-p="' + pi + '">हटाएँ</button>' : "") + "</div></div></div></div>";
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

  /* ---------- Step 4 : डिज़ाइन चुनना ---------- */
  function designCard() {
    const th = BatwaraDocx.themes, cur = state.opts.design || "colorful";
    const card = (id) => {
      const T = th[id], on = id === cur;
      const hdr = T.blocks.slice(0, 3).map((b) => '<i style="background:#' + b[0] + '"></i>').join("");
      return '<button type="button" class="dz' + (on ? " on" : "") + '" data-act="design" data-v="' + id + '">' +
        '<div class="dz-page" style="border-color:#' + T.boxBorder + '"><div class="dz-title" style="color:#' + T.title + ";" + (T.rule ? "border-bottom:2px solid #" + T.rule : "border-bottom:1px solid #999") + '">पंचनामा बँटवारा</div>' +
        '<div class="dz-info" style="background:#' + T.infoFill + ';border-color:#' + T.boxBorder + '"></div>' +
        '<div class="dz-hdr"><i style="background:#' + T.left[0] + '"></i>' + hdr + "</div>" +
        '<div class="dz-sub"><i style="background:#' + T.left[1] + '"></i>' + T.blocks.slice(0, 3).map((b) => '<i style="background:#' + b[1] + '"></i>').join("") + "</div>" +
        '<div class="dz-row"></div><div class="dz-row" style="' + (T.zebra ? "background:#" + T.zebra : "") + '"></div><div class="dz-row"></div></div>' +
        '<b>' + h(T.label) + "</b><small>" + h(T.note) + "</small>" + (on ? '<em>✓ चुना हुआ</em>' : "") + "</button>";
    };
    return '<div class="card"><div class="card-h"><div><h2>डिज़ाइन चुनें</h2><div class="hint">DOCX, PDF और नीचे के नमूने — तीनों में यही डिज़ाइन आएगा।</div></div></div><div class="card-b"><div class="dz-grid">' +
      Object.keys(th).map(card).join("") + "</div></div></div>";
  }

  /* ---------- Step 4 : सेटिंग + कुल जोड़ ---------- */
  function partyBox(o) {
    const n = state.schedules.length;
    const cur = o.partyWord || "auto";
    const chips = [["auto", "अपने-आप (" + (BatwaraDocx.partyWordFor({ partyWord: "auto" }, n) || "खाली") + ")"], ["-", "कुछ नहीं"], ["दोनों", "दोनों"], ["तीनों", "तीनों"], ["चारों", "चारों"], ["पाँचों", "पाँचों"], ["सभी", "सभी"]];
    const isPreset = chips.some((c) => c[0] === cur);
    const word = BatwaraDocx.partyWordFor(o, n);
    return '<div class="party-box"><div class="party-t">"इस पर हम <b>' + h(word || "…") + '</b> फरीकैन को मंजूर है" — यहाँ क्या लिखें?</div>' +
      '<div class="chips">' + chips.map((c) => '<button type="button" class="chip' + (cur === c[0] ? " on" : "") + '" data-act="partyWord" data-v="' + h(c[0]) + '">' + h(c[1]) + "</button>").join("") + "</div>" +
      '<div class="fld" style="margin-top:8px"><span>या अपना शब्द लिखें (जैसे: चारों, सभी पाँचों)</span><input type="text" data-p="opts.partyWord" value="' + (isPreset ? "" : h(cur)) + '" placeholder="अपना शब्द"></div>' +
      '<div class="hint">पाठ में <b>{संख्या}</b> की जगह यही शब्द छपता है। "अपने-आप" में अनुसूचि की गिनती (अभी ' + n + ') से तय होता है।</div></div>';
  }
  function optionsCard() {
    const o = state.opts;
    const fixed = { A4: 2, A3: 3, Legal: 2 }[o.paper];
    return '<div class="card"><div class="card-h"><div><h2>DOCX / PDF सेटिंग</h2><div class="hint">ये सेटिंग DOCX और PDF दोनों पर लागू होती हैं।</div></div></div><div class="card-b">' +
      '<div class="opt-grid">' +
      '<label class="chk"><input type="checkbox" data-chk="opts.pageNo"' + (o.pageNo ? " checked" : "") + '> पृष्ठ संख्या (नीचे "पृष्ठ 1 / 2")</label>' +
      '<label class="chk"><input type="checkbox" data-chk="opts.totalRow"' + (o.totalRow ? " checked" : "") + '> अंत में <b>कुल जोड़</b> की पंक्ति</label>' +
      '<label class="chk"><input type="checkbox" data-chk="opts.decl"' + (o.decl ? " checked" : "") + '> <b>घोषणा पाठ</b> ("हम सभी फरीकैन…") + गवाह की लाइन</label>' +
      '<label class="chk"><input type="checkbox" data-chk="opts.border"' + (o.border ? " checked" : "") + '> <b>बॉर्डर</b> — हर पेज के चारों तरफ़</label>' +
      '<label class="chk"><input type="checkbox" data-chk="opts.partySign"' + (o.partySign ? " checked" : "") + '> <b>पक्षकार का हस्ताक्षर</b> — हर अनुसूचि के नीचे अलग-अलग</label>' +
      '<label class="chk"><input type="checkbox" data-chk="opts.sign"' + (o.sign ? " checked" : "") + '> <b>गवाह आदि</b> के हस्ताक्षर के खाने (अंतिम पेज पर)</label>' +
      '<div class="fld"><span>कागज़ का साइज़ (लैंडस्केप)</span><select data-p="opts.paper">' +
      [["auto", "अपने-आप (कॉलम के हिसाब से)"], ["A4", "A4"], ["A3", "A3"], ["Legal", "Legal"]].map((x) => '<option value="' + x[0] + '"' + (o.paper === x[0] ? " selected" : "") + ">" + x[1] + "</option>").join("") + "</select></div>" +
      '<div class="fld"><span>एक पेज में लगभग कितनी खेसरा पंक्तियाँ</span><input type="number" min="3" max="60" data-p="opts.rowsPerPage" value="' + h(o.rowsPerPage) + '"' + (o.paper !== "auto" ? " disabled" : "") + '></div></div>' +
      (o.paper === "auto" ? '<div class="note ok">पेज की ऊँचाई-चौड़ाई <b>अपने-आप</b> इतनी बनती है कि लगभग <b>' + (o.rowsPerPage || 12) + '</b> पंक्तियाँ एक पेज में आएँ।</div>' : "") +
      (fixed ? '<div class="note">इस साइज़ पर एक पेज में अधिकतम <b>' + fixed + '</b> अनुसूचि आएँगी; ज़्यादा हों तो अगला पेज बनेगा।</div>' : "") +
      (o.decl ? partyBox(o) : "") +
      (o.decl ? '<div class="fld" style="margin-top:12px"><span>घोषणा पाठ — table के नीचे छपेगा (हर लाइन एक अनुच्छेद; चाहें तो बदल लें)</span><textarea data-p="opts.declText" rows="6">' + h(o.declText) + '</textarea></div><div class="fld" style="margin-top:10px"><span>पाठ के नीचे दाईं तरफ़ की लाइन (खाली छोड़ने पर नहीं छपेगी)</span><input type="text" data-p="opts.declFoot" value="' + h(o.declFoot) + '"></div>' : "") +
      (o.sign ? '<div class="fld" style="margin-top:12px"><span>गवाह आदि के खाने — हर लाइन में एक नाम (अधिकतम 6)</span><textarea data-p="opts.signLabels" rows="5">' + h(o.signLabels) + "</textarea></div>" : "") +
      "</div></div>";
  }
  function totalsCard(flat) {
    if (!flat.length) return "";
    let kAll = 0, nAll = 0, kS = 0, nS = 0;
    const per = state.schedules.map(() => ({ k: 0, n: 0 }));
    const byG = {};
    flat.forEach((x) => {
      const k = toD(x.p.k_ac, x.p.k_dc) || 0, n = toD(x.p.n_ac, x.p.n_dc) || 0;
      kAll += k; nAll += n;
      const g = byG[x.gi] || (byG[x.gi] = { name: (x.g.name || "").trim() || "नाम नहीं", k: 0, n: 0, ks: 0, ns: 0 });
      g.k += k; g.n += n;
      x.p.sch.forEach((s, q) => { const a = toD(s.k_ac, s.k_dc) || 0, b = toD(s.n_ac, s.n_dc) || 0; per[q].k += a; per[q].n += b; kS += a; nS += b; g.ks += a; g.ns += b; });
    });
    const diff = (a, b) => Math.abs(a - b) < 0.005 ? '<span class="okc">✓ बराबर</span>' : '<span class="badc">' + (a > b ? "बाकी " + fmtD(a - b) : "अधिक " + fmtD(b - a)) + "</span>";
    const gRows = Object.keys(byG).map((i) => { const g = byG[i]; return "<tr><td>" + h(g.name) + "</td><td>" + fmtD(g.k) + "</td><td>" + fmtD(g.ks) + "</td><td>" + diff(g.k, g.ks) + "</td><td>" + fmtD(g.n) + "</td><td>" + fmtD(g.ns) + "</td><td>" + diff(g.n, g.ns) + "</td></tr>"; }).join("");
    const sRows = state.schedules.map((s, q) => "<tr><td>" + (q + 1) + ". " + h((s.name || "").trim() || "नाम नहीं") + "</td><td>" + fmtD(per[q].k) + "</td><td>" + fmtD(per[q].n) + "</td></tr>").join("");
    return '<div class="card"><div class="card-h"><div><h2>कुल जोड़ की जाँच</h2><div class="hint">रकवा = एकड़-डिसमिल</div></div></div><div class="card-b tbl-wrap">' +
      '<table class="tbl"><thead><tr><th>रैयत</th><th>खतियानी कुल</th><th>बँटा</th><th>मिलान</th><th>नक्शा कुल</th><th>बँटा</th><th>मिलान</th></tr></thead><tbody>' + gRows +
      '<tr class="tot"><td>कुल</td><td>' + fmtD(kAll) + "</td><td>" + fmtD(kS) + "</td><td>" + diff(kAll, kS) + "</td><td>" + fmtD(nAll) + "</td><td>" + fmtD(nS) + "</td><td>" + diff(nAll, nS) + "</td></tr></tbody></table>" +
      '<table class="tbl" style="margin-top:14px"><thead><tr><th>अनुसूचि (हिस्सेदार)</th><th>कुल खतियानी रकवा</th><th>कुल नक्शा रकवा</th></tr></thead><tbody>' + sRows + "</tbody></table></div></div>";
  }

  /* ---------- Step 4 : review ---------- */
  function panelReview() {
    const flat = [];
    state.groups.forEach((g, gi) => g.plots.forEach((p, pi) => { if (plotHasData(p)) flat.push({ g, gi, p, pi }); }));
    const checks = [];
    const missing = HEADER_FIELDS.filter((f) => f[0] !== "date" && !String(state.header[f[0]] || "").trim()).map((f) => f[1]);
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
      designCard() + optionsCard() + totalsCard(flat) +
      '<div class="card"><div class="card-b dl-box"><div><h2 style="margin:0 0 4px;color:var(--navy)">DOCX तैयार करें</h2><p>' + flat.length + " पंक्ति · " + state.schedules.length + " अनुसूचि · " + pages + " पेज (एक पेज पर अधिकतम 5 अनुसूचि, पेज का साइज़ अपने-आप)</p></div>" +
      '<div class="dl-btns"><button type="button" class="btn primary lg" data-act="download">⬇ DOCX डाउनलोड करें</button><button type="button" class="btn soft lg" data-act="pdf">🖨 PDF / प्रिंट</button></div></div></div>';
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

  /* ---------- ऑटो स्केच: नक्शे की फोटो → सिर्फ़ चुना हुआ प्लॉट, हिस्सों में बँटा (plotsketch.js) ---------- */
  const sk = { gi: 0, pi: 0, key: "", cv: null, img: null, seed: null, tol: 34, dir: "auto", rev: false, picks: [], fill: false, det: null, lay: null, built: false };
  function skAnalysisCanvas(im) {
    const MAXD = 640, k = Math.min(1, MAXD / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * k)), hh = Math.max(1, Math.round(im.naturalHeight * k));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
    const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, w, hh); cx.drawImage(im, 0, 0, w, hh);
    return cv;
  }
  function loadSketchImage(file, gi, pi) {
    if (!file || !/^image\//.test(file.type)) { toast("सिर्फ़ फोटो (image) चुनें।", true); return; }
    const rd = new FileReader();
    rd.onerror = () => toast("फोटो पढ़ी नहीं जा सकी।", true);
    rd.onload = () => {
      const im = new Image();
      im.onerror = () => toast("यह फोटो खुल नहीं पाई।", true);
      im.onload = () => { ui.origs[gi + "-" + pi] = skAnalysisCanvas(im); sk.seed = null; sk.built = false; openSketch(gi, pi, true); };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
  // फॉर्म से अपने-आप: खेसरा नं॰, कुल रकवा, कौन-कौन से हिस्से, किसका कितना रकवा
  function skData() {
    const plot = state.groups[sk.gi].plots[sk.pi], kT = toD(plot.k_ac, plot.k_dc), nT = toD(plot.n_ac, plot.n_dc);
    // बँटवारा नक्शा रकवा के हिसाब से; नक्शा रकवा बिल्कुल न भरा हो तभी खतियानी (fallback)
    const basis = nT != null ? "n" : kT != null ? "k" : null, total = basis === "n" ? nT : basis === "k" ? kT : null;
    const items = state.schedules.map((sc, k) => {
      const x = plot.sch[k], share = basis === "n" ? toD(x.n_ac, x.n_dc) : basis === "k" ? toD(x.k_ac, x.k_dc) : null;
      const nm = (sc.name || "").trim();
      return { k, name: nm, short: nm ? nm.split(/\s+/)[0].slice(0, 12) : "अनुसूचि", share: share > 0 ? share : null };
    });
    return { plot, kT, nT, basis, total, items };
  }
  function skParts(D) {
    const sel = D.items.filter((it) => sk.picks[it.k]);
    const entered = sel.filter((s) => s.share), empty = sel.filter((s) => !s.share);
    const eSum = entered.reduce((a, s) => a + s.share, 0);
    const remain = D.total != null ? Math.max(0, D.total - eSum) : null;
    const fallback = entered.length ? Math.min.apply(null, entered.map((e) => e.share)) : 1;
    const w = sel.map((s) => (s.share ? s.share : remain != null && remain > 0 ? remain / empty.length : fallback));
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    return { sel, w, sum, area: sel.map((s, i) => (s.share ? s.share : D.total != null ? (w[i] / sum) * D.total : null)) };
  }
  function skEnsureModal() {
    if ($("#skModal")) return;
    const m = document.createElement("div"); m.id = "skModal"; m.className = "modal"; m.hidden = true;
    m.innerHTML = '<div class="modal-box sk-box" role="dialog" aria-label="प्लॉट स्केच">' +
      '<div class="modal-h"><div><h2>✨ प्लॉट स्केच (ऑटो)</h2><p>नक्शे से सिर्फ़ चुना हुआ प्लॉट अलग होता है; खेसरा नं॰, रकवा और हिस्से फॉर्म से अपने-आप आते हैं।</p></div><button type="button" class="btn ghost sm" id="skClose">✕ बंद</button></div>' +
      '<div class="modal-b sk-b"><div id="skInfo" class="sk-info"></div><div id="skMsg"></div>' +
      '<div class="sk-views"><div class="sk-v"><div class="sk-cap">1. आपकी फोटो — गलत प्लॉट चुना हो तो <b>सही प्लॉट के अंदर टैप करें</b></div><div class="sk-wrap"><canvas id="skSrc"></canvas></div></div>' +
      '<div class="sk-v"><div class="sk-cap">2. बना हुआ स्केच (सिर्फ़ यही अभियुक्ति में लगेगा)</div><div class="sk-wrap"><canvas id="skOut"></canvas></div></div></div>' +
      '<div class="sk-ctl"><div class="fld"><span>कितने हिस्सों में बँटेगा <i>(✓ वाली अनुसूचियाँ)</i></span><div id="skPicks" class="sk-picks"></div></div>' +
      '<div class="sk-row"><div class="fld"><span>बँटवारे की रेखाएँ</span><select id="skDir"><option value="auto">अपने-आप (लंबाई के हिसाब से)</option><option value="v">खड़ी रेखाएँ (Vertical)</option><option value="h">आड़ी रेखाएँ (Horizontal)</option><option value="long">प्लॉट की लंबाई के साथ (तिरछी)</option></select></div>' +
      '<div class="fld"><span>रंग की सहनशीलता <i id="skTolV"></i></span><input type="range" id="skTol" min="12" max="80" step="2"></div></div>' +
      '<label class="chk"><input type="checkbox" id="skRev"> हिस्सों का क्रम उलटा करें (दाएँ↔बाएँ / ऊपर↔नीचे)</label>' +
      '<label class="chk"><input type="checkbox" id="skFill"> जिन हिस्सों का रकवा खाली है, उनमें अनुपात से रकवा फॉर्म में भी भर दो</label></div>' +
      '<div class="sk-note">रेखाएँ <b>नक्शा रकवा</b> के अनुपात में खींची जाती हैं (नक्शा रकवा खाली हो तभी खतियानी)। यह अनुमानित नक्शा है, असली नाप (अमीन की नापी) नहीं — बराबर रकवा का दावा नहीं।</div></div>' +
      '<div class="modal-f split"><button type="button" class="btn soft sm" id="skAuto">↺ स्वतः पहचान</button><span><button type="button" class="btn ghost sm" id="skCancel">रद्द</button> <button type="button" class="btn primary" id="skApply">✓ यह स्केच लगाओ</button></span></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", (e) => { if (e.target.id === "skModal" || e.target.id === "skClose" || e.target.id === "skCancel") skClose(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !m.hidden) skClose(); });
    $("#skApply").addEventListener("click", skApply);
    $("#skAuto").addEventListener("click", () => { sk.seed = null; skRefresh(true); });
    $("#skDir").addEventListener("change", (e) => { sk.dir = e.target.value; skRefresh(false); });
    $("#skRev").addEventListener("change", (e) => { sk.rev = e.target.checked; skRefresh(false); });
    $("#skFill").addEventListener("change", (e) => { sk.fill = e.target.checked; });
    let tt; $("#skTol").addEventListener("input", (e) => { sk.tol = Number(e.target.value); $("#skTolV").textContent = sk.tol; clearTimeout(tt); tt = setTimeout(() => skRefresh(true), 160); });
    $("#skPicks").addEventListener("change", (e) => { const k = e.target.dataset && e.target.dataset.skpick; if (k != null) { sk.picks[Number(k)] = e.target.checked; skRefresh(false); } });
    $("#skSrc").addEventListener("click", (e) => {
      const c = e.currentTarget, r = c.getBoundingClientRect();
      sk.seed = { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height };
      skRefresh(true);
    });
  }
  function skClose() { const m = $("#skModal"); if (m) m.hidden = true; }
  function openSketch(gi, pi, fresh) {
    const key = gi + "-" + pi, cv = ui.origs[key];
    if (!cv) { toast("पहले नक्शे की फोटो चुनें (यह फोटो इस सेशन में याद नहीं रही)।", true); return; }
    if (!window.PlotSketch) { toast("स्केच मॉड्यूल लोड नहीं हुआ।", true); return; }
    skEnsureModal();
    sk.gi = gi; sk.pi = pi; sk.key = key; sk.cv = cv;
    sk.img = { w: cv.width, h: cv.height, data: cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data };
    const plot = state.groups[gi].plots[pi], cfg = !fresh && plot.abhi_cfg ? plot.abhi_cfg : null;
    // हिस्से: पहले से सेव हो तो वही; वरना जिनमें रकवा भरा है वे — और अगर कुल रकवा अभी बाकी है तो सारी अनुसूचियाँ (बाकी रकवा खाली वालों में बँटेगा)
    const D0 = skData(), eSum = D0.items.reduce((a, it) => a + (it.share || 0), 0);
    const restLeft = D0.total != null && D0.total - eSum > 0.005 && D0.items.some((it) => !it.share);
    sk.picks = cfg && Array.isArray(cfg.picks) && cfg.picks.length === state.schedules.length ? cfg.picks.slice() : restLeft ? state.schedules.map(() => true) : pickOf(gi, pi).slice();
    sk.dir = cfg ? cfg.dir || "auto" : "auto"; sk.rev = !!(cfg && cfg.rev); sk.tol = cfg && cfg.tol ? cfg.tol : 34; sk.fill = false;
    sk.seed = cfg && cfg.seed ? { x: cfg.seed.fx * cv.width, y: cfg.seed.fy * cv.height } : (fresh ? null : sk.seed);
    $("#skDir").value = sk.dir; $("#skRev").checked = sk.rev; $("#skFill").checked = false; $("#skTol").value = sk.tol; $("#skTolV").textContent = sk.tol;
    $("#skModal").hidden = false;
    skRefresh(true);
  }
  function skRefresh(redetect) {
    const D = skData(), P = skParts(D), msg = $("#skMsg"), src = $("#skSrc"), out = $("#skOut");
    // जानकारी (अपने-आप)
    const plot = D.plot, noTxt = (plot.khesra || "").trim() ? "खेसरा <b>" + h(plot.khesra) + "</b>" : '<span class="bad">खेसरा नं॰ खाली है</span>';
    const totTxt = D.total != null ? "कुल रकवा (" + (D.basis === "n" ? "नक्शा" : "खतियानी — नक्शा रकवा खाली है") + ") <b>" + fmtD(D.total) + "</b>" : '<span class="bad">कुल रकवा खाली है</span>';
    $("#skInfo").innerHTML = "<span>" + noTxt + "</span><span>" + totTxt + "</span><span>हिस्से <b>" + P.sel.length + "</b></span>";
    $("#skPicks").innerHTML = D.items.map((it) => '<label class="sk-pick"><input type="checkbox" data-skpick="' + it.k + '"' + (sk.picks[it.k] ? " checked" : "") + '> <b>' + (it.k + 1) + "</b> " + (it.name ? h(it.name) : "अनुसूचि " + (it.k + 1)) + (it.share ? " <small>" + fmtD(it.share) + "</small>" : "") + "</label>").join("");
    if (redetect || !sk.det) sk.det = PlotSketch.detect(sk.img, { seed: sk.seed, tol: sk.tol });
    const det = sk.det;
    // बाएँ: फोटो + पहचाना हुआ प्लॉट
    src.width = sk.img.w; src.height = sk.img.h;
    const sx = src.getContext("2d"); sx.drawImage(sk.cv, 0, 0);
    if (det.ok) {
      sx.beginPath(); det.poly.forEach((p, i) => (i ? sx.lineTo(p[0], p[1]) : sx.moveTo(p[0], p[1]))); sx.closePath();
      sx.fillStyle = "rgba(220,38,38,.16)"; sx.fill(); sx.lineWidth = Math.max(2, sk.img.w / 220); sx.strokeStyle = "#dc2626"; sx.stroke();
    }
    if (sk.seed) { sx.beginPath(); sx.arc(sk.seed.x, sk.seed.y, Math.max(4, sk.img.w / 130), 0, 7); sx.fillStyle = "#2563eb"; sx.fill(); sx.lineWidth = 2; sx.strokeStyle = "#fff"; sx.stroke(); }
    sk.built = false; $("#skApply").disabled = true;
    if (!det.ok) { msg.innerHTML = '<div class="note err">' + h(det.msg) + "</div>"; out.width = 1; out.height = 1; out.style.display = "none"; return; }
    out.style.display = "";
    const weights = P.w.length ? P.w : [1];
    sk.lay = PlotSketch.layout(det, { weights, dir: sk.dir, rev: sk.rev });
    const items = P.sel.map((s, i) => ({ title: (s.k + 1) + " " + (s.name ? s.short : "अनुसूचि"), area: P.area[i] != null ? fmtD(P.area[i]) : "" }));
    // layout का item = P.sel का क्रम
    const head = [(plot.khesra || "").trim() ? "खेसरा " + plot.khesra.trim() : "", D.total != null ? "कुल रकवा " + fmtD(D.total) + (D.basis === "n" ? " (नक्शा)" : " (खतियानी)") : ""].filter(Boolean).join(" · ");
    sk.size = PlotSketch.draw(out, det, sk.lay, { head, items: P.sel.length ? items : [] });
    sk.parts = P; sk.data = D; sk.built = true; $("#skApply").disabled = false;
    msg.innerHTML = (det.warn || []).map((t) => '<div class="note">⚠ ' + h(t) + "</div>").join("") + (!P.sel.length ? '<div class="note">कोई अनुसूचि ✓ नहीं है — सिर्फ़ अलग किया हुआ प्लॉट बनेगा, बँटवारा नहीं।</div>' : "") + (det.how === "auto" ? '<div class="note ok">लाल घेरे वाला प्लॉट अपने-आप पहचाना गया। सही न हो तो फोटो में सही प्लॉट के अंदर टैप करें।</div>' : '<div class="note ok">आपके टैप किए हुए प्लॉट से स्केच बना है।</div>');
  }
  function skApply() {
    if (!sk.built) return;
    const plot = state.groups[sk.gi].plots[sk.pi], out = $("#skOut");
    plot.abhi_img = { d: out.toDataURL("image/jpeg", 0.9), w: out.width, h: out.height };
    plot.abhi_cfg = { dir: sk.dir, rev: sk.rev, tol: sk.tol, picks: sk.picks.slice(), seed: sk.seed ? { fx: sk.seed.x / sk.img.w, fy: sk.seed.y / sk.img.h } : null };
    ui.pick[sk.key] = sk.picks.slice();
    if (sk.fill && sk.parts && sk.parts.sel.length) {
      const D = sk.data, P = sk.parts, kT = D.kT, nT = D.nT; let last = -1;
      P.sel.forEach((s, i) => { if (!s.share) last = i; });
      P.sel.forEach((s, i) => {
        if (s.share) return; const f = P.w[i] / P.sum;
        let kv = kT != null ? Math.round(f * kT * 100) / 100 : null, nv = nT != null ? Math.round(f * nT * 100) / 100 : null;
        if (i === last) { // आख़िरी खाली हिस्से में बाकी बचा रकवा, ताकि जोड़ ठीक कुल के बराबर हो
          const kO = plot.sch.reduce((a, x, q) => a + (q === s.k ? 0 : toD(x.k_ac, x.k_dc) || 0), 0), nO = plot.sch.reduce((a, x, q) => a + (q === s.k ? 0 : toD(x.n_ac, x.n_dc) || 0), 0);
          if (kT != null) kv = Math.max(0, Math.round((kT - kO) * 100) / 100); if (nT != null) nv = Math.max(0, Math.round((nT - nO) * 100) / 100);
        }
        setShare(plot, s.k, kv, nv);
      });
    }
    skClose(); save(); render(); toast("स्केच अभियुक्ति में लग गया।");
  }

  /* ---------- events ---------- */
  document.addEventListener("input", (e) => {
    const p = e.target && e.target.dataset && e.target.dataset.p;
    if (!p || !/\./.test(p)) return;
    const mk = /^groups\.(\d+)\.plots\.(\d+)\.(khata|khesra)$/.exec(p), oldV = mk ? String(getP(p) || "") : "";
    setP(p, e.target.value);
    if (mk) {   // ऊपर की पंक्ति का खाता / खेसरा → सभी हिस्सेदार के खाने में अपने-आप (जहाँ खाली है या पहले वही भरा था)
      const pl = state.groups[mk[1]].plots[mk[2]];
      pl.sch.forEach((x, k) => {
        if (!String(x[mk[3]] || "").trim() || String(x[mk[3]]) === oldV) {
          x[mk[3]] = e.target.value;
          const el = document.querySelector('[data-p="groups.' + mk[1] + ".plots." + mk[2] + ".sch." + k + "." + mk[3] + '"]'); if (el) el.value = e.target.value;
        }
      });
    }
    save(); updateLive();
  });
  // फोटो को छोटा करके (अधिकतम 800px, JPEG) रखना — ताकि browser की जगह और DOCX दोनों हल्के रहें
  function loadAbhiImage(file, gi, pi) {
    if (!file || !/^image\//.test(file.type)) { toast("सिर्फ़ फोटो (image) चुनें।", true); return; }
    const rd = new FileReader();
    rd.onerror = () => toast("फोटो पढ़ी नहीं जा सकी।", true);
    rd.onload = () => {
      const im = new Image();
      im.onerror = () => toast("यह फोटो खुल नहीं पाई।", true);
      im.onload = () => {
        const MAXD = 800, k = Math.min(1, MAXD / Math.max(im.naturalWidth, im.naturalHeight));
        const w = Math.max(1, Math.round(im.naturalWidth * k)), hh = Math.max(1, Math.round(im.naturalHeight * k));
        const cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
        const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, w, hh); cx.drawImage(im, 0, 0, w, hh);
        const plot = state.groups[gi] && state.groups[gi].plots[pi]; if (!plot) return;
        plot.abhi_img = { d: cv.toDataURL("image/jpeg", 0.82), w, h: hh };
        save(); render(); toast("फोटो लग गई।");
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
  document.addEventListener("change", (e) => {
    const tg = e.target;
    if (tg && tg.dataset && tg.dataset.abhi) { const [g, p] = tg.dataset.abhi.split("-").map(Number); const f = tg.files && tg.files[0]; const raw = tg.dataset.mode === "raw"; tg.value = ""; if (raw || !window.PlotSketch) loadAbhiImage(f, g, p); else loadSketchImage(f, g, p); return; }
    if (tg && tg.dataset && tg.dataset.pick) { const [g, p, k] = tg.dataset.pick.split("-").map(Number); pickOf(g, p)[k] = tg.checked; return; }
    if (tg && tg.dataset && tg.dataset.chk) { setP(tg.dataset.chk, tg.checked); save(); if (ui.step === 3) render(); return; }
    const p = e.target && e.target.dataset && e.target.dataset.p;
    if (p && /\./.test(p) && e.target.tagName === "SELECT") { setP(p, e.target.value); save(); if (ui.step === 3 && /^opts\./.test(p)) render(); }
    if (p && /^opts\./.test(p) && (e.target.tagName === "TEXTAREA" || (e.target.tagName === "INPUT" && (e.target.type === "text" || e.target.type === "number"))) && ui.step === 3) render();
  });

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const d = t.dataset, act = d.act, i = Number(d.i), s = Number(d.s), gi = Number(d.g), pi = Number(d.p);
    const n = state.schedules.length;
    if (act === "step") go(i);
    else if (act === "toggleGroup") { ui.openGroup = ui.openGroup === gi ? -1 : gi; render(); }
    else if (act === "togglePlot") { ui.openPlot[gi] = ui.openPlot[gi] === pi ? -1 : pi; render(); }
    else if (act === "splitEq") splitEqual(gi, pi);
    else if (act === "sketchEdit") openSketch(gi, pi);
    else if (act === "abhiDel") { state.groups[gi].plots[pi].abhi_img = null; save(); render(); }
    else if (act === "restFill") fillRest(gi, pi, s);
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
    else if (act === "design") { setP("opts.design", d.v); save(); render(); }
    else if (act === "partyWord") { setP("opts.partyWord", d.v); save(); render(); }
    else if (act === "pdf") printPdf();
    else if (act === "download") download();
  });

  $("#btnNext").addEventListener("click", () => go(ui.step + 1));
  $("#btnBack").addEventListener("click", () => go(ui.step - 1));
  $("#btnDownload").addEventListener("click", download);
  $("#btnDemo").addEventListener("click", () => {
    const hasData = state.groups.some((g) => (g.name || "").trim() || g.plots.some(plotHasData)) || state.schedules.some((s) => (s.name || "").trim());
    if (hasData && !confirm("अभी भरा हुआ डाटा हटकर डेमो डाटा आ जाएगा। ठीक है?")) return;
    snapshot("डेमो भरने से पहले"); detachCase();
    state = demoState();
    ui.step = 3; ui.openGroup = 0; ui.openPlot = {}; ui.schTab = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    render(); window.scrollTo({ top: 0 }); toast("डेमो डाटा भर गया — नीचे नमूना देखें, फिर DOCX डाउनलोड करें।");
  });
  $("#btnNew").addEventListener("click", () => {
    const hasData = stateHasData(state) || Object.keys(state.header || {}).some((k) => String(state.header[k] || "").trim());
    if (hasData && !confirm("अभी का सारा डाटा (गाँव / थाना विवरण, अनुसूचियाँ, पंक्तियाँ) साफ़ हो जाएगा और पहले स्टेप से नया फॉर्म शुरू होगा।\n\nपुराना डाटा 'पिछला डाटा' में सेव रहेगा। ठीक है?")) return;
    snapshot("नया फॉर्म शुरू करने से पहले"); detachCase();
    const op = state.opts;                       // सिर्फ़ DOCX/PDF की सेटिंग (पेज नंबर, साइज़ आदि) रखी गई है
    state = normalize(freshState()); state.opts = op;
    ui.step = 0; ui.openGroup = 0; ui.openPlot = {}; ui.schTab = {}; ui.pick = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    render(); window.scrollTo({ top: 0 }); toast("नया खाली फॉर्म तैयार है — पहले स्टेप (गाँव / थाना विवरण) से शुरू करें।");
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
    snapshot("पिछला डाटा खोलने से पहले"); detachCase();
    try { state = normalize(JSON.parse(it.json)); } catch (err) { toast("यह डाटा खुल नहीं पाया", true); return; }
    ui.step = 3; ui.openGroup = 0; ui.openPlot = {}; ui.schTab = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) {}
    histClose(); render(); window.scrollTo({ top: 0 }); toast("पिछला डाटा खुल गया।");
  });

  /* ---------- पहले की DOCX खोलकर डाटा वापस भरना ---------- */
  async function importDocx(file) {
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) { toast("सिर्फ़ .docx फाइल चुनें।", true); return; }
    let st = null;
    try { st = await BatwaraDocx.extractState(JSZip, await file.arrayBuffer()); }
    catch (e) { toast("यह फाइल पढ़ी नहीं जा सकी — सही DOCX चुनें।", true); return; }
    if (!st) { toast("इस DOCX में फॉर्म का डाटा नहीं मिला। सिर्फ़ इसी साइट के नए वर्ज़न से बनी DOCX खुल सकती है।", true); return; }
    if (stateHasData(state) && !confirm("अभी का डाटा हट जाएगा (वो 'पिछला डाटा' में सेव रहेगा)। इस DOCX का डाटा खोलें?")) return;
    snapshot("DOCX से खोलने से पहले"); detachCase();
    state = normalize(st);
    ui.step = 3; ui.openGroup = 0; ui.openPlot = {}; ui.schTab = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    render(); window.scrollTo({ top: 0 }); toast("DOCX का सारा डाटा भर गया — अब एडिट करके फिर डाउनलोड करें।");
  }
  $("#btnImport").addEventListener("click", () => $("#fileImport").click());
  $("#fileImport").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; importDocx(f); });
  let dragN = 0;
  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf("Files") >= 0;
  window.addEventListener("dragenter", (e) => { if (hasFiles(e)) { dragN++; $("#dropHint").hidden = false; } });
  window.addEventListener("dragleave", (e) => { if (hasFiles(e) && --dragN <= 0) { dragN = 0; $("#dropHint").hidden = true; } });
  window.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener("drop", (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragN = 0; $("#dropHint").hidden = true; importDocx(e.dataTransfer.files[0]); });

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
    // 12 खेसरा (3 रैयत: 7 + 3 + 2), 5 अनुसूचि — सब का रकवा मिलान सही
    const all5 = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 };
    const eq = (T, idx) => { const o = {}; idx.forEach((k) => { o[k] = T / idx.length; }); return o; };
    const g1 = { name: "राजेश कुमार शर्मा", rel_type: "पिता", rel_naam: "रामस्वरूप ठाकुर", addr: "ग्राम बखरी, पो० बखरी, सीतामढ़ी", plots: [
      plot("1324", "56", "234", 120, eq(120, [0, 1, 2, 3, 4])),
      plot("1324", "56", "235", 60, eq(60, [0, 1, 2])),
      plot("1324", "56", "236", 50, eq(50, [3, 4])),
      plot("1324", "56", "237", 100, eq(100, [0, 1, 2, 3, 4])),
      plot("1324", "56", "238", 45, eq(45, [0, 2, 4])),
      plot("1324", "56", "239", 80, eq(80, [0, 1, 2, 3, 4])),
      plot("1324", "56", "240", 30, eq(30, [1, 3]))
    ] };
    Object.assign(g1.plots[0].sch[0], chau, { min_janib: "पूरब" });
    Object.assign(g1.plots[1].sch[1], { north: "आरी", north_ref: "234", south: "सड़क" });
    const g2 = { name: "सुनीता देवी", rel_type: "पति", rel_naam: "अशोक साह", addr: "ग्राम बखरी, पो० बखरी, सीतामढ़ी", plots: [
      plot("1325", "57", "310", 100, { 0: 40, 1: 30, 3: 30 }),
      plot("1325", "57", "311", 25, { 4: 25 }),
      plot("1325", "57", "312", 60, eq(60, [0, 1, 2, 3, 4]))
    ] };
    const g3 = { name: "मोहन यादव", rel_type: "पिता", rel_naam: "स्व० बालेश्वर यादव", addr: "ग्राम रीगा, पो० रीगा, सीतामढ़ी", plots: [
      plot("1330", "61", "405", 75, eq(75, [0, 1, 2, 3, 4])),
      plot("1330", "61", "406", 40, { 0: 20, 2: 20 })
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

  /* ---------- मेन्यू ---------- */
  const menu = $("#menu");
  $("#btnMenu").addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest(".menu-wrap")) menu.hidden = true; });
  menu.addEventListener("click", () => { menu.hidden = true; });

  /* ---------- PDF / प्रिंट ---------- */
  function printPdf() {
    try {
      if (!state.groups.some((g) => g.plots.some(plotHasData))) { toast("पहले कम से कम एक पंक्ति भरें।", true); return; }
      const m = BatwaraDocx.printHtml(state);
      let st = $("#printStyle");
      if (!st) { st = document.createElement("style"); st.id = "printStyle"; document.head.appendChild(st); }
      st.textContent = m.css; $("#printRoot").innerHTML = m.html;
      toast("प्रिंट विंडो में 'PDF के रूप में सेव करें' चुनें।");
      setTimeout(() => window.print(), 250);
    } catch (err) { toast(err.message || "PDF नहीं बन पाया", true); }
  }
  $("#btnPdf").addEventListener("click", printPdf);

  /* ---------- English → हिंदी टाइपिंग ---------- */
  let trOn = true;
  try { trOn = localStorage.getItem("batwaraTranslit") !== "0"; } catch (e) {}
  const trLabel = () => { $("#trState").textContent = trOn ? "चालू" : "बंद"; };
  $("#btnTranslit").addEventListener("click", () => {
    trOn = !trOn; try { localStorage.setItem("batwaraTranslit", trOn ? "1" : "0"); } catch (e) {}
    trLabel(); toast("English → हिंदी टाइपिंग " + (trOn ? "चालू" : "बंद"));
  });
  const NOTR = /(jamabandi|khata|khesra|k_ac|k_dc|n_ac|n_dc|_ref|thana_no|header\.date)$/;
  const textField = (el) => el && el.dataset && el.dataset.p && ((el.tagName === "INPUT" && el.type === "text") || el.tagName === "TEXTAREA") && !NOTR.test(el.dataset.p) && !/^opts\./.test(el.dataset.p);
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!trOn || !textField(el) || !BatwaraHindi.hasLatin(el.value)) return;
    const v = BatwaraHindi.convert(el.value);
    el.value = v; setP(el.dataset.p, v); save(); updateLive();
  });

  /* ---------- आवाज़ से टाइपिंग (हिंदी) ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $("#micBtn");
  let lastEl = null, rec = null, listening = false;
  document.addEventListener("focusin", (e) => { if (textField(e.target)) { lastEl = e.target; mic.hidden = false; } });
  document.addEventListener("focusout", () => setTimeout(() => {
    const a = document.activeElement;
    if (!listening && a !== mic && !textField(a)) mic.hidden = true;
  }, 300));
  mic.addEventListener("mousedown", (e) => e.preventDefault());
  mic.addEventListener("click", () => {
    if (!SR) { toast("इस ब्राउज़र में आवाज़ से टाइपिंग नहीं है (Chrome / Edge / Safari में चलती है)।", true); return; }
    if (listening) { rec && rec.stop(); return; }
    if (!lastEl) { toast("पहले किसी खाने में क्लिक करें।", true); return; }
    const target = lastEl;
    rec = new SR(); rec.lang = "hi-IN"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => { listening = true; mic.classList.add("on"); toast("बोलिए…"); };
    rec.onend = () => { listening = false; mic.classList.remove("on"); };
    rec.onerror = (ev) => { toast("आवाज़ नहीं सुन पाया" + (ev.error ? " (" + ev.error + ")" : ""), true); };
    rec.onresult = (ev) => {
      const txt = ev.results[0][0].transcript.trim(), cur = target.value.trim();
      target.value = cur ? cur + " " + txt : txt;
      target.dispatchEvent(new Event("input", { bubbles: true })); target.dispatchEvent(new Event("change", { bubbles: true }));
    };
    try { rec.start(); } catch (e) { toast("माइक शुरू नहीं हो पाया", true); }
  });

  /* ---------- नाम वाले केस (मेरे केस) ---------- */
  const CKEY = "batwaraCases_v1", CUR = "batwaraCurrentCase";
  const casesLoad = () => { try { const a = JSON.parse(localStorage.getItem(CKEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const casesSave = (l) => { try { localStorage.setItem(CKEY, JSON.stringify(l)); return true; } catch (e) { toast("जगह कम है — केस सेव नहीं हो पाया", true); return false; } };
  let curCase = null;
  try { curCase = localStorage.getItem(CUR) || null; } catch (e) {}
  function setCur(id) { curCase = id; try { id ? localStorage.setItem(CUR, id) : localStorage.removeItem(CUR); } catch (e) {} chip(); }
  function chip() { const c = curCase && casesLoad().find((x) => x.id === curCase); $("#caseChip").textContent = c ? "· " + c.name : ""; }
  function caseTouch() {
    if (!curCase) return;
    const l = casesLoad(), c = l.find((x) => x.id === curCase);
    if (!c) { setCur(null); return; }
    const json = JSON.stringify(state);
    if (c.json === json) return;
    c.json = json; c.ts = Date.now(); casesSave(l);
  }
  function detachCase() { caseTouch(); setCur(null); }
  function defaultCaseName() {
    const g = state.groups.find((x) => (x.name || "").trim());
    const nm = [(state.header.mauja || "").trim(), g ? g.name.trim() : ""].filter(Boolean).join(" – ");
    return nm || "केस " + new Date().toLocaleDateString("hi-IN");
  }
  const timeStr = (ts) => { const d = new Date(ts); return d.toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" }); };
  function caseRender() {
    const q = $("#caseSearch").value.trim().toLowerCase(), box = $("#caseList");
    const all = casesLoad().sort((a, b) => b.ts - a.ts);
    const list = all.filter((c) => { if (!q) return true; const m = histMeta(c.json); return (c.name + " " + m.title + " " + m.place).toLowerCase().indexOf(q) >= 0; });
    if (!list.length) { box.innerHTML = '<div class="hist-empty">' + (all.length ? "कोई केस नहीं मिला।" : 'अभी कोई केस सेव नहीं है।<br><small>ऊपर "वर्तमान डाटा नए केस में सेव करें" दबाकर नाम दें — फिर आप जो भी बदलेंगे वह उसी केस में अपने-आप सेव होता रहेगा।</small>') + "</div>"; return; }
    box.innerHTML = list.map((c, i) => {
      const m = histMeta(c.json), on = c.id === curCase;
      return '<div class="hist-item' + (on ? " cur" : "") + '"><div class="hist-n">' + (i + 1) + '</div><div class="hist-info"><b>' + h(c.name) + (on ? ' <em class="curtag">अभी खुला</em>' : "") + "</b>" +
        "<span>" + h(m.place ? m.place + " · " : "") + h(m.line) + "</span><small>" + h(timeStr(c.ts)) + "</small></div>" +
        '<div class="hist-act"><button type="button" class="btn primary sm" data-cact="open" data-id="' + h(c.id) + '">खोलें</button>' +
        '<button type="button" class="btn ghost sm" data-cact="rename" data-id="' + h(c.id) + '">नाम</button>' +
        '<button type="button" class="btn ghost sm" data-cact="copy" data-id="' + h(c.id) + '">कॉपी</button>' +
        '<button type="button" class="btn danger sm" data-cact="del" data-id="' + h(c.id) + '">हटाएँ</button></div></div>';
    }).join("");
  }
  function caseOpenModal() { $("#caseSearch").value = ""; caseRender(); $("#caseModal").hidden = false; }
  const caseClose = () => { $("#caseModal").hidden = true; };
  $("#btnCases").addEventListener("click", caseOpenModal);
  $("#caseClose").addEventListener("click", caseClose);
  $("#caseModal").addEventListener("click", (e) => { if (e.target.id === "caseModal") caseClose(); });
  $("#caseSearch").addEventListener("input", caseRender);
  $("#caseNew").addEventListener("click", () => {
    const name = (prompt("इस केस का नाम लिखें:", defaultCaseName()) || "").trim();
    if (!name) return;
    caseTouch();
    const c = { id: "c" + Date.now() + Math.random().toString(36).slice(2, 6), name, ts: Date.now(), json: JSON.stringify(state) };
    const l = casesLoad(); l.unshift(c);
    if (casesSave(l)) { setCur(c.id); caseRender(); toast("केस सेव हो गया — अब बदलाव इसी में सेव होते रहेंगे।"); }
  });
  $("#caseList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cact]"); if (!b) return;
    const l = casesLoad(), c = l.find((x) => x.id === b.dataset.id); if (!c) return;
    const act = b.dataset.cact;
    if (act === "rename") { const n = (prompt("नया नाम:", c.name) || "").trim(); if (!n) return; c.name = n; c.ts = Date.now(); casesSave(l); chip(); caseRender(); }
    else if (act === "copy") { const d = { id: "c" + Date.now() + Math.random().toString(36).slice(2, 6), name: c.name + " (कॉपी)", ts: Date.now(), json: c.json }; l.unshift(d); casesSave(l); caseRender(); }
    else if (act === "del") {
      if (!confirm("केस '" + c.name + "' हमेशा के लिए हट जाएगा। ठीक है?")) return;
      casesSave(l.filter((x) => x.id !== c.id)); if (curCase === c.id) setCur(null); caseRender();
    }
    else if (act === "open") {
      if (c.id !== curCase) {
        caseTouch();
        if (!curCase && stateHasData(state)) { if (!confirm("अभी का डाटा किसी केस में सेव नहीं है; वह 'पिछला डाटा' में रख दिया जाएगा। केस खोलें?")) return; snapshot("केस खोलने से पहले"); }
      }
      try { state = normalize(JSON.parse(c.json)); } catch (err) { toast("यह केस खुल नहीं पाया", true); return; }
      setCur(c.id); ui.step = 3; ui.openGroup = 0; ui.openPlot = {}; ui.schTab = {}; ui.pick = {};
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) {}
      caseClose(); render(); window.scrollTo({ top: 0 }); toast("केस खुल गया: " + c.name);
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") caseClose(); });

  /* ---------- अपने-आप पुराना version सेव (गलती हो जाए तो 'पिछला डाटा' से वापस) ---------- */
  let lastAuto = Date.now();
  setInterval(() => {
    if (document.hidden || Date.now() - lastAuto < 4 * 60 * 1000) return;
    lastAuto = Date.now(); snapshot("अपने-आप सेव (एडिट के दौरान)");
  }, 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { lastAuto = Date.now(); snapshot("पेज छोड़ते समय का डाटा"); } });
  // पेज खुलते ही पिछली बार का डाटा सुरक्षित रख लें (जो हिस्सा बदलने वाला हो उससे पहले)
  snapshot("पिछली बार का डाटा (पेज खुलने पर)");

  trLabel(); chip();
  histCount();
  render();
})();

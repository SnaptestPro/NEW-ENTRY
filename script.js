/* ==========================================================
   खेसरा प्रविष्टि फॉर्म — client-side logic
   सारा डाटा ब्राउज़र के localStorage में सेव होता है
   ========================================================== */

const STORAGE_KEY = "khesraEntries_v1";

let entries = [];        // सभी सेव की गई entries
let currentIndex = 0;    // अभी कौन सी entry खुली है

/* ---------- खाली entry का ढांचा ---------- */
function blankEntry() {
  return {
    tab1: {
      khesra_no: "", ref_khesra_no: "", dharan_prakar: "",
      raiyat_naam: "", relation_type: "पिता का नाम", relation_naam: "",
      aadhar: "", raiyat_naam_en: "",
      oldKhataList: [],
      addr1: "", addr2: "", pin: "", email: "",
      jaati: "", gender: "", ekad: "", decimal: "", mobile: ""
    },
    tab2: { hasOther: "no", shareholders: [] },
    tab3: { north: "", north_ref: "", south: "", south_ref: "", east: "", east_ref: "", west: "", west_ref: "" },
    tab4: { extraList: [] }
  };
}

/* ---------- localStorage से लोड / सेव ---------- */
function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { entries = JSON.parse(raw); } catch (e) { entries = []; }
  }
  if (!entries || entries.length === 0) entries = [blankEntry()];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/* ---------- छोटी सी सहायक फंक्शन ---------- */
const $ = (id) => document.getElementById(id);

function setStatus(msg) {
  $("statusLine").textContent = msg;
  if (msg) setTimeout(() => { if ($("statusLine").textContent === msg) $("statusLine").textContent = ""; }, 2500);
}

/* ---------- फॉर्म को entry से भरना ---------- */
function fillFormFromEntry(entry) {
  // tab1
  const t1 = entry.tab1;
  $("f_khesra_no").value = t1.khesra_no;
  $("f_ref_khesra_no").value = t1.ref_khesra_no;
  $("f_dharan_prakar").value = t1.dharan_prakar;
  $("f_raiyat_naam").value = t1.raiyat_naam;
  $("f_relation_type").value = t1.relation_type;
  $("f_relation_naam").value = t1.relation_naam;
  $("f_aadhar").value = t1.aadhar;
  $("f_raiyat_naam_en").value = t1.raiyat_naam_en;
  $("f_addr1").value = t1.addr1;
  $("f_addr2").value = t1.addr2;
  $("f_pin").value = t1.pin;
  $("f_email").value = t1.email;
  $("f_jaati").value = t1.jaati;
  $("f_gender").value = t1.gender;
  $("f_ekad").value = t1.ekad;
  $("f_decimal").value = t1.decimal;
  $("f_mobile").value = t1.mobile;
  renderOldKhataTable();

  // tab2
  $("f_has_other").value = entry.tab2.hasOther;
  toggleOtherShareholderForm();
  renderShareholderTable();

  // tab3
  const t3 = entry.tab3;
  $("ch_north").value = t3.north; $("ch_north_ref").value = t3.north_ref;
  $("ch_south").value = t3.south; $("ch_south_ref").value = t3.south_ref;
  $("ch_east").value = t3.east;   $("ch_east_ref").value = t3.east_ref;
  $("ch_west").value = t3.west;   $("ch_west_ref").value = t3.west_ref;

  // tab4
  renderExtraTable();
}

/* ---------- फॉर्म से मौजूदा entry में डाटा उठाना ---------- */
function readFormIntoEntry() {
  const entry = entries[currentIndex];

  const t1 = entry.tab1;
  t1.khesra_no = $("f_khesra_no").value.trim();
  t1.ref_khesra_no = $("f_ref_khesra_no").value.trim();
  t1.dharan_prakar = $("f_dharan_prakar").value;
  t1.raiyat_naam = $("f_raiyat_naam").value.trim();
  t1.relation_type = $("f_relation_type").value;
  t1.relation_naam = $("f_relation_naam").value.trim();
  t1.aadhar = $("f_aadhar").value.trim();
  t1.raiyat_naam_en = $("f_raiyat_naam_en").value.trim();
  t1.addr1 = $("f_addr1").value.trim();
  t1.addr2 = $("f_addr2").value.trim();
  t1.pin = $("f_pin").value.trim();
  t1.email = $("f_email").value.trim();
  t1.jaati = $("f_jaati").value;
  t1.gender = $("f_gender").value;
  t1.ekad = $("f_ekad").value;
  t1.decimal = $("f_decimal").value;
  t1.mobile = $("f_mobile").value.trim();

  entry.tab2.hasOther = $("f_has_other").value;

  const t3 = entry.tab3;
  t3.north = $("ch_north").value.trim(); t3.north_ref = $("ch_north_ref").value.trim();
  t3.south = $("ch_south").value.trim(); t3.south_ref = $("ch_south_ref").value.trim();
  t3.east = $("ch_east").value.trim();   t3.east_ref = $("ch_east_ref").value.trim();
  t3.west = $("ch_west").value.trim();   t3.west_ref = $("ch_west_ref").value.trim();
}

/* ---------- top tabs (क्र.संख्या / हिस्सेदार / चौहद्दी / 12 से आगे) ---------- */
function switchTopTab(tabId) {
  document.querySelectorAll(".top-tab").forEach(el => el.classList.toggle("active", el.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach(el => el.classList.toggle("active", el.id === tabId));
}

document.querySelectorAll(".top-tab").forEach(tabEl => {
  tabEl.addEventListener("click", () => switchTopTab(tabEl.dataset.tab));
});
document.querySelectorAll(".btn-next").forEach(btn => {
  btn.addEventListener("click", () => switchTopTab(btn.dataset.next));
});

/* ---------- required-field जांच ---------- */
function validate(ids) {
  let ok = true;
  ids.forEach(id => {
    const el = $(id);
    if (!el.value || !el.value.toString().trim()) {
      el.style.borderColor = "var(--red)";
      ok = false;
    } else {
      el.style.borderColor = "";
    }
  });
  return ok;
}

/* ---------- Tab 1: Save ---------- */
$("btnSave1").addEventListener("click", () => {
  const required = ["f_khesra_no", "f_dharan_prakar", "f_raiyat_naam", "f_addr1", "f_pin", "f_ekad", "f_mobile"];
  if (!validate(required)) { setStatus("कृपया लाल निशान वाले सभी आवश्यक फ़ील्ड भरें।"); return; }
  readFormIntoEntry();
  persist();
  renderEntryTabs();
  setStatus("रिकॉर्ड सेव हो गया।");
});

/* ---------- पुराना खाता/खेसरा जोड़ना ---------- */
function renderOldKhataTable() {
  const tbody = $("oldKhataTable").querySelector("tbody");
  const list = entries[currentIndex].tab1.oldKhataList;
  tbody.innerHTML = "";
  list.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.khata}</td><td>${row.khesra}</td>
      <td class="remove-cell"><button class="remove-btn" data-i="${i}">✕</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".remove-btn").forEach(b => {
    b.addEventListener("click", () => {
      list.splice(Number(b.dataset.i), 1);
      persist();
      renderOldKhataTable();
    });
  });
}

$("btnAddOldKhata").addEventListener("click", () => {
  const khata = $("f_purana_khata").value.trim();
  const khesra = $("f_purana_khesra").value.trim();
  if (!khata && !khesra) { setStatus("पुराना खाता या खेसरा सं॰ भरें।"); return; }
  entries[currentIndex].tab1.oldKhataList.push({ khata, khesra });
  $("f_purana_khata").value = ""; $("f_purana_khesra").value = "";
  persist();
  renderOldKhataTable();
});

/* ---------- अन्य हिस्सेदार ---------- */
function toggleOtherShareholderForm() {
  $("otherShareholderForm").classList.toggle("hidden", $("f_has_other").value !== "yes");
}
$("f_has_other").addEventListener("change", () => {
  entries[currentIndex].tab2.hasOther = $("f_has_other").value;
  toggleOtherShareholderForm();
  persist();
});

function renderShareholderTable() {
  const tbody = $("shareholderTable").querySelector("tbody");
  const list = entries[currentIndex].tab2.shareholders;
  tbody.innerHTML = "";
  list.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.naam}</td><td>${row.relation_type}: ${row.relation_naam}</td>
      <td>${row.jaati}</td><td>${row.addr}</td>
      <td class="remove-cell"><button class="remove-btn" data-i="${i}">✕</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".remove-btn").forEach(b => {
    b.addEventListener("click", () => {
      list.splice(Number(b.dataset.i), 1);
      persist();
      renderShareholderTable();
    });
  });
}

$("btnAddShareholder").addEventListener("click", () => {
  if (!validate(["os_naam"])) { setStatus("रैयत का नाम आवश्यक है।"); return; }
  const addrParts = [$("os_addr1").value.trim(), $("os_addr2").value.trim()].filter(Boolean);
  entries[currentIndex].tab2.shareholders.push({
    naam: $("os_naam").value.trim(),
    relation_type: $("os_relation_type").value,
    relation_naam: $("os_relation_naam").value.trim(),
    jaati: $("os_jaati").value,
    addr: addrParts.join(", ")
  });
  ["os_naam", "os_relation_naam", "os_addr1", "os_addr2"].forEach(id => $(id).value = "");
  persist();
  renderShareholderTable();
  setStatus("हिस्सेदार जोड़ा गया।");
});

/* ---------- चौहद्दी ---------- */
$("btnFillChauhaddi").addEventListener("click", () => {
  const required = ["ch_north", "ch_south", "ch_east", "ch_west"];
  if (!validate(required)) { setStatus("चारों दिशाओं की चौहद्दी भरें।"); return; }
  readFormIntoEntry();
  persist();
  setStatus("चौहद्दी सेव हो गई।");
});

/* ---------- क्र.संख्या 12 से आगे ---------- */
function renderExtraTable() {
  const tbody = $("extraTable").querySelector("tbody");
  const list = entries[currentIndex].tab4.extraList;
  tbody.innerHTML = "";
  list.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.khesra}</td><td>${row.ref}</td>
      <td class="remove-cell"><button class="remove-btn" data-i="${i}">✕</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".remove-btn").forEach(b => {
    b.addEventListener("click", () => {
      list.splice(Number(b.dataset.i), 1);
      persist();
      renderExtraTable();
    });
  });
}

$("btnAddExtra").addEventListener("click", () => {
  const khesra = $("f_extra_khesra").value.trim();
  const ref = $("f_extra_ref").value.trim();
  if (!khesra) { setStatus("खेसरा सं॰ भरें।"); return; }
  entries[currentIndex].tab4.extraList.push({ khesra, ref });
  $("f_extra_khesra").value = ""; $("f_extra_ref").value = "";
  persist();
  renderExtraTable();
});

$("btnSaveExtra").addEventListener("click", () => {
  persist();
  setStatus("सेव हो गया।");
});

/* ---------- New Entry / Tab 1,2,3... (सेव की गई entries के बीच स्विच) ---------- */
function renderEntryTabs() {
  const wrap = $("entryTabs");
  wrap.innerHTML = "";
  entries.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "entry-tab" + (i === currentIndex ? " active" : "");
    div.textContent = "Tab " + (i + 1);
    div.addEventListener("click", () => switchEntry(i));
    wrap.appendChild(div);
  });
}

function switchEntry(i) {
  readFormIntoEntry();   // मौजूदा फॉर्म का डाटा खोने न पाए
  persist();
  currentIndex = i;
  fillFormFromEntry(entries[currentIndex]);
  renderEntryTabs();
  switchTopTab("t1");
}

$("btnNewEntry").addEventListener("click", () => {
  readFormIntoEntry();
  persist();
  entries.push(blankEntry());
  currentIndex = entries.length - 1;
  persist();
  fillFormFromEntry(entries[currentIndex]);
  renderEntryTabs();
  switchTopTab("t1");
  setStatus("नई प्रविष्टि शुरू करें।");
});

/* ---------- ऊपर की info-bar (ज़िला/अंचल/मौजा/टोला/हलका/थाना नं॰) ---------- */
const META_KEY = "khesraMeta_v1";
const metaIds = ["m_zila", "m_anchal", "m_mouja", "m_tola", "m_halka", "m_thana"];

function loadMeta() {
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return;
  try {
    const meta = JSON.parse(raw);
    metaIds.forEach(id => { if (meta[id] !== undefined && $(id)) $(id).value = meta[id]; });
  } catch (e) { /* ignore corrupt data */ }
}

function saveMeta() {
  const meta = {};
  metaIds.forEach(id => { if ($(id)) meta[id] = $(id).value; });
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

metaIds.forEach(id => {
  const el = $(id);
  if (el) el.addEventListener("change", saveMeta);
});

/* ---------- शुरुआत ---------- */
loadMeta();
loadEntries();
fillFormFromEntry(entries[currentIndex]);
renderEntryTabs();

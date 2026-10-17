/* English (Roman) -> हिंदी (देवनागरी) : ऑफ़लाइन, नाम/पते के लिए सरल ध्वन्यात्मक रूपांतरण.
   नियम: 'a' बीच में छोटा (अ), शब्द के अंत में 'a' = ा, लंबी 'आ' के लिए aa, 'ee' = ई, 'oo' = ऊ.
   आम नामों/जातियों/शब्दों की सूची (DICT) सीधे सही रूप देती है. */
(function (root) {
  const DICT = {
    kumar: "कुमार", kumari: "कुमारी", singh: "सिंह", sinha: "सिन्हा", prasad: "प्रसाद", devi: "देवी", ram: "राम", thakur: "ठाकुर", yadav: "यादव",
    mahto: "महतो", mahato: "महतो", sah: "साह", shah: "साह", lal: "लाल", sharma: "शर्मा", verma: "वर्मा", varma: "वर्मा", mishra: "मिश्रा", mishr: "मिश्र",
    pandey: "पाण्डेय", pande: "पांडे", jha: "झा", rai: "राय", ray: "राय", paswan: "पासवान", chaudhary: "चौधरी", choudhary: "चौधरी", chaudhri: "चौधरी",
    mandal: "मंडल", mondal: "मंडल", das: "दास", sahani: "साहनी", sahni: "साहनी", gupta: "गुप्ता", mukhiya: "मुखिया", sita: "सीता", radha: "राधा",
    krishna: "कृष्ण", shyam: "श्याम", ganesh: "गणेश", mohan: "मोहन", rajesh: "राजेश", suresh: "सुरेश", ramesh: "रमेश", mahesh: "महेश", dinesh: "दिनेश",
    vijay: "विजय", bijay: "विजय", ajay: "अजय", sanjay: "संजय", anil: "अनिल", sunil: "सुनील", ashok: "अशोक", amit: "अमित", rakesh: "राकेश", mukesh: "मुकेश",
    lakhan: "लखन", ramlakhan: "रामलखन", ramswarup: "रामस्वरूप", swarup: "स्वरूप", bhagwan: "भगवान", bhagwati: "भगवती", shankar: "शंकर", mahadev: "महादेव",
    pita: "पिता", pati: "पति", gram: "ग्राम", gaon: "गाँव", post: "पोस्ट", po: "पो०", thana: "थाना", anchal: "अंचल", jila: "जिला", district: "जिला",
    sitamarhi: "सीतामढ़ी", patna: "पटना", bihar: "बिहार", riga: "रीगा", muzaffarpur: "मुजफ्फरपुर", sadar: "सदर", nij: "निज", panchayat: "पंचायत", halka: "हल्का",
    chamar: "चमार", ravidas: "रविदास", brahmin: "ब्राह्मण", rajput: "राजपूत", bhumihar: "भूमिहार", kurmi: "कुर्मी", koiri: "कोइरी", teli: "तेली", dusadh: "दुसाध",
    musahar: "मुसहर", dhobi: "धोबी", nai: "नाई", kumhar: "कुम्हार", lohar: "लोहार", badhai: "बढ़ई", mallah: "मल्लाह", sri: "श्री", shri: "श्री", smt: "श्रीमती",
    late: "स्व०", swargiya: "स्वर्गीय", pashchim: "पश्चिम", paschim: "पश्चिम", purab: "पूरब", purv: "पूर्व", uttar: "उत्तर", dakshin: "दक्षिण", nahar: "नहर",
    rasta: "रास्ता", sadak: "सड़क", aari: "आरी", ari: "आरी", pokhar: "पोखर", talab: "तालाब", kuan: "कुआँ", nadi: "नदी", bagh: "बाग", khet: "खेत", ghar: "घर",
    nirmal: "निर्मल", kishore: "किशोर", kishor: "किशोर", sudama: "सुदामा", hari: "हरि", haridas: "हरिदास", balram: "बलराम", bindeshwar: "बिन्देश्वर",
    brahmdev: "ब्रह्मदेव", gangadev: "गंगादेव", ramvilas: "रामविलास", vilas: "विलास", bipin: "बिपिन", bifai: "बिफई", shivnath: "शिवनाथ", harinandan: "हरिनंदन",
    omkar: "ओमकार", chandan: "चंदन", vishnu: "विष्णु", sonu: "सोनू", monu: "मोनू", sunita: "सुनीता", kamla: "कमला", kamala: "कमला", geeta: "गीता", gita: "गीता",
    rekha: "रेखा", sushila: "सुशीला", savitri: "सावित्री", laxmi: "लक्ष्मी", lakshmi: "लक्ष्मी", parvati: "पार्वती", saraswati: "सरस्वती", baleshwar: "बालेश्वर",
    nath: "नाथ", dev: "देव", dutt: "दत्त", pal: "पाल", ji: "जी", bakhri: "बखरी", ganeshpur: "गणेशपुर", posua: "पोसुआ", baghi: "बघी", khesra: "खेसरा", khata: "खाता", rakba: "रकबा", rakwa: "रकवा"
  };
  const CONS = [
    ["chh", "छ"], ["ksh", "क्ष"], ["shh", "ष"],
    ["kh", "ख"], ["gh", "घ"], ["ch", "च"], ["jh", "झ"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"], ["sh", "श"], ["gy", "ज्ञ"],
    ["k", "क"], ["g", "ग"], ["c", "क"], ["j", "ज"], ["t", "त"], ["d", "द"], ["n", "न"], ["p", "प"], ["b", "ब"], ["m", "म"], ["y", "य"],
    ["r", "र"], ["l", "ल"], ["v", "व"], ["w", "व"], ["s", "स"], ["h", "ह"], ["f", "फ"], ["z", "ज"], ["q", "क"], ["x", "क्स"]
  ];
  const VOW = [   // [रोमन, स्वतंत्र, मात्रा]
    ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ee", "ई", "ी"], ["ii", "ई", "ी"], ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"],
    ["a", "अ", "A"], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"], ["o", "ओ", "ो"]
  ];
  const HAL = "्";

  function wordToHindi(w) {
    const lw = w.toLowerCase();
    if (DICT[lw]) return DICT[lw];
    // इकाइयों में तोड़ना
    const units = []; let i = 0;
    while (i < lw.length) {
      let hit = null;
      for (const [r, d] of CONS) if (lw.startsWith(r, i)) { hit = { t: "C", d, len: r.length }; break; }
      if (!hit) for (const [r, ind, mat] of VOW) if (lw.startsWith(r, i)) { hit = { t: "V", ind, mat, len: r.length, short: r === "a" }; break; }
      if (!hit) return w;                       // अनजान अक्षर — जैसा है वैसा
      units.push(hit); i += hit.len;
    }
    let out = "", prevC = false;
    const STOP = "कखगघचछजझतथदधपफबभ";
    units.forEach((u, idx) => {
      const nx = units[idx + 1], pv = units[idx - 1];
      if (u.t === "C" && (u.d === "न" || u.d === "म") && pv && pv.t === "V" && nx && nx.t === "C" && STOP.indexOf(nx.d[0]) >= 0) { out += "ं"; prevC = false; return; }
      if (u.t === "C") { if (prevC) out += HAL; out += u.d; prevC = true; }
      else {
        if (prevC) {
          if (u.short) { if (idx === units.length - 1) out += "ा"; }   // 'a' बीच में छोटा, अंत में ा
          else out += u.mat;
        } else out += u.ind;
        prevC = false;
      }
    });
    return out;
  }
  function convert(text) {
    return String(text).replace(/[A-Za-z]+/g, (w) => wordToHindi(w));
  }
  root.BatwaraHindi = { convert, hasLatin: (s) => /[A-Za-z]/.test(s) };
  if (typeof module !== "undefined" && module.exports) module.exports = root.BatwaraHindi;
})(typeof window !== "undefined" ? window : globalThis);

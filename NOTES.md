# NOTES — v2 (exact-match fix pass)

Reference screenshots (asli DLRS Bihar site, trhbhusurvey.bihar.gov.in) se pixel-level compare karke ye fixes kiye:

1. **Top info bar add kiya** — जिला / अंचल / मौजा / टोला / हलका / थाना नं॰, tabs ke upar. जिला/अंचल/हलका/थाना नं॰ plain editable text hain, मौजा/टोला dropdown hain (सब `index.html` me customize ho sakte hain). Ye अलग se `localStorage` (`khesraMeta_v1`) me save hote hain, per-entry data se independent.
2. **Active tab color fix** — olive-green (`#a2c445`), reference jaisa hi, plus poore tab-row ke neeche ek solid green underline bar.
3. **Tab 1 field order fix** — रैयत का नाम + पिता का नाम ek row me (teesra column khali), फिर agli row me आधार नं॰ + रैयत का नाम अंग्रेज़ी में + पुराना खाता/खेसरा+जोड़े — exactly reference ke order me (pehle आधार एक row upar galत jagah tha).
4. **Field colors fix** — sirf **धारण का प्रकार** aur **जाति** dropdown light-blue hain (reference jaisa); baaki sab fields (नया खेसरा, रैयत का नाम, आधार, पता, पिन कोड, ईमेल, रकबा, मोबाइल) ab **white/plain** hain. Tab 2 ke fields (रैयत का नाम, पिता-नाम-input, पता, जाति) apne khud ke reference screenshot ke hisab se blue rakhe hain.
5. **पिता/पति का नाम badge color** reference ke olive-green (`#c2d69a`) se match kiya.
6. **Note box** ab pure bright yellow (`#ffff00`) hai, jaisa asli site par hai.
7. **Save / Next buttons** ab रकबा row ke grid-columns ke neeche hi align hote hain (Save col-1 ke neeche, Next col-2 ke neeche, bada gap) — reference jaisa hi.
8. **Tab 2 ka पता field** do stacked light-blue boxes me todа (Tab 1 ke address-line pattern jaisa), taaki har tab apne screenshot se match kare.
9. Container ko halka box-shadow diya for card-jaisa look.

Baaki sab (Tab 3 चौहद्दी, Tab 4, bottom "New Entry/Tab" bar, save/load/localStorage logic) waisa hi hai — koi reference screenshot nahi tha un tabs ka to unka structure/colors पहले jaisa hi rakha.

Files: `index.html`, `style.css`, `script.js` — teeno me changes hain. `node --check script.js` se syntax verify kar liya hai.

# v3 — ऑटो स्केच
- `plotsketch.js` (नया, ~300 लाइन, ब्राउज़र में ही चलता है): `detect` (रंग/टैप से प्लॉट, छेद भरना, किनारे चिकने, बहुभुज), `layout` (रकवा-अनुपात पर समान्तर कटाव, auto दिशा), `draw` (सफ़ेद बैकग्राउंड, रंगीन हिस्से, नाम + रकवा).
- `script.js`: अभियुक्ति section बदला; `openSketch` वाला modal; `plot.abhi_cfg` में दिशा/हिस्से/टैप-बिंदु सेव होते हैं (मूल फोटो सेव नहीं होती, सिर्फ़ बना स्केच).
- `style.css` के अंत में `.sk-*` स्टाइल, `index.html` में `plotsketch.js` का tag.

# v4 — कटाव के नए तरीके (स्केच में)
- "बँटवारे की रेखाएँ" में अब 2 नए विकल्प: **कोई भी कोण (Angle)** — slider से 0°–175° (0° आड़ी, 45° तिरछी, 90° खड़ी), रेखाएँ रकवा के अनुपात में; और **✏️ अपनी रेखा खींचें (Custom)** — बने हुए स्केच पर उँगली/माउस से खींचकर रेखा बनाएँ (अधिकतम 8, पूरे प्लॉट को आर-पार काटती है)।
- Custom में किसी हिस्से पर **टैप** करने से उसमें अगली अनुसूचि लगती है (आख़िर में खाली/भूरा); "आख़िरी रेखा हटाएँ", "सब हटाएँ", और 0°/45°/90° पर चिपकाने का विकल्प है।
- Custom में हाथ से खींची रेखा का नक्शा-अनुपात रकवा-अनुपात से कितना मेल खाता है, नीचे चिप्स में दिखता है (4% से ज़्यादा फ़र्क़ हो तो नारंगी)।
- `plot.abhi_cfg` में अब `angle`, `lines`, `assign` भी सेव होते हैं।
- बदली फाइलें: `plotsketch.js` (`customLayout`, `cellKey`, angle दिशा, draw में custom), `script.js` (modal UI, pointer events), `style.css` (अंत में).
- (v4.1) Custom में एक ही अनुसूचि के कई पास-पास हिस्से अपने-आप एक हो जाते हैं: बीच की रेखा नहीं दिखती और नाम + रकवा सबसे बड़े हिस्से में सिर्फ़ एक बार लिखा जाता है।

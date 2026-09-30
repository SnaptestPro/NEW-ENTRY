# बँटवारा पंचनामा — अनुसूचि प्रपत्र (DOCX भरने वाली site)

Plain HTML/CSS/JS — koi backend nahi. `index.html` browser me kholo. Data browser ke localStorage me apne-aap save hota hai.

## 4 steps (DOCX ke hisaab se)
1. **गाँव / थाना विवरण** — panchayat, halka, mauja, thana no., anchal, police thana, anumandal, rajasva thana, jila.
2. **अनुसूचियाँ** — har hissedar ka naam ("अनुसूचि सांख्या N बनाम्"). 3 se zyada ho to agla page apne aap banta hai.
3. **खतियानी पंक्तियाँ** — har row = DOCX ki ek row:
   - Col 1-6: रैयत नाम/पिता-पति/पता, जमाबंदी, खाता, खेसरा, खतियानी रकवा, नक्शा रकवा
   - Col 7-24 (har anusuchi): खाता, खेसरा, खतियानी रकवा, नक्शा रकवा, मिन जानिब, चौहद्दी (4 disha + ref khesra)
   - Col 25: अभियुक्ति
   - Rakba ka jod khatiyani/naksha rakba se apne aap milaya jata hai (✓ / ⚠).
4. **जाँच व डाउनलोड** — checks, summary table, DOCX download (5 row per page).

## Files
`index.html`, `style.css`, `script.js` (form), `batwara.js` (DOCX bharne ka code), `batwara_template.js` (embedded template), `jszip.min.js`.

## GitHub Pages
Sab files repo me upload karo → Settings → Pages → Branch: main / root.

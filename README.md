# बँटवारा पंचनामा — अनुसूचि प्रपत्र (DOCX भरने वाली site)

Plain HTML/CSS/JS — koi backend nahi. `index.html` browser me kholo. Data browser ke localStorage me apne-aap save hota hai.

## 4 steps
1. **गाँव / थाना विवरण** — panchayat, halka, mauja, thana no., anchal, police thana, anumandal, rajasva thana, jila.
2. **अनुसूचियाँ** — har hissedar ka naam. Jitni anusuchi banaoge, result me utni hi aayengi (ek page par max 3, zyada ho to agla page).
3. **रैयत + खेसरा पंक्तियाँ** — raiyat ka naam / pita-pati / pata **sirf ek baar**. Uske neeche jitne khesra, utni pankti (jamabandi/khata agli pankti me apne-aap aa jaate hain). Har pankti me sirf usi anusuchi ka hissa bharo jisme hissa hai.
4. **जाँच व डाउनलोड** — checks, summary, DOCX download.

## Purani DOCX dobara kholna
Is site se bani DOCX ke andar poora form-data chhupa rehta hai. Upar "DOCX से खोलें" dabakar (ya DOCX ko page par drag karke) wahi file chunein — sab data waisa hi bhar jaata hai. Sirf naye version se bani DOCX khulti hai.

## Naye features
- **Hissa apne aap baantna:** khesra ka kul rakba bharo, anusuchi par ✓ lagao, "kul rakba barabar baanto" dabao. "baaki rakba ise do" bacha hua rakba ek anusuchi me daal deta hai.
- **Kul jod ki jaanch:** Step 4 me raiyat-wise aur anusuchi-wise total aur mismatch.
- **DOCX/PDF setting:** page number, hastakshar ke khane, kul jod ki pankti, kagaz ka size (auto / A4 / A3 / Legal). "PDF / print" browser ke print se PDF banata hai.
- **Mere case:** naam dekar case save (sirf isi browser me), search, open, copy, delete.
- **Hindi typing:** English me likho (rajesh kumar), khana chhodte hi Hindi ban jaata hai. Lambi 'aa' ke liye aa likho. Menu me on/off.
- **Awaaz se bharna:** khane me click karke 🎤 dabao (Chrome/Edge/Safari).

## Purana data wapas
Sab kuch sirf isi browser me (local storage) save hota hai. "Pichla data" me pichle 20 version rehte hain: naya form / demo / delete / DOCX download se pehle, aur edit ke dauran har kuch minute me apne aap. Galti ho jaye to wahan se "Kholein".

## DOCX result ke niyam
- Pankti = jitni khesra entry bhari, utni hi (fixed 5 nahi).
- Naam/pita/pata ek baar, us raiyat ki saari panktiyon me merge.
- Jamabandi / khata agar lagatar panktiyon me same ho to merge hota hai.
- Jo column poori tarah khali hai (jaise mim janib, chauhaddi, abhiyukti) wo dikhta hi nahi.
- Anusuchi column = jitni anusuchi banai utne hi.
- Purana (v2) saved data apne-aap naye format me badal jaata hai.

## Files
`index.html`, `style.css`, `script.js` (form), `batwara.js` (DOCX bharne ka code), `batwara_template.js` (embedded template), `jszip.min.js`.

## GitHub Pages
Sab files repo me upload karo → Settings → Pages → Branch: main / root.

# खेसरा प्रविष्टि फॉर्म (Khesra Entry Form)

Plain HTML/CSS/JS web app — koi backend/build step nahi chahiye. Sab data browser ke `localStorage` me save hota hai.

## Files
- `index.html` — form structure
- `style.css` — styling
- `script.js` — tab-switching, add/remove rows, save/load logic

## Functions included
- Top bar: ज़िला / अंचल / मौजा / टोला / हलका / थाना नं॰
- Tab 1 — क्र.संख्या (1 से 8): मुख्य रैयत की पूरी जानकारी, पुराना खाता/खेसरा जोड़ने की table, रकबा (एकड़+डेसीमल) की note
- Tab 2 — अन्य हिस्सेदार हैं?: हाँ/नहीं टॉगल, हिस्सेदार जोड़ने की table
- Tab 3 — चौहद्दी (9-11): उत्तर/दक्षिण/पूर्व/पश्चिम + Ref Khesra No
- Tab 4 — क्र.संख्या 12 से आगे: additional khesra rows
- नीचे "New Entry" + "Tab 1/2/3..." — multiple records ke beech switch karne ke liye (sab kuch localStorage me save)

## Local run karne ke liye
Sirf `index.html` ko kisi bhi browser me double-click karke khol lo. Ya chaho to local server se:
```bash
python3 -m http.server 8000
```
phir browser me `http://localhost:8000` kholo.

## GitHub par upload / GitHub Pages se run karne ke liye
1. GitHub par naya repo banao (public).
2. Ye teeno file (`index.html`, `style.css`, `script.js`) us repo me upload karo (drag-drop ya `git push`).
3. Repo ke **Settings → Pages** me jao, **Branch: main**, folder `/root` select karke **Save** karo.
4. Kuch minute baad `https://<username>.github.io/<repo-name>/` par live site mil jayega.

## Customize karne ke liye
- ज़िला/अंचल/मौजा/टोला/जाति/धारण-का-प्रकार ke dropdown options `index.html` me `<option>` tags me edit kar sakte ho.
- Data sirf browser me (localStorage) save hota hai — agar server/database chahiye to backend alag se add karna hoga (ye pure static/offline version hai).

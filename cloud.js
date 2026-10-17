/* वैकल्पिक क्लाउड बैकअप — Firebase (Google लॉगिन + Firestore). config न हो तो कुछ नहीं करता. */
(function (root) {
  const V = "10.12.2";
  const SRC = ["app", "auth", "firestore"].map((n) => "https://www.gstatic.com/firebasejs/" + V + "/firebase-" + n + "-compat.js");
  let ready = null, auth = null, db = null, user = null, cb = null;

  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Firebase लोड नहीं हुआ (इंटरनेट जाँचें)"));
    document.head.appendChild(s);
  });
  const configured = () => !!root.BATWARA_FIREBASE;
  function init() {
    if (!configured()) return Promise.resolve(false);
    if (ready) return ready;
    ready = (async () => {
      for (const s of SRC) await loadScript(s);
      root.firebase.initializeApp(root.BATWARA_FIREBASE);
      auth = root.firebase.auth(); db = root.firebase.firestore();
      await new Promise((res) => { const un = auth.onAuthStateChanged((u) => { user = u; if (cb) cb(u); res(); un(); auth.onAuthStateChanged((x) => { user = x; if (cb) cb(x); }); }); });
      return true;
    })().catch((e) => { ready = null; throw e; });
    return ready;
  }
  async function signIn() { await init(); const r = await auth.signInWithPopup(new root.firebase.auth.GoogleAuthProvider()); user = r.user; return user; }
  async function signOut() { await init(); await auth.signOut(); user = null; }
  const col = () => db.collection("batwara_users").doc(user.uid).collection("cases");
  async function pull() { const q = await col().get(); return q.docs.map((d) => Object.assign({ id: d.id }, d.data())); }
  async function push(items) {
    const b = db.batch();
    items.forEach((it) => b.set(col().doc(it.id), { name: it.name, ts: it.ts, json: it.json }));
    await b.commit();
  }
  async function remove(id) { await col().doc(id).delete(); }
  root.BatwaraCloud = { configured, init, signIn, signOut, pull, push, remove, user: () => user, onAuth: (f) => { cb = f; } };
})(window);

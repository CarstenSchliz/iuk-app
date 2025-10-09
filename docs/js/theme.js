// docs/js/theme.js
import { auth } from "./firebase.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore();

export const Theme = {
  async init() {
    auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const pref = userDoc.exists() ? userDoc.data().themePreference : "light";
        this.apply(pref || "light");
      } catch (err) {
        console.error("Theme laden fehlgeschlagen:", err);
        this.apply("light");
      }
    });
  },

  apply(mode) {
    document.body.classList.toggle("dark", mode === "dark");
    const label = document.getElementById("themeLabel");
    if (label) label.textContent = mode === "dark" ? "Dunkel" : "Hell";
  },

  async toggle() {
    const mode = document.body.classList.contains("dark") ? "light" : "dark";
    this.apply(mode);
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { themePreference: mode }, { merge: true });
        console.log("Theme gespeichert:", mode);
      } catch (err) {
        console.error("Theme speichern fehlgeschlagen:", err);
      }
    }
  }
};

// Starte das Theme-System automatisch
Theme.init();

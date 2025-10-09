// Datei: docs/js/theme.js
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth } from "./firebase.js";

const db = getFirestore();

export const Theme = {
  // Initialisiere das Theme basierend auf der gespeicherten Firebase-Einstellung
  async init() {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const theme = snap.exists() ? snap.data().theme || "light" : "light";  // Standard auf "light"
    this.apply(theme);  // Anwenden des gespeicherten Themes
  },

  // Wendet das angegebene Theme an
  apply(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    const themeLabel = document.getElementById("themeLabel");
    if (themeLabel) themeLabel.textContent = theme === "dark" ? "Dunkel" : "Hell";
  },

  // Wechselt zwischen Dark und Light Mode und speichert die Änderung
  async toggle() {
    const user = auth.currentUser;
    if (!user) return;
    const isDark = document.body.classList.toggle("dark");  // Dark Mode aktivieren/deaktivieren
    const theme = isDark ? "dark" : "light";  // Bestimme das neue Theme

    // Speichern des neuen Themes in Firestore
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { theme }, { merge: true });

    // Label aktualisieren
    const themeLabel = document.getElementById("themeLabel");
    if (themeLabel) themeLabel.textContent = isDark ? "Dunkel" : "Hell";
  },
};

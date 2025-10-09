// docs/js/theme.js

// -------------------------------
// Zentraler Dark Mode Controller
// -------------------------------

// Theme anwenden auf <html>
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Theme in Firebase speichern
async function saveThemeToFirebase(userId, theme) {
  try {
    await firebase.firestore().collection("users").doc(userId).set({ theme }, { merge: true });
  } catch (err) {
    console.error("Fehler beim Speichern des Themes:", err);
  }
}

// Theme aus Firebase laden
async function loadThemeFromFirebase(userId) {
  try {
    const doc = await firebase.firestore().collection("users").doc(userId).get();
    if (doc.exists && doc.data().theme) {
      applyTheme(doc.data().theme);
      return doc.data().theme;
    } else {
      // Standardmäßig Light Mode, falls kein Eintrag existiert
      applyTheme("light");
      return "light";
    }
  } catch (err) {
    console.error("Fehler beim Laden des Themes:", err);
    applyTheme("light");
    return "light";
  }
}

// Theme umschalten
async function toggleTheme(userId) {
  const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  await saveThemeToFirebase(userId, newTheme);
}

// -------------------------------
// Initialisierung
// -------------------------------
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await loadThemeFromFirebase(user.uid);
  } else {
    // Nicht eingeloggt: Standard-Theme
    applyTheme("light");
  }
});


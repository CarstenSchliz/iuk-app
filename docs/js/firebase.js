// public/js/firebase.js
// Firebase Setup & Auth-Funktionen ausgelagert

// Importiere Firebase Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// === Deine Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDIuKwYoKQDyzy6qpmY2LGahJofZx6qnuw",
  authDomain: "iuk-app.firebaseapp.com",
  projectId: "iuk-app",
  storageBucket: "iuk-app.appspot.com", // Korrigiert!
  messagingSenderId: "759014128178",
  appId: "1:759014128178:web:09c3690cd95b402c8ada2b",
  measurementId: "G-ZPD5VPD5TS"
};

// === Initialisieren ===
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Persistenz: User bleibt eingeloggt (auch nach Reload)
setPersistence(auth, browserLocalPersistence);


// === Hilfsfunktion: Fehlertexte übersetzen ===
export function translateFirebaseError(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Die eingegebene E-Mail-Adresse ist ungültig.";
    case "auth/user-disabled":
      return "Dieses Konto wurde deaktiviert.";
    case "auth/user-not-found":
      return "Es existiert kein Benutzer mit dieser E-Mail.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Das eingegebene Passwort ist falsch.";
    case "auth/email-already-in-use":
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach (mindestens 6 Zeichen).";
    case "auth/missing-password":
      return "Bitte geben Sie ein Passwort ein.";
    case "auth/network-request-failed":
      return "Netzwerkfehler – bitte Internetverbindung prüfen.";
    default:
      return "Ein unbekannter Fehler ist aufgetreten. (" + errorCode + ")";
  }
}


// === Auth Funktionen ===
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCred.user);

  // User-Dokument in Firestore anlegen
  await setDoc(doc(db, "users", userCred.user.uid), {
    email,
    displayName: "",
    phone: "",
    mobile: "",
    photoURL: ""
  });

  return userCred;
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  return signOut(auth);
}


// === Profil aktualisieren ===
export async function updateUserProfile(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("Kein Nutzer eingeloggt");

  // Firebase Auth updaten
  if (data.displayName) {
    await updateProfile(user, { displayName: data.displayName });
  }

  // Firestore updaten
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    displayName: data.displayName || user.displayName,
    phone: data.phone || "",
    mobile: data.mobile || "",
    photoURL: data.photoURL || user.photoURL || ""
  });
}


// === Profilbild hochladen ===
export async function uploadProfileImage(file) {
  const user = auth.currentUser;
  if (!user) throw new Error("Kein Nutzer eingeloggt");

  const storageRef = ref(storage, `profileImages/${user.uid}.jpg`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  // Profil aktualisieren
  await updateProfile(user, { photoURL: downloadURL });

  // Firestore auch updaten
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, { photoURL: downloadURL });

  return downloadURL;
}


// === State Observer ===
// Kann in app.html genutzt werden, um zu prüfen ob jemand eingeloggt ist
export function observeAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Firestore Daten holen
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      let data = {};
      if (docSnap.exists()) {
        data = docSnap.data();
      }

      callback({
        uid: user.uid,
        email: user.email,
        displayName: data.displayName || user.displayName || "",
        phone: data.phone || "",
        mobile: data.mobile || "",
        photoURL: data.photoURL || user.photoURL || ""
      });
    } else {
      callback(null);
    }
  });
}

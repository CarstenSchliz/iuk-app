// public/js/firebase.js
// === Firebase Setup, Auth, Firestore & Storage ===

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
  storageBucket: "iuk-app.firebasestorage.app",
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

  // Leeres Profil-Dokument in Firestore anlegen
  await setDoc(doc(db, "users", userCred.user.uid), {
    name: "",
    email: userCred.user.email,
    photoURL: "",
    phone: "",
    mobile: ""
  });

  return userCred;
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  return signOut(auth);
}

// === State Observer ===
export function observeAuthState(callback) {
  onAuthStateChanged(auth, callback);
}

// === Profilfunktionen ===

// Nutzerprofil aus Firestore laden
export async function getUserProfile(uid) {
  const refDoc = doc(db, "users", uid);
  const snap = await getDoc(refDoc);
  return snap.exists() ? snap.data() : null;
}

// Nutzerprofil aktualisieren (Name, Telefon etc.)
export async function updateUserProfile(uid, data) {
  const user = auth.currentUser;
  if (!user) throw new Error("Kein User eingeloggt");

  // Auth-Profil (nur Name & Foto)
  if (data.name || data.photoURL) {
    await updateProfile(user, {
      displayName: data.name || user.displayName,
      photoURL: data.photoURL || user.photoURL
    });
  }

  // Firestore Profil
  const refDoc = doc(db, "users", uid);
  await setDoc(refDoc, {
    name: data.name || user.displayName || "",
    email: user.email,
    photoURL: data.photoURL || user.photoURL || "",
    phone: data.phone || "",
    mobile: data.mobile || ""
  }, { merge: true });
}

// Profilbild hochladen
export async function uploadProfileImage(file, uid) {
  if (!file) throw new Error("Keine Datei ausgewählt");

  const storageRef = ref(storage, `profileImages/${uid}.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // Profil sofort updaten
  await updateUserProfile(uid, { photoURL: url });

  return url;
}

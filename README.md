# IuK Lernwelt App

Dies ist die Web-App **IuK Lernwelt**, entwickelt mit **Firebase** (Authentication, später Storage)  
und modernen Web-Technologien (PWA-ready).

## 🚀 Struktur

```
iuk-app/
│
├── public/
│   ├── index.html          # Login-Seite
│   ├── app.html            # Haupt-App nach Login
│   ├── manifest.json       # PWA Manifest
│   ├── service-worker.js   # Service Worker für Offline-Funktion
│   │
│   ├── assets/             # Bilder & Icons
│   │   ├── drk-icon.png
│   │   ├── iuk-icon.png
│   │   ├── profile-placeholder.png
│   │   └── weiteres-bild.png
│   │
│   ├── css/                # Stylesheets
│   │   └── style.css
│   │
│   └── js/                 # JavaScript-Dateien
│       └── firebase.js
│
└── README.md               # Projektbeschreibung
```

## ⚙️ Installation

### Voraussetzungen
- Node.js empfohlen
- Git installiert
- Firebase-Projekt vorhanden (Spark oder Blaze)

### Schritte
1. Repo klonen:
   ```bash
   git clone https://github.com/CarstenSchliz/iuk-app
   cd iuk-app
   ```

2. Lokalen Server starten (z. B. mit VS Code Live Server oder `npx serve`):
   ```bash
   npx serve public
   ```

3. App öffnen:
   ```
   http://localhost:3000
   ```

## 🔑 Features

- Firebase Authentication (E-Mail/Passwort)
- Registrierung & Passwort zurücksetzen
- Profilbild-Upload (später Firebase Storage)
- PWA (Offline nutzbar, installierbar)

---

✍️ Autor: Carsten Schliz  
📅 Stand: 2025

// =====================================================================
//  Carnet de voyage & souvenirs — Configuration
// ---------------------------------------------------------------------
//  Synchronisation famille ACTIVÉE (compte partagé via Firebase).
//  Ces clés Firebase peuvent figurer dans un dépôt public : elles
//  identifient le projet, elles n'ouvrent aucun accès. La sécurité est
//  assurée par l'authentification + les règles Firestore.
// =====================================================================

// --- Firebase --------------------------------------------------------
export const firebaseConfig = {
  apiKey:            "AIzaSyD3HZgYAQQoh0FqTks-Ca23wG7rR0iHVTM",
  authDomain:        "carnet-famille.firebaseapp.com",
  projectId:         "carnet-famille",
  storageBucket:     "carnet-famille.firebasestorage.app",
  messagingSenderId: "664807882497",
  appId:             "1:664807882497:web:529a6ff09fd60ed4d0a500",
};

// Synchronisation temps réel active.
export const USE_FIREBASE = true;

// --- Météo (optionnel) ----------------------------------------------
//  'demo' (par défaut), 'open-meteo' (gratuit, sans clé) ou 'openweather'.
export const WEATHER_PROVIDER = "demo";
export const OPENWEATHER_KEY  = "";

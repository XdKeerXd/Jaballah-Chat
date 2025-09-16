// Minimal Firebase config helper for modular SDK
// Replace the placeholder values with your Firebase project config

export const firebaseConfig = {
  apiKey: "AIzaSyDgEuge-mEYxj3yleytNqXdHaVLp9xQMXls",
  authDomain: "jaballahchat.firebaseapp.com",
  projectId: "jaballahchat",
  storageBucket: "jaballahchat.firebasestorage.app",
  messagingSenderId: "132290046194",
  appId: "1:132290046194:web:604f366708cb0c7e4cc86b",
  measurementId: "G-VYHHLVP87K"
};

export function ensureFirebaseConfigSet() {
  if (firebaseConfig.apiKey.startsWith("REPLACE")) {
    console.warn("firebase-config.js: please replace placeholder values with your Firebase project config.");
  }
}

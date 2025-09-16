// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDgEuge-mEYxj3yleytNqXdHaVLp9QMXls",
  authDomain: "jaballahchat.firebaseapp.com",
  projectId: "jaballahchat",
  storageBucket: "jaballahchat.appspot.com",
  messagingSenderId: "132290046194",
  appId: "1:132290046194:web:604f366708cb0c7e4cc86b",
  measurementId: "G-VYHHLVP87K"
};

export function ensureFirebaseConfigSet() {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase config not set! Set your config in firebase-config.js');
  }
}

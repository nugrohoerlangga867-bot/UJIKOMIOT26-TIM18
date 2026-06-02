// Firebase Configuration
// Project: monitoring-92e1e
// PENTING: Jangan commit file ini ke repository publik.
// Gunakan Firebase Security Rules untuk membatasi akses data.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAuPtpwwOzV_srlRGOaLwH4K5l1Pw-HFBY",
  authDomain: "ujikomiot26.firebaseapp.com",
  databaseURL: "https://ujikomiot26-default-rtdb.firebaseio.com",
  projectId: "ujikomiot26",
  storageBucket: "ujikomiot26.firebasestorage.app",
  messagingSenderId: "270822194169",
  appId: "1:270822194169:web:d65e1a932632de38c89b28",
  measurementId: "G-B8S2261MDY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;

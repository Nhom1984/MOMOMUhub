// Firebase configuration and initialization for MEMOMU leaderboard
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0u7UjVX6ug9pA71PtIGUhQ8MQ1K2e-OQ",
  authDomain: "memomu-15179.firebaseapp.com",
  projectId: "memomu-15179",
  storageBucket: "memomu-15179.appspot.app",
  messagingSenderId: "569095051369",
  appId: "1:569095051369:web:762b8db6b9f1a987ac2af8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

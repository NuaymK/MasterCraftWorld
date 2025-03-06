const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin
const app = initializeApp({
  // These will be provided by environment variables in production
  // For now, we'll use placeholder values
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || "mastercraftworld",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "placeholder@example.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "placeholder-key"
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "mastercraftworld.appspot.com"
});

// Initialize services
const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

// Example: Export the initialized services for use in other files
module.exports = {
  app,
  db,
  auth,
  storage
};

console.log("Firebase Admin SDK initialized successfully");
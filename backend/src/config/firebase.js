const admin = require('firebase-admin');
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID || 'mastercraftworld-c0482'}.firebaseio.com`,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = {
  admin,
  db,
  auth,
  storage
};
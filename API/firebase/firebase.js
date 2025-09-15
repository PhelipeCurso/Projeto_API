const admin = require('firebase-admin');
require('dotenv').config();
console.log(">> ENV carregado:", process.env.FIREBASE_PROJECT_ID);
console.log(">> Chave começa com:", process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30));

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
module.exports = db;

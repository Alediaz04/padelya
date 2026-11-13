// js/firebase-config.js
// Inicialización oficial de Firebase para PadelYa
// Compatible directamente con navegador (scripts en HTML) usando SDK v9/compat

const firebaseConfig = {
  apiKey: "AIzaSyAcBybCbZpkBwiiyqdd6RHRIfxXZzYfN2o",
  authDomain: "padelya-d7894.firebaseapp.com",
  projectId: "padelya-d7894",
  storageBucket: "padelya-d7894.firebasestorage.app",
  messagingSenderId: "1041027474529",
  appId: "1:1041027474529:web:fabc2b069deeaacfb1f620"
};

// Inicializamos la app de Firebase si está disponible la librería global
let firebaseApp = null;
let db = null;

if (typeof firebase !== 'undefined') {
  firebaseApp = firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}


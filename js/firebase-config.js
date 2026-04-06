// ========================================
// Firebase Config — O Tom das Notas
// Inicialização segura com fallback
// ========================================

var FIREBASE_ENABLED = false;
var db = null;
var auth = null;

try {
    var firebaseConfig = {
        apiKey: "AIzaSyBUT-Sp1yZG6b6LU6cn3GvJp4zMGizHID0",
        authDomain: "otom-das-notas.firebaseapp.com",
        projectId: "otom-das-notas",
        storageBucket: "otom-das-notas.firebasestorage.app",
        messagingSenderId: "458292321177",
        appId: "1:458292321177:web:866250fab60d158e5a5108"
    };

    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        FIREBASE_ENABLED = true;
        console.log('[O Tom] Firebase conectado com sucesso');
    } else {
        console.warn('[O Tom] Firebase SDK não carregou. Usando localStorage.');
    }
} catch (err) {
    console.warn('[O Tom] Erro ao inicializar Firebase:', err.message, '— usando localStorage.');
    FIREBASE_ENABLED = false;
}

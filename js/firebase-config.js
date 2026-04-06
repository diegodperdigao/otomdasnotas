// ========================================
// Firebase Config — O Tom das Notas
// ========================================
// INSTRUÇÕES:
// 1. Acesse https://console.firebase.google.com
// 2. Crie um projeto (ex: "otom-das-notas")
// 3. Ative o Firestore Database (modo teste para começar)
// 4. Ative Authentication > Email/Senha
// 5. Vá em Configurações do Projeto > Apps > Web > Registrar app
// 6. Copie os valores do firebaseConfig abaixo
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyBUT-Sp1yZG6b6LU6cn3GvJp4zMGizHID0",
    authDomain: "otom-das-notas.firebaseapp.com",
    projectId: "otom-das-notas",
    storageBucket: "otom-das-notas.firebasestorage.app",
    messagingSenderId: "458292321177",
    appId: "1:458292321177:web:866250fab60d158e5a5108"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Flag: Firebase está configurado?
const FIREBASE_ENABLED = firebaseConfig.apiKey !== "SUA_API_KEY";

if (!FIREBASE_ENABLED) {
    console.warn('[O Tom das Notas] Firebase não configurado. Usando apenas localStorage. Edite js/firebase-config.js com suas credenciais.');
}

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuração fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyBmmP67xADJwfUwAG3EoDRCaj_Ls5gtO9o",
  authDomain: "bingapp-2026.firebaseapp.com",
  projectId: "bingapp-2026",
  storageBucket: "bingapp-2026.firebasestorage.app",
  messagingSenderId: "83422905332",
  appId: "1:83422905332:web:0946f1bfe281b5cf016fa1",
  measurementId: "G-8JNPTYGKST"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

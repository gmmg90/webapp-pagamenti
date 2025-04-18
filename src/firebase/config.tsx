import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDNRHI3Xyxcs4uOM24l7cA7NzFIdmN3V5I",
    authDomain: "gelarredi-01.firebaseapp.com",
    projectId: "gelarredi-01",
    storageBucket: "gelarredi-01.firebasestorage.app",
    messagingSenderId: "737318035883",
    appId: "1:737318035883:web:f895d28be947612af432ee"
  };

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
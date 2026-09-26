// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "zatpat-food-auth.firebaseapp.com",
  projectId: "zatpat-food-auth",
  storageBucket: "zatpat-food-auth.firebasestorage.app",
  messagingSenderId: "1063593409242",
  appId: "1:1063593409242:web:9e602b37919629ef0583e3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth=getAuth(app)
export {app,auth}



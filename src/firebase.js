// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAz4XhruGRMtEechxhyvfpWbzmU-UvXyYY",
  authDomain: "chatapp-5c696.firebaseapp.com",
  projectId: "chatapp-5c696",
  storageBucket: "chatapp-5c696.firebasestorage.app",
  messagingSenderId: "1079183048005",
  appId: "1:1079183048005:web:d3dbc63ad157a102da922c",
  measurementId: "G-2WLZT033XW"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export the Firebase services you'll use
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage'; // ✅ added

const firebaseConfig = {
  apiKey: "AIzaSyD35DfogPTaswSCZngmm1jUmxUR4N-i2nA",
  authDomain: "craftersparadise-8c962.firebaseapp.com",
  databaseURL: "https://craftersparadise-8c962-default-rtdb.firebaseio.com",
  projectId: "craftersparadise-8c962",
  storageBucket: "craftersparadise-8c962.appspot.com",
  messagingSenderId: "419818070255",
  appId: "1:419818070255:web:c340c25a65fddbbfa67b1a",
  measurementId: "G-M6YG4QHE3X"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app); // ✅ added

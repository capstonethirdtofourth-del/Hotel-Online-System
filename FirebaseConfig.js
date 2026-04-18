import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCRbIGemc9zpH9BSNamccQtKviILGX3PLI",
  authDomain: "hotel-online-system.firebaseapp.com",
  projectId: "hotel-online-system",
  storageBucket: "hotel-online-system.firebasestorage.app",
  messagingSenderId: "160477152877",
  appId: "1:160477152877:web:5ce89023a1860086f62164",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import { GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDLNWIqVizTq8G00UlcKJiyhWzxsfNQy-8",
  authDomain: "kappi-aa9dc.firebaseapp.com",
  projectId: "kappi-aa9dc",
  storageBucket: "kappi-aa9dc.firebasestorage.app",
  messagingSenderId: "648552085310",
  appId: "1:648552085310:web:753c72d09ad2add28e5e6f",
  measurementId: "G-GHH11Y8F3L"
};

// Initialize Firebase if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Create providers for web
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export { firebase, auth, googleProvider, facebookProvider }; 
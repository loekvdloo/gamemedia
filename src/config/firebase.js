import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

const firebaseConfig = {

  apiKey: "AIzaSyD9cxjLyEahS4ITAfT7VOtxIC9qmdSEZXg",

  authDomain: "social-rocnijmegen.firebaseapp.com",

  projectId: "social-rocnijmegen",

  storageBucket: "social-rocnijmegen.firebasestorage.app",

  messagingSenderId: "752849656917",

  appId: "1:752849656917:web:438839f2f368b280bfc8dc"

};


// Initialize Firebase

const app = initializeApp(firebaseConfig); 

export const db = getFirestore(app);

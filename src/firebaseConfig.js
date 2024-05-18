import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCaN32sPjOUCjjFoceL3cqIV6w692RgkYI",
    authDomain: "hypox-dtect.firebaseapp.com",
    databaseURL: "https://hypox-dtect-default-rtdb.firebaseio.com",
    projectId: "hypox-dtect",
    storageBucket: "hypox-dtect.appspot.com",
    messagingSenderId: "185874131250",
    appId: "1:185874131250:web:acfb4aad20d5e820f14f2b",
    measurementId: "G-FWJWKE2H89"
  };

  const app = initializeApp(firebaseConfig);

  // Initialize Firestore
  const db = getFirestore(app);
  
  export { db };
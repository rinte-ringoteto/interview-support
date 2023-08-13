import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChhI0iC7NwqozXj27q7ET4n4rkTDGk_Gc",
  authDomain: "interview-support-d4166.firebaseapp.com",
  projectId: "interview-support-d4166",
  storageBucket: "interview-support-d4166.appspot.com",
  messagingSenderId: "29514590513",
  appId: "1:29514590513:web:17437f38e8ae980cf2e810",
  measurementId: "G-3KTRQGZEGD",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

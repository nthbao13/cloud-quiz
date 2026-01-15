// Firebase Configuration
// Replace these values with your own Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyC_tNxOpmMs3LWlKyuOTiwKvyeDm2WhUno",
  authDomain: "cloud-quiz-online.firebaseapp.com",
  databaseURL: "https://cloud-quiz-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cloud-quiz-online",
  storageBucket: "cloud-quiz-online.firebasestorage.app",
  messagingSenderId: "188007062327",
  appId: "1:188007062327:web:4032f706fcf58ad9b318b2",
  measurementId: "G-HXM50XG3QB"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Get database reference
const database = firebase.database();



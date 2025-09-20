// Import functions from the Firebase SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB7H_GFklwLJnqUPZGXWH9AKkJWG3Mc9fU",
  authDomain: "chat-app-2bad9.firebaseapp.com",
  projectId: "chat-app-2bad9",
  storageBucket: "chat-app-2bad9.firebasestorage.app",
  messagingSenderId: "900500112369",
  appId: "1:900500112369:web:506dc9d4bd56ab27c7ba50",
  measurementId: "G-V80NC8TQGJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Sign in the user anonymously
signInAnonymously(auth).catch(err => {
    console.error("Anonymous sign-in failed:", err);
});

// Get references to HTML elements
const msgBox = document.getElementById('msgBox');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');

// Reference to the "messages" collection in Firestore
const messagesRef = collection(db, "messages");

// --- Send a message ---
const sendMessage = () => {
  const messageText = msgBox.value.trim();
  if (messageText) {
    addDoc(messagesRef, {
      text: messageText,
      timestamp: serverTimestamp() // Use server's timestamp
    }).catch(err => console.error("Error sending message:", err));
    msgBox.value = ""; // Clear the input box
  }
};

// Add click event to the send button
sendBtn.onclick = sendMessage;

// Allow pressing Enter to send a message
msgBox.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});


// --- Listen for and display new messages ---
const q = query(messagesRef, orderBy("timestamp")); // Order messages by time

onSnapshot(q, (snapshot) => {
  messagesDiv.innerHTML = ""; // Clear existing messages
  snapshot.forEach(doc => {
    const msg = doc.data();
    // ✅ CORRECTED SYNTAX using backticks (`)
    messagesDiv.innerHTML += `<div class="msg msg-in">${msg.text}</div>`;
  });
  // Auto-scroll to the latest message
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

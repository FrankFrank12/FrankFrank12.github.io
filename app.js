// Import functions from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

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

// Get references to HTML elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const phoneBox = document.getElementById('phoneBox');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const otpGroup = document.getElementById('otp-group');
const otpBox = document.getElementById('otpBox');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const msgBox = document.getElementById('msgBox');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');
const logoutBtn = document.getElementById('logoutBtn');

// --- Authentication Logic ---

// 1. Set up the reCAPTCHA verifier
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  'size': 'invisible', // Makes the reCAPTCHA UI invisible to the user
});

let confirmationResult; // To store the confirmation result object

// 2. Send OTP to the user's phone
sendOtpBtn.onclick = () => {
  const phoneNumber = phoneBox.value;
  if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
    alert("Please enter a valid phone number in E.164 format (e.g., +919876543210).");
    return;
  }
  
  const appVerifier = window.recaptchaVerifier;
  signInWithPhoneNumber(auth, phoneNumber, appVerifier)
    .then((result) => {
      // SMS sent. Show the OTP input field.
      confirmationResult = result;
      otpGroup.style.display = 'block';
      alert("OTP sent successfully!");
    }).catch((error) => {
      console.error("Error sending OTP:", error);
      alert("Error sending OTP. Check the console for details.");
      // Reset reCAPTCHA if something goes wrong
      grecaptcha.reset(window.recaptchaWidgetId);
    });
};

// 3. Verify OTP and sign in
verifyOtpBtn.onclick = () => {
  const otp = otpBox.value;
  if (!otp || otp.length !== 6) {
    alert("Please enter a valid 6-digit OTP.");
    return;
  }

  confirmationResult.confirm(otp)
    .then((result) => {
      // User signed in successfully.
      const user = result.user;
      console.log("User signed in:", user);
    }).catch((error) => {
      console.error("Error verifying OTP:", error);
      alert("Invalid OTP. Please try again.");
    });
};

// 4. Logout User
logoutBtn.onclick = () => {
    signOut(auth);
};


// --- Main App Logic: Manage UI based on Auth State ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    
    // Load and display chat messages
    initializeChat(user);

  } else {
    // User is logged out
    loginContainer.style.display = 'block';
    chatContainer.style.display = 'none';
  }
});


// --- Chat Functionality ---
let unsubscribeFromChat; // To stop listening for messages when user logs out

function initializeChat(user) {
  const messagesRef = collection(db, "messages");
  
  // Send a message
  const sendMessage = () => {
    const messageText = msgBox.value.trim();
    if (messageText) {
      addDoc(messagesRef, {
        uid: user.uid, // Store the user's ID
        phone: user.phoneNumber, // Store user's phone number
        text: messageText,
        timestamp: serverTimestamp()
      });
      msgBox.value = "";
    }
  };
  
  sendBtn.onclick = sendMessage;
  msgBox.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

  // Listen for and display new messages
  const q = query(messagesRef, orderBy("timestamp"));
  
  // Unsubscribe from any previous listener before starting a new one
  if (unsubscribeFromChat) {
      unsubscribeFromChat();
  }
  
  unsubscribeFromChat = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      // You can add logic here to style messages differently if they are from the current user
      messagesDiv.innerHTML += `<div><strong>${msg.phone || 'Anonymous'}:</strong> ${msg.text}</div>`;
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}
  // Auto-scroll to the latest message
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});


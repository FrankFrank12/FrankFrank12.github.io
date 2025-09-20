// --- SITE-WIDE PASSWORD PROTECTION ---

// 1. Set your secret password here
const SITE_PASSWORD = "1980"; // Change this to your desired password

// 2. Prompt the user when they visit the site
const enteredPassword = prompt("Please enter the password to access this site:");

// 3. Check the password
if (enteredPassword === SITE_PASSWORD) {
  // If correct, show the entire app
  document.getElementById('app-wrapper').style.display = 'block';
} else {
  // If incorrect, show an alert and keep the app hidden
  alert("Incorrect password. Access denied.");
}

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

// Get references to all UI containers and elements
const loginContainer = document.getElementById('login-container');
const selectChatContainer = document.getElementById('select-chat-container');
const chatContainer = document.getElementById('chat-container');
// ... (other elements from previous step)
const phoneBox = document.getElementById('phoneBox');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const otpGroup = document.getElementById('otp-group');
const otpBox = document.getElementById('otpBox');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const recipientPhoneBox = document.getElementById('recipientPhoneBox');
const startChatBtn = document.getElementById('startChatBtn');
const logoutBtnSelect = document.getElementById('logoutBtnSelect');
const chatHeader = document.getElementById('chat-header');
const msgBox = document.getElementById('msgBox');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');
const backBtn = document.getElementById('backBtn');


// --- Authentication Logic (Largely the same) ---
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
let confirmationResult;
sendOtpBtn.onclick = () => {
  const phoneNumber = phoneBox.value;
  signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
    .then(result => {
      confirmationResult = result;
      otpGroup.style.display = 'block';
      alert("OTP sent!");
    }).catch(error => console.error("OTP Error", error));
};
verifyOtpBtn.onclick = () => {
  confirmationResult.confirm(otpBox.value).catch(error => alert("Invalid OTP"));
};
logoutBtnSelect.onclick = () => signOut(auth);


// --- Main App Logic: Manage UI based on Auth State ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in, show the chat selection screen
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'none';
    selectChatContainer.style.display = 'block';
  } else {
    // User is logged out, show the login screen
    loginContainer.style.display = 'block';
    chatContainer.style.display = 'none';
    selectChatContainer.style.display = 'none';
  }
});


// --- Chat Selection and Initialization ---
startChatBtn.onclick = () => {
  const currentUser = auth.currentUser;
  const recipientPhone = recipientPhoneBox.value;
  
  if (!recipientPhone || !/^\+[1-9]\d{1,14}$/.test(recipientPhone)) {
      alert("Please enter a valid recipient phone number in E.164 format (e.g., +919876543210).");
      return;
  }
  if (recipientPhone === currentUser.phoneNumber) {
      alert("You cannot chat with yourself.");
      return;
  }

  // ** Generate the unique chat ID **
  const phoneNumbers = [currentUser.phoneNumber, recipientPhone].sort();
  const chatId = phoneNumbers.join('_');

  // Show the chat screen
  selectChatContainer.style.display = 'none';
  chatContainer.style.display = 'block';
  chatHeader.innerText = `Chat with ${recipientPhone}`;

  // Initialize the chat for this specific chat ID
  initializeChat(currentUser, chatId);
};

backBtn.onclick = () => {
    if (unsubscribeFromChat) unsubscribeFromChat(); // Stop listening to messages
    chatContainer.style.display = 'none';
    selectChatContainer.style.display = 'block';
};

// --- Chat Functionality ---
let unsubscribeFromChat;

function initializeChat(user, chatId) {
  // ** Reference to the specific, private messages subcollection **
  const messagesRef = collection(db, "chats", chatId, "messages");

  // Send a message
  const sendMessage = () => {
    const messageText = msgBox.value.trim();
    if (messageText) {
      addDoc(messagesRef, {
        sender: user.phoneNumber,
        text: messageText,
        timestamp: serverTimestamp()
      });
      msgBox.value = "";
    }
  };
  
  sendBtn.onclick = sendMessage;
  msgBox.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

  // Listen for messages in this private room
  const q = query(messagesRef, orderBy("timestamp"));
  
  unsubscribeFromChat = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const align = msg.sender === user.phoneNumber ? 'right' : 'left';
      messagesDiv.innerHTML += `<div style="text-align: ${align}; margin: 5px;">${msg.text}</div>`;
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}




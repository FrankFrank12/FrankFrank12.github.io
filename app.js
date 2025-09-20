// --- SITE-WIDE PASSWORD PROTECTION ---
const SITE_PASSWORD = "1980";
if (sessionStorage.getItem('site_access_granted') !== 'true') {
  const enteredPassword = prompt("Please enter the password to access this site:");
  if (enteredPassword === SITE_PASSWORD) {
    sessionStorage.setItem('site_access_granted', 'true');
  } else {
    alert("Incorrect password. Access denied.");
    // Stop script execution if password is wrong
    throw new Error("Access Denied");
  }
}
document.getElementById('app-wrapper').style.display = 'flex';


// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7H_GFklwLJnqUPZGXWH9AKkJWG3Mc9fU",
  authDomain: "chat-app-2bad9.firebaseapp.com",
  projectId: "chat-app-2bad9",
  storageBucket: "chat-app-2bad9.firebasestorage.app",
  messagingSenderId: "900500112369",
  appId: "1:900500112369:web:506dc9d4bd56ab27c7ba50",
  measurementId: "G-V80NC8TQGJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- UI ELEMENT REFERENCES ---
const loginContainer = document.getElementById('login-container');
const selectChatContainer = document.getElementById('select-chat-container');
const chatContainer = document.getElementById('chat-container');
const phoneBox = document.getElementById('phoneBox');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const otpGroup = document.getElementById('otp-group');
const otpBox = document.getElementById('otpBox');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const recipientPhoneBox = document.getElementById('recipientPhoneBox');
const startChatBtn = document.getElementById('startChatBtn');
const logoutBtnSelect = document.getElementById('logoutBtnSelect');
const chatTitle = document.getElementById('chat-title');
const msgBox = document.getElementById('msgBox');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');
const backBtn = document.getElementById('backBtn');
const themeToggle = document.getElementById('theme-toggle');

// --- DARK MODE LOGIC ---
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = '🌙';
  }
}

themeToggle.addEventListener('click', () => {
  const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
});

// Apply saved theme on load
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);


// --- AUTHENTICATION LOGIC ---
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
let confirmationResult;
sendOtpBtn.onclick = () => {
  let phoneNumber = phoneBox.value.trim();
  if (phoneNumber.length === 10 && /^\d{10}$/.test(phoneNumber)) {
    phoneNumber = "+91" + phoneNumber;
  }
  if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
    alert("Please enter a valid phone number.");
    return;
  }
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


// --- UI MANAGEMENT BASED ON AUTH STATE ---
onAuthStateChanged(auth, (user) => {
  loginContainer.style.display = user ? 'none' : 'flex';
  selectChatContainer.style.display = user ? 'flex' : 'none';
  chatContainer.style.display = 'none';
});


// --- CHAT SELECTION & INITIALIZATION ---
startChatBtn.onclick = () => {
  const currentUser = auth.currentUser;
  let recipientPhone = recipientPhoneBox.value.trim();
   if (recipientPhone.length === 10 && /^\d{10}$/.test(recipientPhone)) {
    recipientPhone = "+91" + recipientPhone;
  }
  
  if (!recipientPhone || !/^\+[1-9]\d{1,14}$/.test(recipientPhone)) {
      alert("Please enter a valid recipient phone number.");
      return;
  }
  if (recipientPhone === currentUser.phoneNumber) {
      alert("You cannot chat with yourself.");
      return;
  }

  const phoneNumbers = [currentUser.phoneNumber, recipientPhone].sort();
  const chatId = phoneNumbers.join('_');

  selectChatContainer.style.display = 'none';
  chatContainer.style.display = 'flex';
  chatTitle.innerText = recipientPhone;

  initializeChat(currentUser, chatId);
};

backBtn.onclick = () => {
    if (unsubscribeFromChat) unsubscribeFromChat();
    chatContainer.style.display = 'none';
    selectChatContainer.style.display = 'flex';
};

// --- CHAT FUNCTIONALITY ---
let unsubscribeFromChat;

function initializeChat(user, chatId) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  
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

  const q = query(messagesRef, orderBy("timestamp"));
  
  unsubscribeFromChat = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const msgDiv = document.createElement('div');
      msgDiv.textContent = msg.text;
      
      // *** THIS IS THE NEW PART FOR MESSAGE BUBBLES ***
      msgDiv.classList.add('msg');
      if (msg.sender === user.phoneNumber) {
          msgDiv.classList.add('msg-sent');
      } else {
          msgDiv.classList.add('msg-received');
      }

      messagesDiv.appendChild(msgDiv);
    });
    // Auto-scroll to the latest message
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}


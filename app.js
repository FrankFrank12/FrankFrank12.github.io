// --- FIREBASE IMPORTS (ADDED 'getFunctions' and 'httpsCallable') ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, setDoc, updateDoc, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7H_GFklwLJnqUPZGXWH9AKkJWG3Mc9fU",
  authDomain: "chat-app-2bad9.firebaseapp.com",
  projectId: "chat-app-2bad9",
  storageBucket: "chat-app-2bad9.appspot.com",
  messagingSenderId: "900500112369",
  appId: "1:900500112369:web:506dc9d4bd56ab27c7ba50",
  measurementId: "G-V80NC8TQGJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, "asia-south1"); // Initialize Functions, specifying the region.

// --- UI ELEMENT REFERENCES (Added password elements) ---
const passwordContainer = document.getElementById('password-container');
const appWrapper = document.getElementById('app-wrapper');
const passwordBox = document.getElementById('passwordBox');
const submitPasswordBtn = document.getElementById('submitPasswordBtn');
const passwordError = document.getElementById('password-error');
const screens = document.querySelectorAll('.screen');
const loginContainer = document.getElementById('login-container');
const chatListContainer = document.getElementById('chat-list-container');
const addContactContainer = document.getElementById('add-contact-container');
const chatContainer = document.getElementById('chat-container');
const phoneBox = document.getElementById('phoneBox'), sendOtpBtn = document.getElementById('sendOtpBtn');
const otpGroup = document.getElementById('otp-group'), otpBox = document.getElementById('otpBox'), verifyOtpBtn = document.getElementById('verifyOtpBtn');
const chatListDiv = document.getElementById('chat-list'), addChatFab = document.getElementById('add-chat-fab');
const backToListBtn = document.getElementById('back-to-list-btn');
const recipientPhoneBox = document.getElementById('recipientPhoneBox'), recipientNameBox = document.getElementById('recipientNameBox'), startChatBtn = document.getElementById('startChatBtn');
const backToChatListBtn = document.getElementById('back-to-chat-list-btn');
const chatTitle = document.getElementById('chat-title'), messagesDiv = document.getElementById('messages'), msgBox = document.getElementById('msgBox'), sendBtn = document.getElementById('sendBtn');
const themeToggleList = document.getElementById('theme-toggle-list'), themeToggleChat = document.getElementById('theme-toggle-chat');

// --- NEW: SECURE PASSWORD CHECK ---
// This function calls your backend to verify the password securely.
const checkSitePassword = httpsCallable(functions, 'checkSitePassword');

async function handlePasswordSubmit() {
    const enteredPassword = passwordBox.value;
    if (!enteredPassword) return;

    submitPasswordBtn.disabled = true;
    submitPasswordBtn.textContent = "Checking...";
    passwordError.style.display = 'none';

    try {
        const result = await checkSitePassword({ password: enteredPassword });
        if (result.data.success) {
            // Password is correct, hide the password screen and show the main app.
            passwordContainer.style.display = 'none';
            appWrapper.style.display = 'flex';
        } else {
            // Password is incorrect, show an error message.
            passwordError.style.display = 'block';
        }
    } catch (error) {
        console.error("Error checking password:", error);
        passwordError.textContent = "An error occurred. Please try again.";
        passwordError.style.display = 'block';
    } finally {
        submitPasswordBtn.disabled = false;
        submitPasswordBtn.textContent = "Enter";
    }
}
submitPasswordBtn.onclick = handlePasswordSubmit;
passwordBox.onkeypress = (e) => { if (e.key === 'Enter') handlePasswordSubmit(); };

// --- SCREEN NAVIGATION ---
function showScreen(screenId) {
    screens.forEach(s => s.classList.toggle('active', s.id === screenId));
}

// --- DARK MODE LOGIC ---
function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    themeToggleList.textContent = themeToggleChat.textContent = isDark ? '☀️' : '🌙';
}
function toggleTheme() {
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}
themeToggleList.addEventListener('click', toggleTheme);
themeToggleChat.addEventListener('click', toggleTheme);
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);


// --- AUTHENTICATION LOGIC ---
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
let confirmationResult;
sendOtpBtn.onclick = () => {
    let p = phoneBox.value.trim();
    if (p.length === 10 && /^\d{10}$/.test(p)) p = "+91" + p;
    if (!p || !/^\+[1-9]\d{1,14}$/.test(p)) return alert("Invalid phone number.");
    signInWithPhoneNumber(auth, p, window.recaptchaVerifier).then(r => {
        confirmationResult = r;
        otpGroup.style.display = 'block';
        alert("OTP sent!");
    }).catch(console.error);
};
verifyOtpBtn.onclick = () => {
    confirmationResult.confirm(otpBox.value).catch(() => alert("Invalid OTP"));
};


// --- FCM TOKEN HANDLING ---
window.saveFCMToken = function(token) {
    console.log("Received FCM token from Android:", token);
    const currentUser = auth.currentUser;
    if (currentUser && token) {
        const userRef = doc(db, "users", currentUser.phoneNumber);
        setDoc(userRef, { fcmToken: token }, { merge: true })
            .then(() => console.log("FCM Token saved to Firestore."))
            .catch(err => console.error("Error saving FCM token:", err));
    }
}

// --- MAIN APP ROUTER ---
let unsubscribeFromContacts;
let unsubscribeFromChat;

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (typeof Android !== "undefined" && Android.getFCMToken) {
            console.log("Requesting FCM token from Android...");
            Android.getFCMToken();
        }
        initializeChatList(user);
        showScreen('chat-list-container');
    } else {
        if (unsubscribeFromContacts) unsubscribeFromContacts();
        showScreen('login-container');
    }
});

// --- CHAT LIST LOGIC ---
function initializeChatList(user) {
    if (unsubscribeFromContacts) unsubscribeFromContacts();
    const contactsRef = collection(db, "users", user.phoneNumber, "contacts");
    const q = query(contactsRef, orderBy("lastMessageTimestamp", "desc"));
    unsubscribeFromContacts = onSnapshot(q, (snapshot) => {
        chatListDiv.innerHTML = "";
        if (snapshot.empty) {
            chatListDiv.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-secondary);">Click '+' to start a chat.</p>`;
        }
        snapshot.forEach(doc => {
            const contact = doc.data();
            const contactPhone = doc.id;
            const item = document.createElement('div');
            item.className = 'chat-list-item';
            let badgeHtml = '';
            if (contact.unreadCount > 0) {
                badgeHtml = `<span class="unread-badge">${contact.unreadCount}</span>`;
            }
            item.innerHTML = `<span class="chat-list-item-name">${contact.name}</span>${badgeHtml}`;
            item.onclick = () => openChat(user, contactPhone, contact.name);
            chatListDiv.appendChild(item);
        });
    });
}

// --- NAVIGATION LOGIC ---
addChatFab.onclick = () => showScreen('add-contact-container');
backToListBtn.onclick = () => {
    initializeChatList(auth.currentUser);
    showScreen('chat-list-container');
};
backToChatListBtn.onclick = () => {
    if (unsubscribeFromChat) unsubscribeFromChat();
    initializeChatList(auth.currentUser);
    showScreen('chat-list-container');
};

// --- ADD NEW CONTACT & START CHAT ---
startChatBtn.onclick = async () => {
    const currentUser = auth.currentUser;
    let recipientPhone = recipientPhoneBox.value.trim();
    const recipientName = recipientNameBox.value.trim();
    if (!recipientName) return alert("Please enter a name.");
    if (recipientPhone.length === 10 && /^\d{10}$/.test(recipientPhone)) recipientPhone = "+91" + recipientPhone;
    if (!recipientPhone || !/^\+[1-9]\d{1,14}$/.test(recipientPhone)) return alert("Please enter a valid phone number.");
    if (recipientPhone === currentUser.phoneNumber) return alert("You cannot chat with yourself.");
    const contactRef = doc(db, "users", currentUser.phoneNumber, "contacts", recipientPhone);
    await setDoc(contactRef, {
        name: recipientName,
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: 0,
        lastMessageText: ""
    }, { merge: true });
    
    const recipientContactRef = doc(db, "users", recipientPhone, "contacts", currentUser.phoneNumber);
    const currentUserContactDoc = await getDoc(doc(db, "users", recipientPhone, "contacts", currentUser.phoneNumber));
    if (!currentUserContactDoc.exists()) {
        const currentUserName = prompt(`Enter a name for yourself that ${recipientName} will see:`);
        if (currentUserName) {
             await setDoc(recipientContactRef, {
                name: currentUserName,
                lastMessageTimestamp: serverTimestamp(),
                unreadCount: 0,
                lastMessageText: ""
            }, { merge: true });
        }
    }

    recipientPhoneBox.value = "";
    recipientNameBox.value = "";
    openChat(currentUser, recipientPhone, recipientName);
};

// --- ONE-ON-ONE CHAT LOGIC ---
function openChat(user, recipientPhone, recipientName) {
    showScreen('chat-container');
    chatTitle.innerText = recipientName;
    const contactRef = doc(db, "users", user.phoneNumber, "contacts", recipientPhone);
    updateDoc(contactRef, { unreadCount: 0 });
    const phoneNumbers = [user.phoneNumber, recipientPhone].sort();
    const chatId = phoneNumbers.join('_');
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));
    unsubscribeFromChat = onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = "";
        snapshot.forEach(doc => {
            const msg = doc.data();
            const msgDiv = document.createElement('div');
            msgDiv.textContent = msg.text;
            msgDiv.className = `msg ${msg.sender === user.phoneNumber ? 'msg-sent' : 'msg-received'}`;
            messagesDiv.appendChild(msgDiv);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
    const sendMessage = () => {
        const messageText = msgBox.value.trim();
        if (messageText) {
            addDoc(messagesRef, { sender: user.phoneNumber, text: messageText, timestamp: serverTimestamp() });
            msgBox.value = "";
        }
    };
    sendBtn.onclick = sendMessage;
    msgBox.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
}


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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Anonymous login
auth.signInAnonymously().catch(err => console.error(err));

// Elements
const msgBox = document.getElementById('msgBox');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');

// Send message
sendBtn.onclick = () => {
  if (msgBox.value.trim()) {
    db.collection("messages").add({
      text: msgBox.value,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    msgBox.value = "";
  }
};

// Show messages live
db.collection("messages")
  .orderBy("timestamp")
  .onSnapshot(snapshot => {
    messagesDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      messagesDiv.innerHTML += <div class="msg">${msg.text}</div>;
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
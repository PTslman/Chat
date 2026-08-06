// dashboard.js
import { db, auth, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDoc, setDoc, onDisconnect, ref, onValue, signOut } from './firebase-config.js';

const currentUser = JSON.parse(localStorage.getItem('nezak_user'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// عناصر DOM
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const usersList = document.getElementById('users-list');
const userNameDisplay = document.getElementById('user-name-display');
const userAvatar = document.getElementById('user-avatar');
const logoutBtn = document.getElementById('logout-btn');
const adminShield = document.getElementById('admin-shield');
const onlineCount = document.getElementById('online-count');
const typingText = document.getElementById('typing-text');

// تحميل بيانات المستخدم
async function loadUserData() {
    const userDoc = await getDoc(doc(db, 'users', currentUser.username));
    if (userDoc.exists()) {
        const data = userDoc.data();
        userNameDisplay.textContent = currentUser.username;
        userAvatar.src = data.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username}`;
        
        // إظهار درع المسؤول
        if (currentUser.isAdmin || data.isAdmin) {
            adminShield.style.display = 'flex';
            currentUser.isAdmin = true;
        }
    }
}
loadUserData();

// إرسال رسالة
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    try {
        await addDoc(collection(db, 'messages'), {
            text: text,
            sender: currentUser.username,
            timestamp: serverTimestamp(),
            avatar: userAvatar.src
        });
        messageInput.value = '';
        messageInput.focus();
    } catch (error) {
        console.error('خطأ في الإرسال:', error);
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// الاستماع للرسائل
const messagesQuery = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
onSnapshot(messagesQuery, (snapshot) => {
    const shouldScroll = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 50;
    
    messagesContainer.innerHTML = '';
    snapshot.forEach((doc) => {
        const data = doc.data();
        const isSent = data.sender === currentUser.username;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const senderDiv = document.createElement('div');
        senderDiv.className = 'msg-sender';
        senderDiv.textContent = isSent ? 'أنت' : data.sender;
        
        const textDiv = document.createElement('div');
        textDiv.textContent = data.text;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'msg-time';
        if (data.timestamp) {
            const date = data.timestamp.toDate();
            timeDiv.textContent = date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
        }
        
        msgDiv.appendChild(senderDiv);
        msgDiv.appendChild(textDiv);
        msgDiv.appendChild(timeDiv);
        messagesContainer.appendChild(msgDiv);
    });
    
    if (shouldScroll || !snapshot.empty) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});

// تحديث قائمة المستخدمين + حالة الاتصال
const usersRef = collection(db, 'users');
onSnapshot(usersRef, (snapshot) => {
    usersList.innerHTML = '';
    let online = 0;
    
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.username === currentUser.username) {
            // تحديث حالة الاتصال في Realtime Database
            const statusRef = ref(db, `status/${currentUser.username}`);
            set(statusRef, { online: true, lastSeen: new Date() });
            onDisconnect(statusRef).set({ online: false, lastSeen: new Date() });
        }
        
        const isOnline = user.online !== false;
        if (isOnline) online++;
        
        const item = document.createElement('div');
        item.className = 'user-item';
        item.innerHTML = `
            <img src="${user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}" alt="">
            <span class="username">${user.username}</span>
            <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
        `;
        usersList.appendChild(item);
    });
    
    onlineCount.textContent = `🟢 ${online}`;
});

// مؤشر الكتابة
let typingTimeout;
messageInput.addEventListener('input', () => {
    const typingRef = ref(db, `typing/${currentUser.username}`);
    set(typingRef, { isTyping: true, username: currentUser.username });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        set(typingRef, { isTyping: false });
    }, 1500);
});

// الاستماع لمن يكتب
const typingRef = ref(db, 'typing');
onValue(typingRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) { typingText.textContent = ''; return; }
    
    const typingUsers = Object.values(data).filter(u => u.isTyping && u.username !== currentUser.username);
    if (typingUsers.length > 0) {
        const names = typingUsers.map(u => u.username).join('، ');
        typingText.textContent = `✍️ ${names} ${typingUsers.length > 1 ? 'يكتبون' : 'يكتب'}...`;
    } else {
        typingText.textContent = '';
    }
});

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('nezak_user');
    window.location.href = 'login.html';
});

// الحفاظ على ترتيب الرسائل عند إعادة التحميل
window.addEventListener('beforeunload', () => {
    // تحديث حالة المستخدم
    const statusRef = ref(db, `status/${currentUser.username}`);
    set(statusRef, { online: false, lastSeen: new Date() });
});

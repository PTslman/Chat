// ============================================
// التطبيق الرئيسي - نيزك
// ============================================

import { db, auth, storage } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot,
    where,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// إدارة الحالة
// ============================================

const state = {
    currentUser: null,
    currentChat: null,
    contacts: [],
    messages: [],
    isListening: false
};

// ============================================
// عناصر DOM
// ============================================

const elements = {
    // شاشة الدخول
    authScreen: document.getElementById('auth-screen'),
    chatApp: document.getElementById('chat-app'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginBtn: document.getElementById('login-btn'),
    showSignup: document.getElementById('show-signup'),
    
    // الشريط الجانبي
    userName: document.getElementById('user-name'),
    userAvatar: document.getElementById('user-avatar'),
    contactsList: document.getElementById('contacts-list'),
    searchInput: document.getElementById('search-contacts'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // الدردشة
    chatMessages: document.getElementById('chat-messages'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    chatUserName: document.getElementById('chat-user-name'),
    chatUserStatus: document.getElementById('chat-user-status'),
    emojiBtn: document.getElementById('emoji-btn')
};

// ============================================
// المصادقة
// ============================================

// مراقبة حالة المصادقة
onAuthStateChanged(auth, (user) => {
    if (user) {
        state.currentUser = user;
        elements.authScreen.style.display = 'none';
        elements.chatApp.style.display = 'flex';
        loadUserData(user);
        loadContacts();
    } else {
        elements.authScreen.style.display = 'flex';
        elements.chatApp.style.display = 'none';
        state.currentUser = null;
    }
});

// تسجيل الدخول
elements.loginBtn.addEventListener('click', async () => {
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value.trim();
    
    if (!email || !password) {
        alert('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }
    
    try {
        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('فشل تسجيل الدخول: ' + error.message);
    } finally {
        elements.loginBtn.disabled = false;
        elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
    }
});

// تسجيل الخروج
elements.logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        state.currentChat = null;
        elements.chatMessages.innerHTML = '';
        elements.messageInput.disabled = true;
        elements.sendBtn.disabled = true;
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
});

// ============================================
// تحميل بيانات المستخدم
// ============================================

async function loadUserData(user) {
    elements.userName.textContent = user.displayName || user.email.split('@')[0];
    
    // تحديث الصورة الافتراضية
    if (user.photoURL) {
        elements.userAvatar.querySelector('img').src = user.photoURL;
    }
}

// ============================================
// تحميل جهات الاتصال
// ============================================

async function loadContacts() {
    if (!state.currentUser) return;
    
    try {
        // جلب المستخدمين الآخرين (باستثناء المستخدم الحالي)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '!=', state.currentUser.uid));
        const snapshot = await getDocs(q);
        
        state.contacts = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            state.contacts.push({
                uid: data.uid,
                name: data.name || data.email.split('@')[0],
                email: data.email,
                photoURL: data.photoURL || 'assets/images/default-avatar.png',
                lastMessage: '',
                lastMessageTime: null,
                unread: 0
            });
        });
        
        renderContacts();
    } catch (error) {
        console.error('خطأ في تحميل جهات الاتصال:', error);
    }
}

// ============================================
// عرض جهات الاتصال
// ============================================

function renderContacts(filter = '') {
    const filtered = state.contacts.filter(contact => 
        contact.name.toLowerCase().includes(filter.toLowerCase())
    );
    
    elements.contactsList.innerHTML = filtered.map(contact => `
        <div class="contact-item" data-uid="${contact.uid}">
            <div class="contact-avatar">
                <img src="${contact.photoURL}" alt="${contact.name}" />
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-last-message">${contact.lastMessage || 'ابدأ المحادثة'}</div>
            </div>
            <div class="contact-meta">
                ${contact.lastMessageTime ? `<span class="contact-time">${formatTime(contact.lastMessageTime)}</span>` : ''}
                ${contact.unread > 0 ? `<span class="contact-unread">${contact.unread}</span>` : ''}
            </div>
        </div>
    `).join('');
    
    // إضافة مستمعي الأحداث
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', () => {
            const uid = item.dataset.uid;
            const contact = state.contacts.find(c => c.uid === uid);
            if (contact) {
                openChat(contact);
            }
        });
    });
}

// ============================================
// فتح الدردشة
// ============================================

function openChat(contact) {
    state.currentChat = contact;
    elements.chatUserName.textContent = contact.name;
    elements.chatUserStatus.textContent = 'متصل';
    elements.chatUserStatus.className = 'chat-user-status online';
    elements.messageInput.disabled = false;
    elements.sendBtn.disabled = false;
    elements.messageInput.focus();
    
    // تحديث العنصر النشط
    document.querySelectorAll('.contact-item').forEach(el => {
        el.classList.toggle('active', el.dataset.uid === contact.uid);
    });
    
    // تحميل الرسائل
    loadMessages(contact.uid);
}

// ============================================
// تحميل الرسائل
// ============================================

function loadMessages(otherUid) {
    if (!state.currentUser) return;
    
    const chatId = getChatId(state.currentUser.uid, otherUid);
    const messagesRef = collection(db, 'messages', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
    
    // إلغاء الاستماع السابق
    if (state.unsubscribeMessages) {
        state.unsubscribeMessages();
    }
    
    state.unsubscribeMessages = onSnapshot(q, (snapshot) => {
        state.messages = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            state.messages.push({
                id: doc.id,
                text: data.text,
                sender: data.sender,
                timestamp: data.timestamp?.toDate() || new Date(),
                status: data.status || 'sent'
            });
        });
        renderMessages();
        scrollToBottom();
    });
}

// ============================================
// عرض الرسائل
// ============================================

function renderMessages() {
    if (!state.currentChat) {
        elements.chatMessages.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-dots"></i>
                <h3>ابدأ محادثة جديدة</h3>
                <p>اختر أحد جهات الاتصال للبدء</p>
            </div>
        `;
        return;
    }
    
    if (state.messages.length === 0) {
        elements.chatMessages.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-smile"></i>
                <h3>لا توجد رسائل</h3>
                <p>ارسل أول رسالة لبدء المحادثة</p>
            </div>
        `;
        return;
    }
    
    elements.chatMessages.innerHTML = state.messages.map(msg => {
        const isSent = msg.sender === state.currentUser.uid;
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                ${msg.text}
                <span class="message-time">
                    ${formatTime(msg.timestamp)}
                    ${isSent ? `<span class="message-status"><i class="fas fa-check-double"></i></span>` : ''}
                </span>
            </div>
        `;
    }).join('');
}

// ============================================
// إرسال رسالة
// ============================================

async function sendMessage() {
    const text = elements.messageInput.value.trim();
    if (!text || !state.currentChat || !state.currentUser) return;
    
    try {
        const chatId = getChatId(state.currentUser.uid, state.currentChat.uid);
        const messagesRef = collection(db, 'messages', chatId, 'messages');
        
        await addDoc(messagesRef, {
            text: text,
            sender: state.currentUser.uid,
            receiver: state.currentChat.uid,
            timestamp: serverTimestamp(),
            status: 'sent'
        });
        
        // تحديث آخر رسالة في جهة الاتصال
        const contact = state.contacts.find(c => c.uid === state.currentChat.uid);
        if (contact) {
            contact.lastMessage = text;
            contact.lastMessageTime = new Date();
            renderContacts(elements.searchInput.value);
        }
        
        elements.messageInput.value = '';
        elements.messageInput.focus();
    } catch (error) {
        console.error('خطأ في الإرسال:', error);
        alert('فشل إرسال الرسالة');
    }
}

// ============================================
// دوال مساعدة
// ============================================

function getChatId(uid1, uid2) {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

function formatTime(date) {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function scrollToBottom() {
    setTimeout(() => {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }, 100);
}

// ============================================
// مستمعي الأحداث
// ============================================

// زر الإرسال
elements.sendBtn.addEventListener('click', sendMessage);

// Enter للإرسال
elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// البحث في جهات الاتصال
elements.searchInput.addEventListener('input', (e) => {
    renderContacts(e.target.value);
});

// زر الإيموجي (مثال بسيط)
elements.emojiBtn.addEventListener('click', () => {
    const emojis = ['😊', '❤️', '😂', '👍', '🔥', '✨', '💯', '🎉', '😍', '🤣'];
    const random = emojis[Math.floor(Math.random() * emojis.length)];
    elements.messageInput.value += random;
    elements.messageInput.focus();
});

// ============================================
// التهيئة
// ============================================

console.log('🚀 نيزك - نظام مراسلة فوري');
console.log('تم التحميل بنجاح ✓');

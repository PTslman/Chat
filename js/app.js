import { 
    db, auth, storage, collection, addDoc, getDocs, updateDoc, deleteDoc, 
    doc, onSnapshot, query, orderBy, serverTimestamp, where, getDoc,
    ref, uploadBytes, getDownloadURL, deleteObject,
    signInAnonymously, onAuthStateChanged, signOut 
} from './firebase-config.js';

import { AuthManager } from './auth.js';
import { ChatManager } from './chat.js';
import { AdminManager } from './admin.js';
import { Utils } from './utils.js';

class NeZekApp {
    constructor() {
        this.currentUser = null;
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.currentColor = localStorage.getItem('color') || '#25D366';
        this.messages = [];
        this.users = [];
        this.isAdmin = false;
        this.selectedMessage = null;
        this.replyTo = null;
        this.editMessage = null;
        this.onlineUsers = new Set();
        
        // تهيئة المديرين
        this.authManager = new AuthManager(this);
        this.chatManager = new ChatManager(this);
        this.adminManager = new AdminManager(this);
        this.utils = new Utils(this);
        
        this.init();
    }

    async init() {
        // إظهار شاشة التحميل
        this.showLoading();
        
        // تهيئة الثيم
        this.applyTheme(this.currentTheme);
        
        // تهيئة المصادقة
        this.authManager.init();
        
        // إعداد المستمعين
        this.setupEventListeners();
        
        // التحقق من الجلسة
        const savedSession = localStorage.getItem('nezek_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.username) {
                    this.tryAutoLogin(session);
                }
            } catch (e) {
                console.error('خطأ في استعادة الجلسة:', e);
            }
        }
    }

    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-screen').style.display = 'none';
    }

    setupEventListeners() {
        // نموذج تسجيل الدخول
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // زر تسجيل الخروج
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // زر تبديل الثيم
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // زر الإيموجي
        document.getElementById('emoji-btn').addEventListener('click', () => {
            this.toggleEmojiPanel();
        });

        // إضافة الإيموجي
        document.querySelectorAll('.emoji').forEach(emoji => {
            emoji.addEventListener('click', () => {
                this.insertEmoji(emoji.textContent);
            });
        });

        // زر الإرسال
        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        // إدخال الرسالة (Enter)
        document.getElementById('message-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
            if (e.key === 'Escape') {
                this.cancelReply();
                this.cancelEdit();
            }
        });

        // رفع الصورة الشخصية
        document.getElementById('avatar-input').addEventListener('change', (e) => {
            this.uploadAvatar(e.target.files[0]);
        });

        // حفظ الملف الشخصي
        document.getElementById('save-profile').addEventListener('click', () => {
            this.saveProfile();
        });

        // اختيار اللون
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                const color = option.dataset.color;
                this.selectColor(color);
            });
        });

        // إلغاء الرد
        document.getElementById('cancel-reply').addEventListener('click', () => {
            this.cancelReply();
        });

        // إغلاق لوحة المسؤول
        document.getElementById('close-admin').addEventListener('click', () => {
            this.closeAdminPanel();
        });

        // تبديل تبويبات المسؤول
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchAdminTab(btn.dataset.tab);
            });
        });

        // إضافة كلمة محظورة
        document.getElementById('add-word-btn').addEventListener('click', () => {
            this.adminManager.addBannedWord();
        });

        // حذف جميع الرسائل
        document.getElementById('clear-all-messages').addEventListener('click', () => {
            this.adminManager.clearAllMessages();
        });

        // تسجيل خروج الجميع
        document.getElementById('logout-all-users').addEventListener('click', () => {
            this.adminManager.logoutAllUsers();
        });

        // إغلاق عارض الصور
        document.getElementById('close-viewer').addEventListener('click', () => {
            this.closeImageViewer();
        });

        document.querySelector('.viewer-overlay').addEventListener('click', () => {
            this.closeImageViewer();
        });

        // إغلاق قائمة الخيارات
        document.querySelector('.options-overlay').addEventListener('click', () => {
            this.closeMessageOptions();
        });

        // أزرار خيارات الرسالة
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleMessageAction(btn.dataset.action);
            });
        });

        // التمرير للأسفل عند النقر على زر جديد
        // زر التمرير للأسفل سيتم إنشاؤه ديناميكياً
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username) {
            this.utils.showToast('يرجى إدخال اسم المستخدم', 'error');
            return;
        }

        // التحقق من المسؤول
        if (username === 'slx23m') {
            if (!password) {
                document.getElementById('password-group').style.display = 'block';
                document.getElementById('password').focus();
                return;
            }
            if (password !== '1442') {
                this.utils.showToast('كلمة مرور غير صحيحة', 'error');
                return;
            }
            this.isAdmin = true;
        } else {
            document.getElementById('password-group').style.display = 'none';
            this.isAdmin = false;
        }

        // تسجيل الدخول
        try {
            const result = await signInAnonymously(auth);
            const user = result.user;
            
            // حفظ بيانات المستخدم
            const userData = {
                username: username,
                isAdmin: this.isAdmin,
                color: this.currentColor,
                avatar: null,
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                online: true,
                banned: false,
                violations: 0
            };

            // حفظ في Firestore
            await setDoc(doc(db, 'users', user.uid), userData);
            
            this.currentUser = {
                id: user.uid,
                ...userData
            };

            // حفظ الجلسة
            localStorage.setItem('nezek_session', JSON.stringify({
                username: username,
                userId: user.uid,
                isAdmin: this.isAdmin
            }));

            this.showChat();
            this.utils.showToast(`مرحباً ${username}! 🎉`, 'success');

        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            this.utils.showToast('حدث خطأ في تسجيل الدخول', 'error');
        }
    }

    async tryAutoLogin(session) {
        // محاولة استعادة الجلسة
        try {
            const userRef = doc(db, 'users', session.userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (!userData.banned) {
                    this.currentUser = {
                        id: session.userId,
                        ...userData
                    };
                    this.isAdmin = session.isAdmin;
                    
                    // تحديث حالة الاتصال
                    await updateDoc(userRef, {
                        online: true,
                        lastSeen: serverTimestamp()
                    });

                    this.showChat();
                    this.hideLoading();
                    return true;
                }
            }
        } catch (e) {
            console.error('خطأ في استعادة الجلسة:', e);
        }
        return false;
    }

    async handleLogout() {
        try {
            if (this.currentUser) {
                // تحديث حالة عدم الاتصال
                await updateDoc(doc(db, 'users', this.currentUser.id), {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            }
            
            await signOut(auth);
            localStorage.removeItem('nezek_session');
            this.currentUser = null;
            this.isAdmin = false;
            this.showLogin();
            this.utils.showToast('تم تسجيل الخروج بنجاح', 'info');
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    }

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('chat-app').style.display = 'none';
        document.getElementById('password-group').style.display = 'none';
        document.getElementById('password').value = '';
        this.hideLoading();
    }

    showProfileSetup() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('profile-setup').style.display = 'flex';
        document.getElementById('chat-app').style.display = 'none';
        
        // تعيين اسم المستخدم
        document.getElementById('display-name').value = this.currentUser?.username || '';
    }

    showChat() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('chat-app').style.display = 'flex';
        
        // تحديث واجهة المستخدم
        this.updateUserUI();
        
        // بدء استماع الرسائل
        this.chatManager.startListening();
        
        // بدء استماع المستخدمين
        this.startUsersListening();
        
        this.hideLoading();
    }

    updateUserUI() {
        if (!this.currentUser) return;
        
        document.getElementById('user-name').textContent = this.currentUser.username;
        
        if (this.currentUser.avatar) {
            document.getElementById('user-avatar').src = this.currentUser.avatar;
        }
        
        // إظهار زر المسؤول
        if (this.isAdmin) {
            document.getElementById('admin-panel-btn').style.display = 'flex';
        } else {
            document.getElementById('admin-panel-btn').style.display = 'none';
        }
    }

    async uploadAvatar(file) {
        if (!file) return;
        
        try {
            // ضغط الصورة
            const compressed = await this.utils.compressImage(file);
            
            // رفع إلى Firebase Storage
            const storageRef = ref(storage, `avatars/${this.currentUser.id}`);
            await uploadBytes(storageRef, compressed);
            const downloadURL = await getDownloadURL(storageRef);
            
            // تحديث في Firestore
            await updateDoc(doc(db, 'users', this.currentUser.id), {
                avatar: downloadURL
            });
            
            this.currentUser.avatar = downloadURL;
            document.getElementById('profile-preview').src = downloadURL;
            document.getElementById('user-avatar').src = downloadURL;
            
            this.utils.showToast('تم رفع الصورة بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في رفع الصورة:', error);
            this.utils.showToast('حدث خطأ في رفع الصورة', 'error');
        }
    }

    async saveProfile() {
        const displayName = document.getElementById('display-name').value.trim();
        if (!displayName) {
            this.utils.showToast('يرجى إدخال اسم', 'error');
            return;
        }

        try {
            await updateDoc(doc(db, 'users', this.currentUser.id), {
                username: displayName,
                color: this.currentColor
            });
            
            this.currentUser.username = displayName;
            this.currentUser.color = this.currentColor;
            
            this.utils.showToast('تم حفظ الملف الشخصي', 'success');
            this.showChat();
        } catch (error) {
            console.error('خطأ في حفظ الملف:', error);
            this.utils.showToast('حدث خطأ في الحفظ', 'error');
        }
    }

    selectColor(color) {
        this.currentColor = color;
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.style.border = opt.dataset.color === color ? '3px solid white' : 'none';
        });
        localStorage.setItem('color', color);
    }

    toggleTheme() {
        const themes = ['dark', 'light', 'purple', 'forest', 'pink', 'ocean'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.currentTheme = themes[nextIndex];
        this.applyTheme(this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.querySelector('#theme-toggle .material-symbols-outlined');
        const icons = {
            'dark': 'dark_mode',
            'light': 'light_mode',
            'purple': 'palette',
            'forest': 'park',
            'pink': 'favorite',
            'ocean': 'waves'
        };
        icon.textContent = icons[theme] || 'dark_mode';
    }

    toggleEmojiPanel() {
        const panel = document.getElementById('emoji-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    insertEmoji(emoji) {
        const input = document.getElementById('message-input');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
        document.getElementById('emoji-panel').style.display = 'none';
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        // التحقق من الحظر
        if (this.currentUser.banned) {
            this.utils.showToast('أنت محظور من الكتابة', 'error');
            return;
        }

        // التحقق من الكلمات المحظورة
        const hasBannedWord = await this.chatManager.checkBannedWords(text);
        if (hasBannedWord) {
            this.utils.showToast('الرسالة تحتوي على كلمات محظورة', 'error');
            return;
        }

        try {
            const messageData = {
                senderId: this.currentUser.id,
                senderName: this.currentUser.username,
                text: text,
                timestamp: serverTimestamp(),
                read: false,
                edited: false,
                reactions: {},
                replyTo: this.replyTo || null,
                color: this.currentUser.color || '#25D366'
            };

            // إضافة الرسالة
            await addDoc(collection(db, 'messages'), messageData);

            // إعادة تعيين حقول الإدخال
            input.value = '';
            input.style.height = 'auto';
            this.cancelReply();
            this.cancelEdit();

            // التمرير للأسفل
            this.scrollToBottom();

        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            this.utils.showToast('حدث خطأ في إرسال الرسالة', 'error');
        }
    }

    cancelReply() {
        this.replyTo = null;
        document.getElementById('reply-bar').style.display = 'none';
    }

    cancelEdit() {
        this.editMessage = null;
        document.getElementById('message-input').placeholder = 'اكتب رسالة...';
    }

    scrollToBottom() {
        const container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    }

    startUsersListening() {
        const usersQuery = query(collection(db, 'users'));
        
        onSnapshot(usersQuery, (snapshot) => {
            let onlineCount = 0;
            const usersList = [];
            
            snapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                usersList.push(user);
                if (user.online) onlineCount++;
            });
            
            this.users = usersList;
            document.getElementById('online-count').textContent = onlineCount;
            
            // تحديث حالة المستخدمين في الرسائل
            this.updateUsersStatus(usersList);
        });
    }

    updateUsersStatus(users) {
        // تحديث حالة المستخدمين في الرسائل
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            const senderId = msg.dataset.senderId;
            if (senderId) {
                const user = users.find(u => u.id === senderId);
                if (user) {
                    const statusEl = msg.querySelector('.user-status');
                    if (statusEl) {
                        statusEl.textContent = user.online ? '🟢' : '⚪';
                    }
                }
            }
        });
    }

    showMessageOptions(messageId, event) {
        this.selectedMessage = messageId;
        const menu = document.getElementById('message-options');
        menu.style.display = 'block';
        
        // إظهار/إخفاء أزرار المسؤول
        const adminBtns = menu.querySelectorAll('.admin-only');
        if (this.isAdmin) {
            adminBtns.forEach(btn => btn.style.display = 'flex');
        } else {
            adminBtns.forEach(btn => btn.style.display = 'none');
        }
        
        // تحديد موقع القائمة
        const rect = event.target.getBoundingClientRect();
        menu.style.top = rect.top - 100 + 'px';
        menu.style.left = rect.left + 'px';
    }

    closeMessageOptions() {
        document.getElementById('message-options').style.display = 'none';
        this.selectedMessage = null;
    }

    async handleMessageAction(action) {
        if (!this.selectedMessage) return;
        
        switch(action) {
            case 'reply':
                this.chatManager.replyToMessage(this.selectedMessage);
                break;
            case 'react':
                this.chatManager.showReactions(this.selectedMessage);
                break;
            case 'copy':
                this.chatManager.copyMessage(this.selectedMessage);
                break;
            case 'edit':
                this.chatManager.editMessage(this.selectedMessage);
                break;
            case 'report':
                this.chatManager.reportMessage(this.selectedMessage);
                break;
            case 'delete':
                if (this.isAdmin) {
                    this.adminManager.deleteMessage(this.selectedMessage);
                }
                break;
            case 'ban':
                if (this.isAdmin) {
                    this.adminManager.banUserByMessage(this.selectedMessage);
                }
                break;
        }
        
        this.closeMessageOptions();
    }

    openAdminPanel() {
        if (!this.isAdmin) return;
        document.getElementById('admin-panel').style.display = 'block';
        this.adminManager.loadData();
    }

    closeAdminPanel() {
        document.getElementById('admin-panel').style.display = 'none';
    }

    switchAdminTab(tabId) {
        // تبديل التبويبات
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    }

    openImageViewer(imageUrl) {
        document.getElementById('image-viewer').style.display = 'flex';
        document.getElementById('viewer-image').src = imageUrl;
    }

    closeImageViewer() {
        document.getElementById('image-viewer').style.display = 'none';
    }

    // مستمعي Firebase
    setupFirebaseListeners() {
        // سيتم استدعاؤها من chatManager
    }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NeZekApp();
});

export default NeZekApp;

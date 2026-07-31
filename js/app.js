import { 
    db, auth, storage,
    collection, doc, getDoc, getDocs,
    addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy,
    where, serverTimestamp, setDoc,
    signInAnonymously, onAuthStateChanged, signOut,
    ref, uploadBytes, getDownloadURL
} from './firebase-config.js';

import { AuthManager } from './modules/auth.js';
import { ChatManager } from './modules/chat.js';
import { AdminManager } from './modules/admin.js';
import { UIManager } from './modules/ui.js';

class NeZekApp {
    constructor() {
        // ===== البيانات الأساسية =====
        this.currentUser = null;
        this.isAdmin = false;
        this.messages = [];
        this.users = [];
        this.replyTo = null;
        this.editMessageId = null;
        this.selectedMessageId = null;
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.currentColor = localStorage.getItem('color') || '#25D366';
        this.unreadCount = 0;
        this.isAtBottom = true;
        
        // ===== المراجع =====
        this.messagesListener = null;
        this.usersListener = null;
        
        // ===== الموديولات =====
        this.authManager = new AuthManager(this);
        this.chatManager = new ChatManager(this);
        this.adminManager = new AdminManager(this);
        this.uiManager = new UIManager(this);
        
        // ===== بدء التطبيق =====
        this.init();
    }

    // ============================================
    // التهيئة
    // ============================================
    async init() {
        this.uiManager.showLoading();
        this.uiManager.applyTheme(this.currentTheme);
        this.setupEventListeners();
        
        // محاولة استعادة الجلسة
        const session = await this.authManager.restoreSession();
        if (session) {
            this.currentUser = session;
            this.isAdmin = session.isAdmin || false;
            this.uiManager.showChat();
            this.startListeners();
        } else {
            this.uiManager.showLogin();
        }
        
        this.uiManager.hideLoading();
    }

    // ============================================
    // بدء المستمعين
    // ============================================
    startListeners() {
        this.chatManager.startListening();
        this.startUsersListener();
    }

    startUsersListener() {
        this.usersListener = onSnapshot(collection(db, 'users'), (snapshot) => {
            const users = [];
            let onlineCount = 0;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                users.push({ id: doc.id, ...data });
                if (data.online) onlineCount++;
            });
            
            this.users = users;
            document.getElementById('online-count').textContent = onlineCount;
            
            if (this.isAdmin) {
                document.getElementById('stat-users').textContent = users.length;
                document.getElementById('stat-online').textContent = onlineCount;
                document.getElementById('stat-banned').textContent = users.filter(u => u.banned).length;
                document.getElementById('stat-messages').textContent = this.messages.length;
            }
        });
    }

    // ============================================
    // مستمعات الأحداث
    // ============================================
    setupEventListeners() {
        // ===== تسجيل الدخول =====
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username) {
                this.uiManager.showToast('⚠️ يرجى إدخال اسم المستخدم', 'error');
                return;
            }
            
            // التحقق من المسؤول
            if (username === 'slx23m') {
                if (!password) {
                    document.getElementById('password-group').style.display = 'block';
                    document.getElementById('password').focus();
                    return;
                }
                const result = await this.authManager.adminLogin(password);
                if (result.success) {
                    this.currentUser = result.user;
                    this.isAdmin = true;
                    this.uiManager.showChat();
                    this.startListeners();
                    this.uiManager.showToast(`👑 مرحباً أيها المسؤول`, 'success');
                } else {
                    this.uiManager.showToast(result.error, 'error');
                }
                return;
            }
            
            // مستخدم عادي
            document.getElementById('password-group').style.display = 'none';
            const result = await this.authManager.login(username);
            if (result.success) {
                this.currentUser = result.user;
                this.isAdmin = false;
                this.uiManager.showChat();
                this.startListeners();
                this.uiManager.showToast(`👋 مرحباً ${username}`, 'success');
            } else {
                this.uiManager.showToast(result.error, 'error');
            }
        });
        
        // ===== إظهار/إخفاء كلمة المرور =====
        document.getElementById('toggle-password').addEventListener('click', () => {
            const input = document.getElementById('password');
            const icon = document.querySelector('#toggle-password .material-symbols-outlined');
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility_off';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility';
            }
        });
        
        // ===== تسجيل الخروج =====
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await this.authManager.logout();
            this.currentUser = null;
            this.isAdmin = false;
            if (this.messagesListener) { this.messagesListener(); this.messagesListener = null; }
            if (this.usersListener) { this.usersListener(); this.usersListener = null; }
            this.uiManager.showLogin();
            this.uiManager.showToast('👋 تم تسجيل الخروج', 'info');
        });
        
        // ===== تبديل الثيم =====
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.uiManager.toggleTheme();
        });
        
        // ===== لوحة المسؤول =====
        document.getElementById('admin-panel-btn').addEventListener('click', () => {
            this.uiManager.openAdminPanel();
        });
        document.getElementById('close-admin').addEventListener('click', () => {
            this.uiManager.closeAdminPanel();
        });
        
        // ===== الإيموجي =====
        document.getElementById('emoji-btn').addEventListener('click', () => {
            this.uiManager.toggleEmojiPanel();
        });
        document.getElementById('close-emoji').addEventListener('click', () => {
            document.getElementById('emoji-panel').style.display = 'none';
        });
        document.querySelectorAll('.emoji-item').forEach(el => {
            el.addEventListener('click', () => {
                this.uiManager.insertEmoji(el.textContent);
            });
        });
        
        // ===== الإرسال =====
        document.getElementById('send-btn').addEventListener('click', () => {
            const input = document.getElementById('message-input');
            this.chatManager.sendMessage(input.value.trim());
        });
        
        // ===== إدخال الرسالة =====
        document.getElementById('message-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const input = document.getElementById('message-input');
                this.chatManager.sendMessage(input.value.trim());
            }
            if (e.key === 'Escape') {
                this.uiManager.cancelReply();
                if (this.editMessageId) {
                    this.editMessageId = null;
                    document.getElementById('send-btn').innerHTML = '<span class="material-symbols-outlined">send</span>';
                    document.getElementById('message-input').placeholder = 'اكتب رسالة...';
                }
            }
        });
        document.getElementById('message-input').addEventListener('input', () => {
            this.uiManager.autoResizeInput();
        });
        
        // ===== إلغاء الرد =====
        document.getElementById('cancel-reply').addEventListener('click', () => {
            this.uiManager.cancelReply();
        });
        
        // ===== التمرير =====
        document.getElementById('chat-main').addEventListener('scroll', () => {
            this.uiManager.checkScrollPosition();
        });
        document.getElementById('scroll-bottom-btn').addEventListener('click', () => {
            this.uiManager.scrollToBottom();
        });
        
        // ===== خيارات الرسالة =====
        document.querySelector('.options-overlay').addEventListener('click', () => {
            this.uiManager.closeMessageOptions();
        });
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleMessageAction(btn.dataset.action);
            });
        });
        
        // ===== الصورة الشخصية =====
        document.getElementById('avatar-upload-btn').addEventListener('click', () => {
            document.getElementById('avatar-input').click();
        });
        document.getElementById('avatar-input').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                await this.authManager.uploadAvatar(e.target.files[0]);
            }
        });
        
        // ===== حفظ الملف الشخصي =====
        document.getElementById('save-profile').addEventListener('click', async () => {
            const name = document.getElementById('display-name').value.trim();
            if (!name) {
                this.uiManager.showToast('⚠️ يرجى إدخال اسم', 'error');
                return;
            }
            const result = await this.authManager.updateProfile({ username: name });
            if (result.success) {
                this.uiManager.showToast('✅ تم حفظ الملف الشخصي', 'success');
                this.uiManager.showChat();
            } else {
                this.uiManager.showToast(result.error, 'error');
            }
        });
        
        // ===== اختيار اللون =====
        document.querySelectorAll('.color-item').forEach(el => {
            el.addEventListener('click', () => {
                this.uiManager.selectColor(el.dataset.color);
            });
        });
        
        // ===== البحث =====
        document.getElementById('search-btn').addEventListener('click', () => {
            const query = prompt('🔍 ابحث في الرسائل:');
            if (query !== null) {
                this.chatManager.searchMessages(query);
            }
        });
        
        // ===== تبويبات المسؤول =====
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.uiManager.switchAdminTab(btn.dataset.tab);
            });
        });
        
        // ===== بحث في المستخدمين =====
        document.getElementById('search-users').addEventListener('input', (e) => {
            this.adminManager.searchUsers(e.target.value);
        });
        
        // ===== إدارة الكلمات المحظورة =====
        document.getElementById('add-word-btn').addEventListener('click', () => {
            const word = document.getElementById('new-word').value.trim();
            this.adminManager.addBannedWord(word);
        });
        document.getElementById('new-word').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const word = document.getElementById('new-word').value.trim();
                this.adminManager.addBannedWord(word);
            }
        });
        
        // ===== إعدادات المسؤول =====
        document.getElementById('clear-all-messages').addEventListener('click', () => {
            this.adminManager.clearAllMessages();
        });
        document.getElementById('logout-all-users').addEventListener('click', () => {
            this.adminManager.logoutAllUsers();
        });
        document.getElementById('export-data').addEventListener('click', () => {
            this.adminManager.exportData();
        });
        document.getElementById('reset-app').addEventListener('click', () => {
            if (confirm('⚠️ هل أنت متأكد من إعادة تعيين التطبيق؟')) {
                localStorage.clear();
                location.reload();
            }
        });
        
        // ===== عارض الصور =====
        document.getElementById('close-viewer').addEventListener('click', () => {
            this.uiManager.closeImageViewer();
        });
        document.querySelector('.viewer-overlay').addEventListener('click', () => {
            this.uiManager.closeImageViewer();
        });
    }

    // ============================================
    // معالجة إجراءات الرسالة
    // ============================================
    handleMessageAction(action) {
        if (!this.selectedMessageId) return;
        
        switch(action) {
            case 'reply':
                this.chatManager.replyToMessage(this.selectedMessageId);
                break;
            case 'react':
                this.uiManager.showReactionsPopup();
                break;
            case 'copy':
                this.chatManager.copyMessage(this.selectedMessageId);
                break;
            case 'edit':
                this.chatManager.editMessage(this.selectedMessageId);
                break;
            case 'report':
                this.chatManager.reportMessage(this.selectedMessageId);
                break;
            case 'delete':
                this.chatManager.deleteMessage(this.selectedMessageId);
                break;
            case 'ban':
                this.chatManager.banUserFromChat(
                    this.messages.find(m => m.id === this.selectedMessageId)?.senderId
                );
                break;
            case 'delete-all':
                this.chatManager.deleteUserMessages(
                    this.messages.find(m => m.id === this.selectedMessageId)?.senderId
                );
                break;
        }
    }

    // ============================================
    // دوال مساعدة
    // ============================================
    showMessageOptions(messageId) {
        this.uiManager.showMessageOptions(messageId);
    }

    showToast(message, type = 'info') {
        this.uiManager.showToast(message, type);
    }

    scrollToBottom() {
        this.uiManager.scrollToBottom();
    }

    cancelReply() {
        this.uiManager.cancelReply();
    }

    toggleReaction(emoji, element) {
        this.chatManager.toggleReaction(emoji, element);
    }

    // ============================================
    // تصدير الدوال للموديولات
    // ============================================
    getMessages() {
        return this.messages;
    }

    getUsers() {
        return this.users;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAdminUser() {
        return this.isAdmin;
    }
}

// ============================================
// بدء التطبيق
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NeZekApp();
});

export default NeZekApp;

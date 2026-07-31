import { 
    db, auth, storage,
    collection, doc, getDoc, getDocs,
    addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy,
    where, serverTimestamp, setDoc,
    signInAnonymously, onAuthStateChanged, signOut,
    ref, uploadBytes, getDownloadURL
} from './firebase-config.js';

// ============================================
// التطبيق الرئيسي
// ============================================
class NeZekApp {
    constructor() {
        // البيانات
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
        this.isLoading = true;
        
        // المراجع
        this.messagesListener = null;
        this.usersListener = null;
        
        // بدء التطبيق
        this.init();
    }

    // ============================================
    // التهيئة
    // ============================================
    async init() {
        console.log('🚀 بدء تشغيل التطبيق...');
        
        // إظهار شاشة التحميل
        this.showLoading();
        
        // تطبيق الثيم
        this.applyTheme(this.currentTheme);
        
        // إعداد المستمعين
        this.setupEventListeners();
        
        // محاولة استعادة الجلسة
        const sessionData = localStorage.getItem('nezek_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                console.log('📦 جلسة محفوظة:', session);
                
                // التحقق من صحة الجلسة
                const userRef = doc(db, 'users', session.userId);
                const userDoc = await getDoc(userRef);
                
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (!data.banned) {
                        this.currentUser = { id: session.userId, ...data };
                        this.isAdmin = data.isAdmin || false;
                        
                        // تحديث حالة الاتصال
                        await updateDoc(userRef, {
                            online: true,
                            lastSeen: serverTimestamp()
                        });
                        
                        console.log('✅ تم استعادة الجلسة:', this.currentUser.username);
                        this.showChat();
                        this.startListeners();
                        this.hideLoading();
                        return;
                    }
                }
                
                // الجلسة غير صالحة
                localStorage.removeItem('nezek_session');
            } catch (e) {
                console.error('❌ خطأ في استعادة الجلسة:', e);
                localStorage.removeItem('nezek_session');
            }
        }
        
        // لا توجد جلسة - عرض شاشة تسجيل الدخول
        console.log('🔐 لا توجد جلسة، عرض شاشة تسجيل الدخول');
        this.showLogin();
        this.hideLoading();
    }

    // ============================================
    // إدارة الشاشات
    // ============================================
    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-screen').style.display = 'none';
        this.isLoading = false;
    }

    showLogin() {
        console.log('📱 عرض شاشة تسجيل الدخول');
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('chat-app').style.display = 'none';
        document.getElementById('password-group').style.display = 'none';
        document.getElementById('password').value = '';
        document.getElementById('username').value = '';
        this.hideLoading();
    }

    showProfileSetup() {
        console.log('📱 عرض شاشة إعداد الملف الشخصي');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('profile-setup').style.display = 'flex';
        document.getElementById('chat-app').style.display = 'none';
        document.getElementById('display-name').value = this.currentUser?.username || '';
        this.hideLoading();
    }

    showChat() {
        console.log('💬 عرض واجهة الدردشة');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('chat-app').style.display = 'flex';
        
        this.updateUI();
        this.hideLoading();
    }

    // ============================================
    // بدء المستمعين
    // ============================================
    startListeners() {
        console.log('📡 بدء الاستماع للرسائل والمستخدمين');
        this.startMessagesListener();
        this.startUsersListener();
    }

    startMessagesListener() {
        if (this.messagesListener) {
            this.messagesListener();
            this.messagesListener = null;
        }
        
        const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
        
        this.messagesListener = onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                messages.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.() || new Date()
                });
            });
            
            this.messages = messages;
            this.renderMessages(messages);
            this.updateUnreadCount(messages);
            
            if (this.isAtBottom) {
                this.scrollToBottom();
            }
            
        }, (error) => {
            console.error('❌ خطأ في استماع الرسائل:', error);
        });
    }

    startUsersListener() {
        if (this.usersListener) {
            this.usersListener();
            this.usersListener = null;
        }
        
        this.usersListener = onSnapshot(collection(db, 'users'), (snapshot) => {
            const users = [];
            let onlineCount = 0;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                users.push({ id: doc.id, ...data });
                if (data.online) onlineCount++;
            });
            
            this.users = users;
            
            // تحديث عدد المتصلين
            const onlineEl = document.getElementById('online-count');
            if (onlineEl) onlineEl.textContent = onlineCount;
            
            // تحديث إحصائيات المسؤول
            if (this.isAdmin) {
                const statsUsers = document.getElementById('stat-users');
                const statsOnline = document.getElementById('stat-online');
                const statsBanned = document.getElementById('stat-banned');
                const statsMessages = document.getElementById('stat-messages');
                
                if (statsUsers) statsUsers.textContent = users.length;
                if (statsOnline) statsOnline.textContent = onlineCount;
                if (statsBanned) statsBanned.textContent = users.filter(u => u.banned).length;
                if (statsMessages) statsMessages.textContent = this.messages.length;
            }
        }, (error) => {
            console.error('❌ خطأ في استماع المستخدمين:', error);
        });
    }

    // ============================================
    // تسجيل الدخول
    // ============================================
    async handleLogin() {
        console.log('🔑 محاولة تسجيل الدخول...');
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username) {
            this.showToast('⚠️ يرجى إدخال اسم المستخدم', 'error');
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
                this.showToast('❌ كلمة مرور غير صحيحة للمسؤول', 'error');
                return;
            }
            
            // تسجيل دخول المسؤول
            await this.adminLogin();
            return;
        }
        
        // مستخدم عادي - إخفاء حقل كلمة المرور
        document.getElementById('password-group').style.display = 'none';
        
        try {
            // التحقق من وجود المستخدم
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            let userDoc = null;
            let isNewUser = false;
            
            if (querySnapshot.empty) {
                // مستخدم جديد - إنشاء حساب
                console.log('👤 مستخدم جديد:', username);
                isNewUser = true;
                
                const result = await signInAnonymously(auth);
                const uid = result.user.uid;
                
                const userData = {
                    username: username,
                    isAdmin: false,
                    color: this.currentColor,
                    avatar: null,
                    createdAt: serverTimestamp(),
                    lastSeen: serverTimestamp(),
                    online: true,
                    banned: false,
                    violations: 0,
                    isRealUser: true
                };
                
                await setDoc(doc(db, 'users', uid), userData);
                userDoc = { id: uid, ...userData };
                
            } else {
                // مستخدم موجود
                querySnapshot.forEach(doc => {
                    userDoc = { id: doc.id, ...doc.data() };
                });
                
                if (userDoc.banned) {
                    this.showToast('⛔ هذا الحساب محظور', 'error');
                    return;
                }
                
                // تحديث حالة الاتصال
                await updateDoc(doc(db, 'users', userDoc.id), {
                    online: true,
                    lastSeen: serverTimestamp()
                });
            }
            
            this.currentUser = userDoc;
            this.isAdmin = userDoc.isAdmin || false;
            
            // حفظ الجلسة
            localStorage.setItem('nezek_session', JSON.stringify({
                userId: userDoc.id,
                username: userDoc.username,
                isAdmin: this.isAdmin,
                timestamp: Date.now()
            }));
            
            console.log('✅ تسجيل دخول ناجح:', username);
            this.showToast(`👋 مرحباً ${username}`, 'success');
            this.showChat();
            this.startListeners();
            
        } catch (error) {
            console.error('❌ خطأ في تسجيل الدخول:', error);
            this.showToast('❌ حدث خطأ في تسجيل الدخول', 'error');
        }
    }

    // ============================================
    // تسجيل دخول المسؤول (مخفي)
    // ============================================
    async adminLogin() {
        console.log('👑 محاولة تسجيل دخول المسؤول...');
        
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', 'slx23m'));
            const querySnapshot = await getDocs(q);
            
            let userDoc = null;
            
            if (querySnapshot.empty) {
                // إنشاء حساب المسؤول
                const result = await signInAnonymously(auth);
                const uid = result.user.uid;
                
                const adminData = {
                    username: 'slx23m',
                    isAdmin: true,
                    color: '#9C27B0',
                    avatar: null,
                    createdAt: serverTimestamp(),
                    lastSeen: serverTimestamp(),
                    online: true,
                    banned: false,
                    violations: 0,
                    isRealUser: true
                };
                
                await setDoc(doc(db, 'users', uid), adminData);
                userDoc = { id: uid, ...adminData };
                
            } else {
                querySnapshot.forEach(doc => {
                    userDoc = { id: doc.id, ...doc.data() };
                });
                
                await updateDoc(doc(db, 'users', userDoc.id), {
                    online: true,
                    lastSeen: serverTimestamp(),
                    isAdmin: true
                });
            }
            
            this.currentUser = userDoc;
            this.isAdmin = true;
            
            localStorage.setItem('nezek_session', JSON.stringify({
                userId: userDoc.id,
                username: 'slx23m',
                isAdmin: true,
                timestamp: Date.now()
            }));
            
            console.log('✅ تسجيل دخول المسؤول ناجح');
            this.showToast('👑 مرحباً أيها المسؤول', 'success');
            this.showChat();
            this.startListeners();
            
            // إظهار زر المسؤول
            document.getElementById('admin-panel-btn').style.display = 'flex';
            
        } catch (error) {
            console.error('❌ خطأ في تسجيل دخول المسؤول:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ============================================
    // تسجيل الخروج
    // ============================================
    async handleLogout() {
        console.log('🚪 تسجيل الخروج...');
        
        try {
            if (this.currentUser) {
                await updateDoc(doc(db, 'users', this.currentUser.id), {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            }
            
            await signOut(auth);
            localStorage.removeItem('nezek_session');
            
            // إيقاف المستمعين
            if (this.messagesListener) {
                this.messagesListener();
                this.messagesListener = null;
            }
            if (this.usersListener) {
                this.usersListener();
                this.usersListener = null;
            }
            
            this.currentUser = null;
            this.isAdmin = false;
            
            this.showLogin();
            this.showToast('👋 تم تسجيل الخروج', 'info');
            
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ============================================
    // عرض الرسائل
    // ============================================
    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (!this.currentUser || !container) return;
        
        let html = '';
        let lastSender = null;
        let lastTime = null;
        
        messages.forEach((msg) => {
            const isOwn = msg.senderId === this.currentUser.id;
            const isSystem = msg.senderId === 'system';
            const isSameSender = lastSender === msg.senderId;
            const timeDiff = lastTime ? (new Date(msg.timestamp) - new Date(lastTime)) / 1000 : 999;
            const showHeader = !isSameSender || timeDiff > 300;
            
            if (isSystem) {
                html += `<div class="message message-system">${msg.text}</div>`;
                return;
            }
            
            const sender = this.users.find(u => u.id === msg.senderId);
            const senderColor = msg.color || '#25D366';
            const senderName = msg.senderName || sender?.username || 'مستخدم';
            
            // إخفاء اسم المسؤول للمستخدمين العاديين
            const displayName = (senderName === 'slx23m' && !this.isAdmin) ? 'مسؤول' : senderName;
            
            html += `
                <div class="message ${isOwn ? 'message-sent' : 'message-received'}" 
                     data-message-id="${msg.id}"
                     data-sender-id="${msg.senderId}"
                     ${!isOwn ? `onclick="window.app.showMessageOptions('${msg.id}')"` : ''}>
                    
                    ${showHeader && !isOwn ? `
                        <div class="message-header">
                            <span class="message-sender" style="color:${senderColor}">${displayName}</span>
                            <span class="message-time">${this.formatTime(msg.timestamp)}</span>
                        </div>
                    ` : ''}
                    
                    ${msg.replyTo ? `
                        <div class="message-reply">
                            <span class="reply-label">↩️ رد على:</span>
                            <span class="reply-text">${this.escapeHtml(msg.replyTo.text)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="message-text">${this.escapeHtml(msg.text)}</div>
                    
                    ${this.renderReactions(msg.reactions || {})}
                    
                    <div class="message-footer">
                        ${msg.edited ? '<span class="message-edited">(معدّل)</span>' : ''}
                        <span>${this.formatTime(msg.timestamp)}</span>
                        ${isOwn ? ' ✓✓' : ''}
                    </div>
                </div>
            `;
            
            lastSender = msg.senderId;
            lastTime = msg.timestamp;
        });
        
        container.innerHTML = html;
        this.updateReadStatus(messages);
    }

    renderReactions(reactions) {
        if (!reactions || Object.keys(reactions).length === 0) return '';
        
        let html = '<div class="message-reactions">';
        for (const [emoji, users] of Object.entries(reactions)) {
            html += `
                <span class="reaction" onclick="event.stopPropagation();window.app.toggleReaction('${emoji}', this)">
                    ${emoji}
                    <span class="reaction-count">${users.length}</span>
                </span>
            `;
        }
        html += '</div>';
        return html;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        return date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async updateReadStatus(messages) {
        const unread = messages.filter(m => 
            m.senderId !== this.currentUser.id && !m.read
        );
        
        for (const msg of unread) {
            try {
                await updateDoc(doc(db, 'messages', msg.id), {
                    read: true,
                    readAt: serverTimestamp()
                });
            } catch (e) {}
        }
    }

    updateUnreadCount(messages) {
        const unread = messages.filter(m => 
            m.senderId !== this.currentUser.id && !m.read
        ).length;
        
        this.unreadCount = unread;
        const badge = document.getElementById('new-messages-badge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
    }

    // ============================================
    // إرسال رسالة
    // ============================================
    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text || !this.currentUser) return;
        
        if (this.currentUser.banned) {
            this.showToast('⛔ أنت محظور من الكتابة', 'error');
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
                color: this.currentUser.color || '#25D366',
                reactions: {}
            };
            
            if (this.replyTo) {
                messageData.replyTo = {
                    id: this.replyTo.id,
                    text: this.replyTo.text,
                    senderName: this.replyTo.senderName
                };
                this.cancelReply();
            }
            
            if (this.editMessageId) {
                await updateDoc(doc(db, 'messages', this.editMessageId), {
                    text: text,
                    edited: true,
                    editedAt: serverTimestamp()
                });
                this.editMessageId = null;
                document.getElementById('send-btn').innerHTML = '<span class="material-symbols-outlined">send</span>';
                document.getElementById('message-input').placeholder = 'اكتب رسالة...';
            } else {
                await addDoc(collection(db, 'messages'), messageData);
            }
            
            input.value = '';
            input.style.height = 'auto';
            this.scrollToBottom();
            
        } catch (error) {
            console.error('❌ خطأ في الإرسال:', error);
            this.showToast('❌ حدث خطأ في الإرسال', 'error');
        }
    }

    // ============================================
    // التفاعلات
    // ============================================
    async toggleReaction(emoji, element) {
        const messageEl = element.closest('.message');
        if (!messageEl) return;
        
        const messageId = messageEl.dataset.messageId;
        const message = this.messages.find(m => m.id === messageId);
        if (!message || !this.currentUser) return;
        
        const userId = this.currentUser.id;
        const reactions = message.reactions || {};
        
        if (!reactions[emoji]) reactions[emoji] = [];
        
        const index = reactions[emoji].indexOf(userId);
        if (index > -1) {
            reactions[emoji].splice(index, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            for (const [key, users] of Object.entries(reactions)) {
                const idx = users.indexOf(userId);
                if (idx > -1) {
                    users.splice(idx, 1);
                    if (users.length === 0) delete reactions[key];
                }
            }
            reactions[emoji] = [userId];
        }
        
        try {
            await updateDoc(doc(db, 'messages', messageId), { reactions });
        } catch (error) {
            console.error('❌ خطأ في التفاعل:', error);
        }
    }

    // ============================================
    // خيارات الرسالة
    // ============================================
    showMessageOptions(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        this.selectedMessageId = messageId;
        const menu = document.getElementById('message-options');
        menu.style.display = 'block';
        
        const adminBtns = menu.querySelectorAll('.admin-only');
        if (this.isAdmin) {
            adminBtns.forEach(btn => btn.style.display = 'flex');
        } else {
            adminBtns.forEach(btn => btn.style.display = 'none');
        }
        
        const editBtn = document.getElementById('edit-option');
        if (editBtn) {
            editBtn.style.display = message.senderId === this.currentUser.id ? 'flex' : 'none';
        }
    }

    closeMessageOptions() {
        document.getElementById('message-options').style.display = 'none';
        document.getElementById('reactions-popup').style.display = 'none';
        this.selectedMessageId = null;
    }

    handleMessageAction(action) {
        if (!this.selectedMessageId) return;
        
        const message = this.messages.find(m => m.id === this.selectedMessageId);
        if (!message) return;
        
        switch(action) {
            case 'reply':
                this.replyToMessage(this.selectedMessageId);
                break;
            case 'react':
                this.showReactionsPopup();
                break;
            case 'copy':
                this.copyMessage(this.selectedMessageId);
                break;
            case 'edit':
                if (message.senderId === this.currentUser.id) {
                    this.editMessage(this.selectedMessageId);
                }
                break;
            case 'report':
                this.reportMessage(this.selectedMessageId);
                break;
            case 'delete':
                if (this.isAdmin) this.deleteMessage(this.selectedMessageId);
                break;
            case 'ban':
                if (this.isAdmin) this.banUser(message.senderId);
                break;
            case 'delete-all':
                if (this.isAdmin) this.deleteUserMessages(message.senderId);
                break;
        }
    }

    // ============================================
    // دوال مساعدة
    // ============================================
    replyToMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        this.replyTo = {
            id: message.id,
            text: message.text,
            senderName: message.senderName
        };
        
        document.getElementById('reply-username').textContent = message.senderName;
        document.getElementById('reply-text').textContent = message.text;
        document.getElementById('reply-bar').style.display = 'block';
        document.getElementById('message-input').focus();
        this.closeMessageOptions();
    }

    cancelReply() {
        this.replyTo = null;
        document.getElementById('reply-bar').style.display = 'none';
    }

    editMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message || message.senderId !== this.currentUser.id) {
            this.showToast('❌ لا يمكنك تعديل هذه الرسالة', 'error');
            return;
        }
        
        this.editMessageId = messageId;
        const input = document.getElementById('message-input');
        input.value = message.text;
        input.focus();
        input.placeholder = '✏️ تعديل الرسالة...';
        document.getElementById('send-btn').innerHTML = '<span class="material-symbols-outlined">save</span>';
        this.closeMessageOptions();
    }

    async copyMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        try {
            await navigator.clipboard.writeText(message.text);
            this.showToast('✅ تم نسخ النص', 'success');
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = message.text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('✅ تم نسخ النص', 'success');
        }
        this.closeMessageOptions();
    }

    async reportMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        try {
            await addDoc(collection(db, 'reports'), {
                messageId: messageId,
                messageText: message.text,
                senderId: message.senderId,
                senderName: message.senderName,
                reporterId: this.currentUser.id,
                reporterName: this.currentUser.username,
                timestamp: serverTimestamp(),
                resolved: false
            });
            this.showToast('✅ تم الإبلاغ', 'success');
        } catch (error) {
            console.error('❌ خطأ في الإبلاغ:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
        this.closeMessageOptions();
    }

    async deleteMessage(messageId) {
        if (!this.isAdmin) {
            this.showToast('❌ غير مصرح', 'error');
            return;
        }
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        
        try {
            await deleteDoc(doc(db, 'messages', messageId));
            this.showToast('✅ تم حذف الرسالة', 'success');
        } catch (error) {
            console.error('❌ خطأ في حذف الرسالة:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
        this.closeMessageOptions();
    }

    async banUser(userId) {
        if (!this.isAdmin) {
            this.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        if (user.isAdmin) {
            this.showToast('❌ لا يمكن حظر المسؤول', 'error');
            return;
        }
        
        if (!confirm(`هل تريد حظر المستخدم ${user.username}؟`)) return;
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: true,
                bannedAt: serverTimestamp(),
                online: false
            });
            this.showToast(`✅ تم حظر ${user.username}`, 'success');
        } catch (error) {
            console.error('❌ خطأ في الحظر:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
        this.closeMessageOptions();
    }

    async deleteUserMessages(senderId) {
        if (!this.isAdmin) {
            this.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        const user = this.users.find(u => u.id === senderId);
        if (!confirm(`هل تريد حذف جميع رسائل ${user?.username || 'المستخدم'}؟`)) return;
        
        try {
            const q = query(collection(db, 'messages'), where('senderId', '==', senderId));
            const snapshot = await getDocs(q);
            for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
            }
            this.showToast('✅ تم حذف جميع الرسائل', 'success');
        } catch (error) {
            console.error('❌ خطأ في حذف الرسائل:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
        this.closeMessageOptions();
    }

    showReactionsPopup() {
        const popup = document.getElementById('reactions-popup');
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
        
        document.querySelectorAll('.reaction-emoji').forEach(el => {
            el.onclick = () => {
                if (this.selectedMessageId) {
                    this.addReactionToMessage(this.selectedMessageId, el.textContent);
                    popup.style.display = 'none';
                }
            };
        });
    }

    async addReactionToMessage(messageId, emoji) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message || !this.currentUser) return;
        
        const userId = this.currentUser.id;
        const reactions = message.reactions || {};
        
        if (!reactions[emoji]) reactions[emoji] = [];
        
        const index = reactions[emoji].indexOf(userId);
        if (index > -1) {
            reactions[emoji].splice(index, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            for (const [key, users] of Object.entries(reactions)) {
                const idx = users.indexOf(userId);
                if (idx > -1) {
                    users.splice(idx, 1);
                    if (users.length === 0) delete reactions[key];
                }
            }
            reactions[emoji] = [userId];
        }
        
        try {
            await updateDoc(doc(db, 'messages', messageId), { reactions });
        } catch (error) {
            console.error('❌ خطأ في إضافة التفاعل:', error);
        }
    }

    // ============================================
    // البحث
    // ============================================
    searchMessages(query) {
        if (!query.trim()) {
            this.renderMessages(this.messages);
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const results = this.messages.filter(m => 
            m.text.toLowerCase().includes(lowerQuery) ||
            m.senderName.toLowerCase().includes(lowerQuery)
        );
        
        if (results.length === 0) {
            this.showToast('🔍 لا توجد نتائج', 'info');
            return;
        }
        
        this.renderMessages(results);
        this.showToast(`🔍 تم العثور على ${results.length} نتيجة`, 'success');
        
        const first = document.querySelector('[data-message-id="' + results[0].id + '"]');
        if (first) {
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            first.style.background = 'var(--primary)';
            setTimeout(() => first.style.background = '', 3000);
        }
    }

    // ============================================
    // واجهة المستخدم
    // ============================================
    updateUI() {
        if (!this.currentUser) return;
        
        document.getElementById('user-name').textContent = this.currentUser.username;
        
        if (this.currentUser.avatar) {
            document.getElementById('user-avatar').src = this.currentUser.avatar;
        }
        
        // إظهار/إخفاء زر المسؤول
        const adminBtn = document.getElementById('admin-panel-btn');
        if (this.isAdmin) {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }
        
        if (this.currentUser.color) {
            document.documentElement.style.setProperty('--primary', this.currentUser.color);
        }
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
        if (icon) icon.textContent = icons[theme] || 'dark_mode';
        localStorage.setItem('theme', theme);
    }

    toggleTheme() {
        const themes = ['dark', 'light', 'purple', 'forest', 'pink', 'ocean'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.currentTheme = themes[nextIndex];
        this.applyTheme(this.currentTheme);
    }

    toggleEmojiPanel() {
        const panel = document.getElementById('emoji-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    insertEmoji(emoji) {
        const input = document.getElementById('message-input');
        const start = input.selectionStart;
        const text = input.value;
        input.value = text.substring(0, start) + emoji + text.substring(start);
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
        document.getElementById('emoji-panel').style.display = 'none';
        this.autoResizeInput();
    }

    autoResizeInput() {
        const input = document.getElementById('message-input');
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    }

    scrollToBottom() {
        const container = document.getElementById('chat-main');
        container.scrollTop = container.scrollHeight;
        this.isAtBottom = true;
        document.getElementById('scroll-bottom-btn').style.display = 'none';
    }

    checkScrollPosition() {
        const container = document.getElementById('chat-main');
        const threshold = 100;
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        this.isAtBottom = atBottom;
        
        const btn = document.getElementById('scroll-bottom-btn');
        if (!atBottom && this.unreadCount > 0) {
            btn.style.display = 'flex';
            document.getElementById('new-messages-badge').textContent = this.unreadCount;
        } else {
            btn.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================
    // لوحة المسؤول
    // ============================================
    openAdminPanel() {
        if (!this.isAdmin) return;
        document.getElementById('admin-panel').style.display = 'block';
        this.loadAdminData();
    }

    closeAdminPanel() {
        document.getElementById('admin-panel').style.display = 'none';
    }

    async loadAdminData() {
        if (!this.isAdmin) return;
        
        try {
            // تحميل المستخدمين
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const users = [];
            usersSnapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            this.renderAdminUsers(users);
            
            // تحميل الكلمات المحظورة
            const wordsSnapshot = await getDocs(collection(db, 'bannedWords'));
            const words = [];
            wordsSnapshot.forEach(doc => {
                words.push({ id: doc.id, word: doc.data().word });
            });
            this.renderBannedWords(words);
            
            // تحديث الإحصائيات
            const online = users.filter(u => u.online).length;
            const banned = users.filter(u => u.banned).length;
            
            document.getElementById('stat-users').textContent = users.length;
            document.getElementById('stat-online').textContent = online;
            document.getElementById('stat-banned').textContent = banned;
            document.getElementById('stat-messages').textContent = this.messages.length;
            
        } catch (error) {
            console.error('❌ خطأ في تحميل بيانات المسؤول:', error);
        }
    }

    renderAdminUsers(users) {
        const container = document.getElementById('users-list');
        if (!container) return;
        
        let html = '';
        users.forEach(user => {
            const isBanned = user.banned || false;
            const isOnline = user.online || false;
            
            // إخفاء اسم المسؤول الحقيقي
            const displayName = user.username === 'slx23m' ? '👑 المسؤول' : user.username;
            
            html += `
                <div class="user-item">
                    <div class="user-info">
                        <img src="${user.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" fill="%231A2D3A"/%3E%3Ccircle cx="16" cy="12" r="7" fill="%2325D366"/%3E%3Ccircle cx="16" cy="24" r="9" fill="%2325D366" opacity="0.7"/%3E%3C/svg%3E'}" 
                             alt="${user.username}" 
                             class="user-avatar">
                        <div class="user-details">
                            <span class="username">
                                ${displayName}
                                ${user.isAdmin ? ' 👑' : ''}
                                ${isBanned ? ' 🚫' : ''}
                            </span>
                            <span class="user-meta">
                                ${isOnline ? '🟢 متصل' : '⚪ غير متصل'}
                            </span>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${!isBanned && !user.isAdmin ? `
                            <button class="action-btn ban-btn" onclick="window.app.banUser('${user.id}')">🚫</button>
                        ` : ''}
                        ${isBanned && !user.isAdmin ? `
                            <button class="action-btn unban-btn" onclick="window.app.unbanUser('${user.id}')">✅</button>
                        ` : ''}
                        ${!user.isAdmin ? `
                            <button class="action-btn delete-btn" onclick="window.app.deleteUser('${user.id}')">🗑️</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    renderBannedWords(words) {
        const container = document.getElementById('words-list');
        if (!container) return;
        
        if (words.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">📝 لا توجد كلمات محظورة</p>';
            return;
        }
        
        let html = '';
        words.forEach(item => {
            html += `
                <div class="word-item">
                    <span>${item.word}</span>
                    <button class="remove-word" onclick="window.app.deleteBannedWord('${item.id}')">✕</button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    async unbanUser(userId) {
        if (!this.isAdmin) return;
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: false,
                bannedAt: null
            });
            this.showToast('✅ تم فك الحظر', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('❌ خطأ في فك الحظر:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async deleteUser(userId) {
        if (!this.isAdmin) return;
        
        const user = this.users.find(u => u.id === userId);
        if (!user || user.isAdmin) {
            this.showToast('❌ لا يمكن حذف المسؤول', 'error');
            return;
        }
        
        if (!confirm(`⚠️ هل أنت متأكد من حذف المستخدم ${user.username}؟`)) return;
        
        try {
            const q = query(collection(db, 'messages'), where('senderId', '==', userId));
            const snapshot = await getDocs(q);
            for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
            }
            
            await deleteDoc(doc(db, 'users', userId));
            this.showToast(`✅ تم حذف ${user.username}`, 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('❌ خطأ في حذف المستخدم:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async addBannedWord() {
        if (!this.isAdmin) return;
        
        const input = document.getElementById('new-word');
        const word = input.value.trim();
        if (!word) {
            this.showToast('⚠️ يرجى إدخال كلمة', 'error');
            return;
        }
        
        try {
            await addDoc(collection(db, 'bannedWords'), {
                word: word,
                addedAt: serverTimestamp()
            });
            input.value = '';
            this.showToast('✅ تم إضافة الكلمة', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('❌ خطأ في إضافة الكلمة:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async deleteBannedWord(wordId) {
        if (!this.isAdmin) return;
        
        try {
            await deleteDoc(doc(db, 'bannedWords', wordId));
            this.showToast('✅ تم حذف الكلمة', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('❌ خطأ في حذف الكلمة:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async clearAllMessages() {
        if (!this.isAdmin) return;
        if (!confirm('⚠️ هل أنت متأكد من حذف جميع الرسائل؟')) return;
        
        try {
            const snapshot = await getDocs(collection(db, 'messages'));
            for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
            }
            this.showToast('✅ تم حذف جميع الرسائل', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('❌ خطأ في حذف الرسائل:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async logoutAllUsers() {
        if (!this.isAdmin) return;
        if (!confirm('هل أنت متأكد من تسجيل خروج الجميع؟')) return;
        
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            for (const doc of snapshot.docs) {
                await updateDoc(doc.ref, {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            }
            this.showToast('✅ تم تسجيل خروج الجميع', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ============================================
    // مستمعات الأحداث
    // ============================================
    setupEventListeners() {
        console.log('🎯 إعداد مستمعات الأحداث...');
        
        // ===== زر تسجيل الدخول =====
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // ===== نموذج تسجيل الدخول =====
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // ===== زر إظهار/إخفاء كلمة المرور =====
        const togglePass = document.getElementById('toggle-password');
        if (togglePass) {
            togglePass.addEventListener('click', () => {
                const input = document.getElementById('password');
                const icon = togglePass.querySelector('.material-symbols-outlined');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.textContent = 'visibility_off';
                } else {
                    input.type = 'password';
                    icon.textContent = 'visibility';
                }
            });
        }
        
        // ===== زر تسجيل الخروج =====
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // ===== زر تبديل الثيم =====
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // ===== زر لوحة المسؤول =====
        const adminBtn = document.getElementById('admin-panel-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                this.openAdminPanel();
            });
        }
        
        // ===== إغلاق لوحة المسؤول =====
        const closeAdmin = document.getElementById('close-admin');
        if (closeAdmin) {
            closeAdmin.addEventListener('click', () => {
                this.closeAdminPanel();
            });
        }
        
        // ===== زر الإيموجي =====
        const emojiBtn = document.getElementById('emoji-btn');
        if (emojiBtn) {
            emojiBtn.addEventListener('click', () => {
                this.toggleEmojiPanel();
            });
        }
        
        // ===== إغلاق الإيموجي =====
        const closeEmoji = document.getElementById('close-emoji');
        if (closeEmoji) {
            closeEmoji.addEventListener('click', () => {
                document.getElementById('emoji-panel').style.display = 'none';
            });
        }
        
        // ===== إدراج الإيموجي =====
        document.querySelectorAll('.emoji-item').forEach(el => {
            el.addEventListener('click', () => {
                this.insertEmoji(el.textContent);
            });
        });
        
        // ===== زر الإرسال =====
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        // ===== إدخال الرسالة =====
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
                if (e.key === 'Escape') {
                    this.cancelReply();
                    if (this.editMessageId) {
                        this.editMessageId = null;
                        document.getElementById('send-btn').innerHTML = '<span class="material-symbols-outlined">send</span>';
                        document.getElementById('message-input').placeholder = 'اكتب رسالة...';
                    }
                }
            });
            
            messageInput.addEventListener('input', () => {
                this.autoResizeInput();
            });
        }
        
        // ===== إلغاء الرد =====
        const cancelReplyBtn = document.getElementById('cancel-reply');
        if (cancelReplyBtn) {
            cancelReplyBtn.addEventListener('click', () => {
                this.cancelReply();
            });
        }
        
        // ===== التمرير =====
        const chatMain = document.getElementById('chat-main');
        if (chatMain) {
            chatMain.addEventListener('scroll', () => {
                this.checkScrollPosition();
            });
        }
        
        // ===== زر التمرير للأسفل =====
        const scrollBtn = document.getElementById('scroll-bottom-btn');
        if (scrollBtn) {
            scrollBtn.addEventListener('click', () => {
                this.scrollToBottom();
            });
        }
        
        // ===== خيارات الرسالة =====
        const optionsOverlay = document.querySelector('.options-overlay');
        if (optionsOverlay) {
            optionsOverlay.addEventListener('click', () => {
                this.closeMessageOptions();
            });
        }
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleMessageAction(btn.dataset.action);
            });
        });
        
        // ===== الصورة الشخصية =====
        const avatarUpload = document.getElementById('avatar-upload-btn');
        if (avatarUpload) {
            avatarUpload.addEventListener('click', () => {
                document.getElementById('avatar-input').click();
            });
        }
        
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', async (e) => {
                if (e.target.files[0]) {
                    await this.uploadAvatar(e.target.files[0]);
                }
            });
        }
        
        // ===== حفظ الملف الشخصي =====
        const saveProfile = document.getElementById('save-profile');
        if (saveProfile) {
            saveProfile.addEventListener('click', async () => {
                const name = document.getElementById('display-name').value.trim();
                if (!name) {
                    this.showToast('⚠️ يرجى إدخال اسم', 'error');
                    return;
                }
                
                try {
                    await updateDoc(doc(db, 'users', this.currentUser.id), {
                        username: name,
                        color: this.currentColor
                    });
                    this.currentUser.username = name;
                    this.currentUser.color = this.currentColor;
                    this.showToast('✅ تم حفظ الملف الشخصي', 'success');
                    this.showChat();
                } catch (error) {
                    console.error('❌ خطأ في الحفظ:', error);
                    this.showToast('❌ حدث خطأ', 'error');
                }
            });
        }
        
        // ===== اختيار اللون =====
        document.querySelectorAll('.color-item').forEach(el => {
            el.addEventListener('click', () => {
                const color = el.dataset.color;
                this.currentColor = color;
                document.querySelectorAll('.color-item').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                localStorage.setItem('color', color);
            });
        });
        
        // ===== البحث =====
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = prompt('🔍 ابحث في الرسائل:');
                if (query !== null) {
                    this.searchMessages(query);
                }
            });
        }
        
        // ===== تبويبات المسؤول =====
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
            });
        });
        
        // ===== بحث في المستخدمين =====
        const searchUsers = document.getElementById('search-users');
        if (searchUsers) {
            searchUsers.addEventListener('input', (e) => {
                // سيتم تنفيذ البحث في loadAdminData
            });
        }
        
        // ===== إضافة كلمة محظورة =====
        const addWordBtn = document.getElementById('add-word-btn');
        if (addWordBtn) {
            addWordBtn.addEventListener('click', () => {
                this.addBannedWord();
            });
        }
        
        const newWordInput = document.getElementById('new-word');
        if (newWordInput) {
            newWordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.addBannedWord();
                }
            });
        }
        
        // ===== إعدادات المسؤول =====
        const clearMessagesBtn = document.getElementById('clear-all-messages');
        if (clearMessagesBtn) {
            clearMessagesBtn.addEventListener('click', () => {
                this.clearAllMessages();
            });
        }
        
        const logoutAllBtn = document.getElementById('logout-all-users');
        if (logoutAllBtn) {
            logoutAllBtn.addEventListener('click', () => {
                this.logoutAllUsers();
            });
        }
        
        const resetBtn = document.getElementById('reset-app');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('⚠️ هل أنت متأكد من إعادة تعيين التطبيق؟')) {
                    localStorage.clear();
                    location.reload();
                }
            });
        }
        
        // ===== عارض الصور =====
        const closeViewer = document.getElementById('close-viewer');
        if (closeViewer) {
            closeViewer.addEventListener('click', () => {
                document.getElementById('image-viewer').style.display = 'none';
            });
        }
        
        const viewerOverlay = document.querySelector('.viewer-overlay');
        if (viewerOverlay) {
            viewerOverlay.addEventListener('click', () => {
                document.getElementById('image-viewer').style.display = 'none';
            });
        }
        
        console.log('✅ تم إعداد جميع المستمعات');
    }

    // ============================================
    // رفع الصورة الشخصية
    // ============================================
    async uploadAvatar(file) {
        if (!file || !this.currentUser) return;
        
        try {
            const compressed = await this.compressImage(file);
            const storageRef = ref(storage, `avatars/${this.currentUser.id}`);
            await uploadBytes(storageRef, compressed);
            const downloadURL = await getDownloadURL(storageRef);
            
            await updateDoc(doc(db, 'users', this.currentUser.id), {
                avatar: downloadURL
            });
            
            this.currentUser.avatar = downloadURL;
            document.getElementById('profile-preview').src = downloadURL;
            document.getElementById('user-avatar').src = downloadURL;
            
            this.showToast('✅ تم رفع الصورة', 'success');
        } catch (error) {
            console.error('❌ خطأ في رفع الصورة:', error);
            this.showToast('❌ حدث خطأ في رفع الصورة', 'error');
        }
    }

    compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 200;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX) {
                            height *= MAX / width;
                            width = MAX;
                        }
                    } else {
                        if (height > MAX) {
                            width *= MAX / height;
                            height = MAX;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(resolve, 'image/jpeg', 0.7);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }
}

// ============================================
// بدء التطبيق
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 تحميل التطبيق...');
    window.app = new NeZekApp();
});

export default NeZekApp;

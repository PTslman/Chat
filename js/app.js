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
        this.bannedWords = [];
        this.replyTo = null;
        this.editMessageId = null;
        this.selectedMessageId = null;
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.currentColor = localStorage.getItem('color') || '#25D366';
        this.unreadCount = 0;
        this.isAtBottom = true;
        
        // المراجع
        this.messagesListener = null;
        this.usersListener = null;
        
        // التهيئة
        this.init();
    }

    // ============================================
    // التهيئة
    // ============================================
    async init() {
        // إظهار شاشة التحميل
        this.showLoading();
        
        // تطبيق الثيم
        this.applyTheme(this.currentTheme);
        
        // إعداد المستمعين
        this.setupEventListeners();
        
        // التحقق من الجلسة المحفوظة
        const session = localStorage.getItem('nezek_session');
        if (session) {
            try {
                const data = JSON.parse(session);
                if (data.username) {
                    // محاولة استعادة الجلسة
                    await this.restoreSession(data);
                }
            } catch (e) {
                console.error('خطأ في استعادة الجلسة:', e);
            }
        }
        
        // مراقبة حالة المصادقة
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // المستخدم مسجل الدخول
                await this.handleUserAuthenticated(user);
            } else {
                // المستخدم غير مسجل
                this.showLogin();
                this.hideLoading();
            }
        });
    }

    // ============================================
    // إدارة الشاشات
    // ============================================
    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-screen').style.display = 'none';
    }

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('chat-app').style.display = 'none';
        document.getElementById('password-group').style.display = 'none';
        document.getElementById('password').value = '';
        document.getElementById('username').value = '';
        this.hideLoading();
    }

    showProfileSetup() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('profile-setup').style.display = 'flex';
        document.getElementById('chat-app').style.display = 'none';
        document.getElementById('display-name').value = this.currentUser?.username || '';
    }

    showChat() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('chat-app').style.display = 'flex';
        
        // تحديث الواجهة
        this.updateUI();
        
        // بدء الاستماع للرسائل
        this.startMessagesListener();
        
        // بدء الاستماع للمستخدمين
        this.startUsersListener();
        
        this.hideLoading();
    }

    // ============================================
    // نظام المصادقة
    // ============================================
    async handleUserAuthenticated(user) {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                
                // التحقق من الحظر
                if (data.banned) {
                    await signOut(auth);
                    this.showToast('⚠️ حسابك محظور', 'error');
                    this.showLogin();
                    return;
                }
                
                // تحديث الحالة
                await updateDoc(userRef, {
                    online: true,
                    lastSeen: serverTimestamp()
                });
                
                this.currentUser = { id: user.uid, ...data };
                this.isAdmin = data.isAdmin || false;
                
                // حفظ الجلسة
                localStorage.setItem('nezek_session', JSON.stringify({
                    username: data.username,
                    userId: user.uid,
                    isAdmin: this.isAdmin
                }));
                
                this.showChat();
                this.showToast(`👋 مرحباً ${data.username}`, 'success');
                
            } else {
                // مستخدم جديد
                this.currentUser = { id: user.uid };
                this.showProfileSetup();
            }
        } catch (error) {
            console.error('خطأ في التحقق:', error);
            this.showToast('❌ حدث خطأ', 'error');
            this.showLogin();
        }
    }

    async restoreSession(session) {
        try {
            const userRef = doc(db, 'users', session.userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (!data.banned) {
                    this.currentUser = { id: session.userId, ...data };
                    this.isAdmin = session.isAdmin || false;
                    
                    // تسجيل الدخول تلقائياً
                    await signInAnonymously(auth);
                    return true;
                }
            }
        } catch (e) {
            console.error('خطأ في استعادة الجلسة:', e);
        }
        return false;
    }

    async handleLogin() {
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
                this.showToast('❌ كلمة مرور غير صحيحة', 'error');
                return;
            }
            this.isAdmin = true;
        } else {
            document.getElementById('password-group').style.display = 'none';
            this.isAdmin = false;
        }
        
        try {
            // تسجيل الدخول
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
            
            await setDoc(doc(db, 'users', user.uid), userData);
            
            this.currentUser = { id: user.uid, ...userData };
            
            localStorage.setItem('nezek_session', JSON.stringify({
                username: username,
                userId: user.uid,
                isAdmin: this.isAdmin
            }));
            
            this.showToast(`🎉 مرحباً ${username}`, 'success');
            this.showChat();
            
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            this.showToast('❌ حدث خطأ في تسجيل الدخول', 'error');
        }
    }

    async handleLogout() {
        try {
            if (this.currentUser) {
                await updateDoc(doc(db, 'users', this.currentUser.id), {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            }
            
            await signOut(auth);
            localStorage.removeItem('nezek_session');
            this.currentUser = null;
            this.isAdmin = false;
            
            // إيقاف المستمعين
            if (this.messagesListener) {
                this.messagesListener();
                this.messagesListener = null;
            }
            if (this.usersListener) {
                this.usersListener();
                this.usersListener = null;
            }
            
            this.showLogin();
            this.showToast('👋 تم تسجيل الخروج', 'info');
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    }

    // ============================================
    // نظام المستخدمين
    // ============================================
    async saveProfile() {
        const displayName = document.getElementById('display-name').value.trim();
        if (!displayName) {
            this.showToast('⚠️ يرجى إدخال اسم', 'error');
            return;
        }
        
        try {
            await updateDoc(doc(db, 'users', this.currentUser.id), {
                username: displayName,
                color: this.currentColor
            });
            
            this.currentUser.username = displayName;
            this.currentUser.color = this.currentColor;
            
            this.showToast('✅ تم حفظ الملف الشخصي', 'success');
            this.showChat();
        } catch (error) {
            console.error('خطأ في الحفظ:', error);
            this.showToast('❌ حدث خطأ في الحفظ', 'error');
        }
    }

    async uploadAvatar(file) {
        if (!file) return;
        
        try {
            // ضغط الصورة
            const compressed = await this.compressImage(file);
            
            // رفع إلى التخزين
            const storageRef = ref(storage, `avatars/${this.currentUser.id}`);
            await uploadBytes(storageRef, compressed);
            const downloadURL = await getDownloadURL(storageRef);
            
            // تحديث في قاعدة البيانات
            await updateDoc(doc(db, 'users', this.currentUser.id), {
                avatar: downloadURL
            });
            
            this.currentUser.avatar = downloadURL;
            document.getElementById('profile-preview').src = downloadURL;
            document.getElementById('user-avatar').src = downloadURL;
            
            this.showToast('✅ تم رفع الصورة', 'success');
        } catch (error) {
            console.error('خطأ في رفع الصورة:', error);
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

    selectColor(color) {
        this.currentColor = color;
        document.querySelectorAll('.color-item').forEach(el => {
            el.classList.toggle('active', el.dataset.color === color);
        });
        localStorage.setItem('color', color);
    }

    // ============================================
    // نظام الدردشة
    // ============================================
    startMessagesListener() {
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
            
            // التمرير للأسفل إذا كان المستخدم في الأسفل
            if (this.isAtBottom) {
                this.scrollToBottom();
            }
        }, (error) => {
            console.error('خطأ في استماع الرسائل:', error);
        });
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
            
            // تحديث إحصائيات المسؤول
            if (this.isAdmin) {
                document.getElementById('stat-users').textContent = users.length;
                document.getElementById('stat-online').textContent = onlineCount;
                document.getElementById('stat-banned').textContent = users.filter(u => u.banned).length;
                document.getElementById('stat-messages').textContent = this.messages.length;
            }
        });
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (!this.currentUser) return;
        
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
                html += `
                    <div class="message message-system">
                        ${msg.text}
                    </div>
                `;
                return;
            }
            
            const senderColor = msg.color || '#25D366';
            const reactionsHtml = this.renderReactions(msg.reactions || {});
            
            html += `
                <div class="message ${isOwn ? 'message-sent' : 'message-received'}" 
                     data-message-id="${msg.id}"
                     data-sender-id="${msg.senderId}"
                     ${!isOwn ? `onclick="app.showMessageOptions('${msg.id}')"` : ''}
                     ${!isOwn ? 'oncontextmenu="event.preventDefault();app.showMessageOptions(this.dataset.messageId);"' : ''}>
                    
                    ${showHeader && !isOwn ? `
                        <div class="message-header">
                            <span class="message-sender" style="color:${senderColor}">
                                ${msg.senderName}
                            </span>
                            <span class="message-time">${this.formatTime(msg.timestamp)}</span>
                        </div>
                    ` : ''}
                    
                    ${!showHeader && !isOwn ? `
                        <div class="message-header" style="display:none;">
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
                    
                    ${reactionsHtml}
                    
                    <div class="message-footer">
                        ${msg.edited ? '<span class="message-edited">(معدّل)</span>' : ''}
                        <span>${this.formatTime(msg.timestamp)}</span>
                        ${isOwn ? ' <span>✓✓</span>' : ''}
                    </div>
                </div>
            `;
            
            lastSender = msg.senderId;
            lastTime = msg.timestamp;
        });
        
        container.innerHTML = html;
        
        // تحديث حالة القراءة
        this.updateReadStatus(messages);
    }

    renderReactions(reactions) {
        if (!reactions || Object.keys(reactions).length === 0) return '';
        
        let html = '<div class="message-reactions">';
        for (const [emoji, users] of Object.entries(reactions)) {
            html += `
                <span class="reaction" onclick="event.stopPropagation();app.toggleReaction('${emoji}', this)">
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

    updateReadStatus(messages) {
        // تحديث حالة القراءة للرسائل
        const unread = messages.filter(m => 
            m.senderId !== this.currentUser.id && !m.read
        );
        
        unread.forEach(async (msg) => {
            try {
                await updateDoc(doc(db, 'messages', msg.id), {
                    read: true,
                    readAt: serverTimestamp()
                });
            } catch (e) {
                // تجاهل
            }
        });
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

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        // التحقق من الحظر
        if (this.currentUser.banned) {
            this.showToast('⛔ أنت محظور من الكتابة', 'error');
            return;
        }
        
        // التحقق من الكلمات المحظورة
        const hasBanned = await this.checkBannedWords(text);
        if (hasBanned) {
            this.showToast('⛔ تحتوي على كلمة محظورة', 'error');
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
            }
            
            if (this.editMessageId) {
                // تعديل رسالة موجودة
                await updateDoc(doc(db, 'messages', this.editMessageId), {
                    text: text,
                    edited: true,
                    editedAt: serverTimestamp()
                });
                this.editMessageId = null;
                document.getElementById('send-btn').innerHTML = '<span class="material-symbols-outlined">send</span>';
                input.placeholder = 'اكتب رسالة...';
            } else {
                // إرسال رسالة جديدة
                await addDoc(collection(db, 'messages'), messageData);
            }
            
            input.value = '';
            input.style.height = 'auto';
            this.cancelReply();
            this.scrollToBottom();
            
        } catch (error) {
            console.error('خطأ في الإرسال:', error);
            this.showToast('❌ حدث خطأ في الإرسال', 'error');
        }
    }

    async checkBannedWords(text) {
        if (this.bannedWords.length === 0) {
            // تحميل الكلمات المحظورة
            try {
                const snapshot = await getDocs(collection(db, 'bannedWords'));
                this.bannedWords = [];
                snapshot.forEach(doc => {
                    this.bannedWords.push(doc.data().word.toLowerCase());
                });
            } catch (e) {
                return false;
            }
        }
        
        const lowerText = text.toLowerCase();
        return this.bannedWords.some(word => lowerText.includes(word));
    }

    async toggleReaction(emoji, element) {
        const messageEl = element.closest('.message');
        if (!messageEl) return;
        
        const messageId = messageEl.dataset.messageId;
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        const userId = this.currentUser.id;
        const reactions = message.reactions || {};
        
        if (!reactions[emoji]) reactions[emoji] = [];
        
        const index = reactions[emoji].indexOf(userId);
        if (index > -1) {
            reactions[emoji].splice(index, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji].push(userId);
        }
        
        try {
            await updateDoc(doc(db, 'messages', messageId), { reactions });
        } catch (error) {
            console.error('خطأ في التفاعل:', error);
        }
    }

    async replyToMessage(messageId) {
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

    async editMessage(messageId) {
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
            // طريقة بديلة
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
                reporterId: this.currentUser.id,
                timestamp: serverTimestamp(),
                resolved: false
            });
            this.showToast('✅ تم الإبلاغ', 'success');
        } catch (error) {
            console.error('خطأ في الإبلاغ:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
        this.closeMessageOptions();
    }

    showMessageOptions(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        this.selectedMessageId = messageId;
        const menu = document.getElementById('message-options');
        menu.style.display = 'block';
        
        // إظهار/إخفاء أزرار المسؤول
        const adminBtns = menu.querySelectorAll('.admin-only');
        if (this.isAdmin) {
            adminBtns.forEach(btn => btn.style.display = 'flex');
        } else {
            adminBtns.forEach(btn => btn.style.display = 'none');
        }
        
        // إظهار/إخفاء زر التعديل
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
                this.editMessage(this.selectedMessageId);
                break;
            case 'report':
                this.reportMessage(this.selectedMessageId);
                break;
            case 'delete':
                if (this.isAdmin) this.deleteMessage(this.selectedMessageId);
                break;
            case 'ban':
                if (this.isAdmin) this.banUserByMessage(this.selectedMessageId);
                break;
            case 'delete-all':
                if (this.isAdmin) this.deleteAllUserMessages(this.selectedMessageId);
                break;
        }
    }

    showReactionsPopup() {
        const popup = document.getElementById('reactions-popup');
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
        
        // إضافة مستمعين للتفاعلات
        document.querySelectorAll('.reaction-emoji').forEach(el => {
            el.onclick = () => {
                if (this.selectedMessageId) {
                    this.addReaction(this.selectedMessageId, el.textContent);
                    popup.style.display = 'none';
                }
            };
        });
    }

    async addReaction(messageId, emoji) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        const userId = this.currentUser.id;
        const reactions = message.reactions || {};
        
        if (!reactions[emoji]) reactions[emoji] = [];
        
        const index = reactions[emoji].indexOf(userId);
        if (index > -1) {
            reactions[emoji].splice(index, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            // إزالة التفاعل القديم إذا كان موجوداً
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
            console.error('خطأ في إضافة التفاعل:', error);
        }
    }

    // ============================================
    // نظام المسؤول
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
        // تحميل المستخدمين
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const users = [];
            usersSnapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            this.renderUsers(users);
            
            // تحميل الكلمات المحظورة
            const wordsSnapshot = await getDocs(collection(db, 'bannedWords'));
            const words = [];
            wordsSnapshot.forEach(doc => {
                words.push({ id: doc.id, word: doc.data().word });
            });
            this.renderBannedWords(words);
            
            // تحميل المحظورين
            const banned = users.filter(u => u.banned);
            this.renderBannedUsers(banned);
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات المسؤول:', error);
        }
    }

    renderUsers(users) {
        const container = document.getElementById('users-list');
        if (!container) return;
        
        let html = '';
        users.forEach(user => {
            const isBanned = user.banned || false;
            html += `
                <div class="user-item">
                    <div class="user-info">
                        <img src="${user.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" fill="%231A2D3A"/%3E%3Ccircle cx="16" cy="12" r="7" fill="%2325D366"/%3E%3Ccircle cx="16" cy="24" r="9" fill="%2325D366" opacity="0.7"/%3E%3C/svg%3E'}" 
                             alt="${user.username}" 
                             class="user-avatar">
                        <div class="user-details">
                            <span class="username">${user.username}</span>
                            <span class="user-meta">
                                ${user.online ? '🟢 متصل' : '⚪ غير متصل'}
                                ${user.isAdmin ? ' 👑' : ''}
                                ${isBanned ? ' 🚫' : ''}
                            </span>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${!isBanned ? `
                            <button class="action-btn ban-btn" onclick="app.banUser('${user.id}')">
                                حظر
                            </button>
                        ` : `
                            <button class="action-btn unban-btn" onclick="app.unbanUser('${user.id}')">
                                فك الحظر
                            </button>
                        `}
                        <button class="action-btn delete-btn" onclick="app.deleteUser('${user.id}')">
                            حذف
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    renderBannedUsers(bannedUsers) {
        const container = document.getElementById('banned-list');
        if (!container) return;
        
        if (bannedUsers.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">🚫 لا يوجد مستخدمين محظورين</p>';
            return;
        }
        
        let html = '';
        bannedUsers.forEach(user => {
            html += `
                <div class="user-item">
                    <div class="user-info">
                        <img src="${user.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" fill="%231A2D3A"/%3E%3Ccircle cx="16" cy="12" r="7" fill="%23FF4444"/%3E%3Ccircle cx="16" cy="24" r="9" fill="%23FF4444" opacity="0.7"/%3E%3C/svg%3E'}" 
                             alt="${user.username}" 
                             class="user-avatar">
                        <div class="user-details">
                            <span class="username">${user.username}</span>
                            <span class="user-meta">🚫 محظور</span>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="action-btn unban-btn" onclick="app.unbanUser('${user.id}')">
                            فك الحظر
                        </button>
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
                    <button class="remove-word" onclick="app.deleteBannedWord('${item.id}')">✕</button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    async banUser(userId) {
        if (!confirm('هل أنت متأكد من حظر هذا المستخدم؟')) return;
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: true,
                bannedAt: serverTimestamp(),
                online: false
            });
            this.showToast('✅ تم حظر المستخدم', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('خطأ في الحظر:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async unbanUser(userId) {
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: false,
                bannedAt: null
            });
            this.showToast('✅ تم فك الحظر', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('خطأ في فك الحظر:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('⚠️ هل أنت متأكد من حذف هذا المستخدم وجميع رسائله؟')) return;
        
        try {
            // حذف رسائل المستخدم
            const q = query(collection(db, 'messages'), where('senderId', '==', userId));
            const snapshot = await getDocs(q);
            snapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            
            // حذف المستخدم
            await deleteDoc(doc(db, 'users', userId));
            this.showToast('✅ تم حذف المستخدم', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('خطأ في حذف المستخدم:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async deleteMessage(messageId) {
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        
        try {
            await deleteDoc(doc(db, 'messages', messageId));
            this.showToast('✅ تم حذف الرسالة', 'success');
        } catch (error) {
            console.error('خطأ في حذف الرسالة:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
        this.closeMessageOptions();
    }

    async banUserByMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        if (!confirm(`هل تريد حظر المستخدم ${message.senderName}؟`)) return;
        await this.banUser(message.senderId);
        this.closeMessageOptions();
    }

    async deleteAllUserMessages(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        if (!confirm(`هل تريد حذف جميع رسائل ${message.senderName}؟`)) return;
        
        try {
            const q = query(collection(db, 'messages'), where('senderId', '==', message.senderId));
            const snapshot = await getDocs(q);
            snapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            this.showToast('✅ تم حذف جميع الرسائل', 'success');
        } catch (error) {
            console.error('خطأ في حذف الرسائل:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
        this.closeMessageOptions();
    }

    async addBannedWord() {
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
            console.error('خطأ في إضافة الكلمة:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async deleteBannedWord(wordId) {
        try {
            await deleteDoc(doc(db, 'bannedWords', wordId));
            this.showToast('✅ تم حذف الكلمة', 'success');
            this.loadAdminData();
        } catch (error) {
            console.error('خطأ في حذف الكلمة:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async clearAllMessages() {
        if (!confirm('⚠️ هل أنت متأكد من حذف جميع الرسائل؟ هذا الإجراء لا يمكن التراجع عنه!')) return;
        
        try {
            const snapshot = await getDocs(collection(db, 'messages'));
            snapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            this.showToast('✅ تم حذف جميع الرسائل', 'success');
        } catch (error) {
            console.error('خطأ في حذف الرسائل:', error);
            this.showToast('❌ حدث خطأ', 'error');
        }
    }

    async logoutAllUsers() {
        if (!confirm('هل أنت متأكد من تسجيل خروج جميع المستخدمين؟')) return;
        
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            snapshot.forEach(async (doc) => {
                await updateDoc(doc.ref, {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            });
            this.showToast('✅ تم تسجيل خروج الجميع', 'success');
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
            this.showToast('❌ حدث خطأ', 'error');
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
        
        // إظهار زر المسؤول
        document.getElementById('admin-panel-btn').style.display = this.isAdmin ? 'flex' : 'none';
        
        // تطبيق لون المستخدم
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
        
        // التمرير لأول نتيجة
        const first = document.querySelector('[data-message-id="' + results[0].id + '"]');
        if (first) {
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            first.style.background = 'var(--primary)';
            setTimeout(() => first.style.background = '', 2000);
        }
    }

    // ============================================
    // المستمعين
    // ============================================
    setupEventListeners() {
        // تسجيل الدخول
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // إظهار/إخفاء كلمة المرور
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
        
        // تسجيل الخروج
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // تبديل الثيم
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // لوحة المسؤول
        document.getElementById('admin-panel-btn').addEventListener('click', () => {
            this.openAdminPanel();
        });
        document.getElementById('close-admin').addEventListener('click', () => {
            this.closeAdminPanel();
        });
        
        // الإيموجي
        document.getElementById('emoji-btn').addEventListener('click', () => {
            this.toggleEmojiPanel();
        });
        document.getElementById('close-emoji').addEventListener('click', () => {
            document.getElementById('emoji-panel').style.display = 'none';
        });
        document.querySelectorAll('.emoji-item').forEach(el => {
            el.addEventListener('click', () => {
                this.insertEmoji(el.textContent);
            });
        });
        
        // الإرسال
        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // إدخال الرسالة
        document.getElementById('message-input').addEventListener('keydown', (e) => {
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
        document.getElementById('message-input').addEventListener('input', () => {
            this.autoResizeInput();
        });
        
        // إلغاء الرد
        document.getElementById('cancel-reply').addEventListener('click', () => {
            this.cancelReply();
        });
        
        // التمرير
        document.getElementById('chat-main').addEventListener('scroll', () => {
            this.checkScrollPosition();
        });
        document.getElementById('scroll-bottom-btn').addEventListener('click', () => {
            this.scrollToBottom();
        });
        
        // خيارات الرسالة
        document.querySelector('.options-overlay').addEventListener('click', () => {
            this.closeMessageOptions();
        });
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleMessageAction(btn.dataset.action);
            });
        });
        
        // الصورة الشخصية
        document.getElementById('avatar-upload-btn').addEventListener('click', () => {
            document.getElementById('avatar-input').click();
        });
        document.getElementById('avatar-input').addEventListener('change', (e) => {
            this.uploadAvatar(e.target.files[0]);
        });
        
        // حفظ الملف الشخصي
        document.getElementById('save-profile').addEventListener('click', () => {
            this.saveProfile();
        });
        
        // اختيار اللون
        document.querySelectorAll('.color-item').forEach(el => {
            el.addEventListener('click', () => {
                this.selectColor(el.dataset.color);
            });
        });
        
        // البحث
        document.getElementById('search-btn').addEventListener('click', () => {
            const query = prompt('🔍 ابحث في الرسائل:');
            if (query !== null) {
                this.searchMessages(query);
            }
        });
        
        // تبويبات المسؤول
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
            });
        });
        
        // إدارة الكلمات المحظورة
        document.getElementById('add-word-btn').addEventListener('click', () => {
            this.addBannedWord();
        });
        document.getElementById('new-word').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addBannedWord();
        });
        
        // إعدادات المسؤول
        document.getElementById('clear-all-messages').addEventListener('click', () => {
            this.clearAllMessages();
        });
        document.getElementById('logout-all-users').addEventListener('click', () => {
            this.logoutAllUsers();
        });
        document.getElementById('reset-app').addEventListener('click', () => {
            if (confirm('⚠️ هل أنت متأكد من إعادة تعيين التطبيق؟')) {
                localStorage.clear();
                location.reload();
            }
        });
        
        // عارض الصور
        document.getElementById('close-viewer').addEventListener('click', () => {
            document.getElementById('image-viewer').style.display = 'none';
        });
        document.querySelector('.viewer-overlay').addEventListener('click', () => {
            document.getElementById('image-viewer').style.display = 'none';
        });
    }
}

// ============================================
// بدء التطبيق
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NeZekApp();
});

export default NeZekApp;

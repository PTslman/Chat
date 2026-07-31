import { db, collection, getDocs, updateDoc, deleteDoc, doc, addDoc, serverTimestamp, query, where } from './firebase-config.js';

export class AdminManager {
    constructor(app) {
        this.app = app;
        this.bannedWords = [];
        this.users = [];
    }

    async loadData() {
        await this.loadUsers();
        await this.loadBannedWords();
        await this.loadBannedUsers();
    }

    async loadUsers() {
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);
            this.users = [];
            querySnapshot.forEach(doc => {
                this.users.push({ id: doc.id, ...doc.data() });
            });
            this.renderUsers(this.users);
        } catch (error) {
            console.error('خطأ في جلب المستخدمين:', error);
            this.app.utils.showToast('خطأ في جلب المستخدمين', 'error');
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
                        <img src="${user.avatar || 'assets/images/default-avatar.png'}" 
                             alt="${user.username}" 
                             class="user-avatar">
                        <div>
                            <strong>${user.username}</strong>
                            <span style="color:${user.color || '#25D366'}">●</span>
                            <span style="font-size:0.8rem;color:var(--text-secondary)">
                                ${user.online ? '🟢 متصل' : '⚪ غير متصل'}
                                ${user.isAdmin ? ' 👑' : ''}
                                ${isBanned ? ' 🚫' : ''}
                            </span>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${!isBanned ? `
                            <button class="action-btn ban-btn" onclick="app.adminManager.banUser('${user.id}', 3600)">
                                حظر
                            </button>
                        ` : `
                            <button class="action-btn unban-btn" onclick="app.adminManager.unbanUser('${user.id}')">
                                فك الحظر
                            </button>
                        `}
                        <button class="action-btn delete-btn" onclick="app.adminManager.deleteUser('${user.id}')">
                            حذف
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    async loadBannedUsers() {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('banned', '==', true));
            const querySnapshot = await getDocs(q);
            const bannedUsers = [];
            querySnapshot.forEach(doc => {
                bannedUsers.push({ id: doc.id, ...doc.data() });
            });
            
            const container = document.getElementById('banned-list');
            if (!container) return;
            
            if (bannedUsers.length === 0) {
                container.innerHTML = '<p style="color:var(--text-secondary);">لا يوجد مستخدمين محظورين</p>';
                return;
            }
            
            let html = '';
            bannedUsers.forEach(user => {
                html += `
                    <div class="user-item">
                        <div class="user-info">
                            <img src="${user.avatar || 'assets/images/default-avatar.png'}" 
                                 alt="${user.username}" 
                                 class="user-avatar">
                            <div>
                                <strong>${user.username}</strong>
                                <span style="font-size:0.8rem;color:var(--text-secondary)">
                                    محظور منذ ${this.formatTime(user.bannedAt)}
                                </span>
                            </div>
                        </div>
                        <div class="user-actions">
                            <button class="action-btn unban-btn" onclick="app.adminManager.unbanUser('${user.id}')">
                                فك الحظر
                            </button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch (error) {
            console.error('خطأ في جلب المحظورين:', error);
        }
    }

    async loadBannedWords() {
        try {
            const wordsRef = collection(db, 'bannedWords');
            const querySnapshot = await getDocs(wordsRef);
            this.bannedWords = [];
            querySnapshot.forEach(doc => {
                this.bannedWords.push({ id: doc.id, word: doc.data().word });
            });
            this.renderBannedWords();
        } catch (error) {
            console.error('خطأ في جلب الكلمات المحظورة:', error);
        }
    }

    renderBannedWords() {
        const container = document.getElementById('words-list');
        if (!container) return;
        
        if (this.bannedWords.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);">لا توجد كلمات محظورة</p>';
            return;
        }
        
        let html = '';
        this.bannedWords.forEach(item => {
            html += `
                <div class="word-item" style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--bg-primary);border-radius:4px;margin-bottom:4px;">
                    <span>${item.word}</span>
                    <button onclick="app.adminManager.deleteBannedWord('${item.id}')" 
                            style="background:transparent;border:none;color:#FF4444;cursor:pointer;">
                        ✕
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    async addBannedWord() {
        const input = document.getElementById('new-word');
        const word = input.value.trim();
        if (!word) {
            this.app.utils.showToast('يرجى إدخال كلمة', 'error');
            return;
        }
        
        try {
            await addDoc(collection(db, 'bannedWords'), {
                word: word,
                addedAt: serverTimestamp()
            });
            input.value = '';
            await this.loadBannedWords();
            this.app.utils.showToast('تم إضافة الكلمة', 'success');
        } catch (error) {
            console.error('خطأ في إضافة الكلمة:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async deleteBannedWord(wordId) {
        try {
            await deleteDoc(doc(db, 'bannedWords', wordId));
            await this.loadBannedWords();
            this.app.utils.showToast('تم حذف الكلمة', 'success');
        } catch (error) {
            console.error('خطأ في حذف الكلمة:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async banUser(userId, duration = 3600) {
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: true,
                banDuration: duration,
                bannedAt: serverTimestamp(),
                online: false
            });
            
            await this.loadUsers();
            await this.loadBannedUsers();
            this.app.utils.showToast('تم حظر المستخدم', 'success');
        } catch (error) {
            console.error('خطأ في حظر المستخدم:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async unbanUser(userId) {
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: false,
                banDuration: null,
                bannedAt: null
            });
            
            await this.loadUsers();
            await this.loadBannedUsers();
            this.app.utils.showToast('تم فك الحظر', 'success');
        } catch (error) {
            console.error('خطأ في فك الحظر:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        
        try {
            // حذف رسائل المستخدم
            const messagesRef = collection(db, 'messages');
            const q = query(messagesRef, where('senderId', '==', userId));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            
            // حذف المستخدم
            await deleteDoc(doc(db, 'users', userId));
            
            await this.loadUsers();
            await this.loadBannedUsers();
            this.app.utils.showToast('تم حذف المستخدم', 'success');
        } catch (error) {
            console.error('خطأ في حذف المستخدم:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async deleteMessage(messageId) {
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        
        try {
            await deleteDoc(doc(db, 'messages', messageId));
            this.app.utils.showToast('تم حذف الرسالة', 'success');
        } catch (error) {
            console.error('خطأ في حذف الرسالة:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async clearAllMessages() {
        if (!confirm('هل أنت متأكد من حذف جميع الرسائل؟ هذا الإجراء لا يمكن التراجع عنه!')) return;
        
        try {
            const messagesRef = collection(db, 'messages');
            const querySnapshot = await getDocs(messagesRef);
            querySnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            this.app.utils.showToast('تم حذف جميع الرسائل', 'success');
        } catch (error) {
            console.error('خطأ في حذف الرسائل:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async logoutAllUsers() {
        if (!confirm('هل أنت متأكد من تسجيل خروج جميع المستخدمين؟')) return;
        
        try {
            // تحديث حالة جميع المستخدمين
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);
            querySnapshot.forEach(async (doc) => {
                await updateDoc(doc.ref, {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            });
            this.app.utils.showToast('تم تسجيل خروج الجميع', 'success');
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async banUserByMessage(messageId) {
        const message = this.app.chatManager.messages.find(m => m.id === messageId);
        if (!message) return;
        
        if (!confirm(`هل تريد حظر المستخدم ${message.senderName}؟`)) return;
        
        await this.banUser(message.senderId);
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ar') + ' ' + date.toLocaleTimeString('ar');
    }
}

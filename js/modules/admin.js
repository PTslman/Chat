import { 
    db,
    collection, doc, getDocs,
    addDoc, updateDoc, deleteDoc,
    query, where, serverTimestamp
} from '../firebase-config.js';

export class AdminManager {
    constructor(app) {
        this.app = app;
        this.users = [];
        this.bannedWords = [];
        this.reports = [];
    }

    // ===== تحميل جميع البيانات =====
    async loadAllData() {
        await this.loadUsers();
        await this.loadBannedWords();
        await this.loadReports();
        this.updateStats();
    }

    // ===== تحميل المستخدمين =====
    async loadUsers() {
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            this.users = [];
            snapshot.forEach(doc => {
                this.users.push({ id: doc.id, ...doc.data() });
            });
            this.renderUsers(this.users);
            return this.users;
        } catch (error) {
            console.error('خطأ في تحميل المستخدمين:', error);
            return [];
        }
    }

    // ===== عرض المستخدمين =====
    renderUsers(users, filter = '') {
        const container = document.getElementById('users-list');
        if (!container) return;
        
        let filtered = users;
        if (filter) {
            filtered = users.filter(u => 
                u.username.toLowerCase().includes(filter.toLowerCase())
            );
        }
        
        if (filtered.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">👤 لا يوجد مستخدمين</p>';
            return;
        }
        
        let html = '';
        filtered.forEach(user => {
            const isBanned = user.banned || false;
            const isOnline = user.online || false;
            
            html += `
                <div class="user-item">
                    <div class="user-info">
                        <img src="${user.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" fill="%231A2D3A"/%3E%3Ccircle cx="16" cy="12" r="7" fill="%2325D366"/%3E%3Ccircle cx="16" cy="24" r="9" fill="%2325D366" opacity="0.7"/%3E%3C/svg%3E'}" 
                             alt="${user.username}" 
                             class="user-avatar">
                        <div class="user-details">
                            <span class="username">
                                ${user.username}
                                ${user.isAdmin ? ' 👑' : ''}
                                ${isBanned ? ' 🚫' : ''}
                            </span>
                            <span class="user-meta">
                                ${isOnline ? '🟢 متصل' : '⚪ غير متصل'}
                                ${user.isAdmin ? '• مسؤول' : ''}
                                ${user.isRealUser ? '• حساب حقيقي' : ''}
                            </span>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${!isBanned ? `
                            <button class="action-btn ban-btn" onclick="app.adminManager.banUser('${user.id}')" title="حظر">🚫</button>
                        ` : `
                            <button class="action-btn unban-btn" onclick="app.adminManager.unbanUser('${user.id}')" title="فك الحظر">✅</button>
                        `}
                        <button class="action-btn delete-btn" onclick="app.adminManager.deleteUser('${user.id}')" title="حذف">🗑️</button>
                        <button class="action-btn" onclick="app.adminManager.viewUserMessages('${user.id}')" title="عرض الرسائل" style="background:var(--secondary);color:white;padding:4px 8px;border-radius:4px;border:none;cursor:pointer;">💬</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ===== تحميل الكلمات المحظورة =====
    async loadBannedWords() {
        try {
            const snapshot = await getDocs(collection(db, 'bannedWords'));
            this.bannedWords = [];
            snapshot.forEach(doc => {
                this.bannedWords.push({ id: doc.id, ...doc.data() });
            });
            this.renderBannedWords(this.bannedWords);
            return this.bannedWords;
        } catch (error) {
            console.error('خطأ في تحميل الكلمات المحظورة:', error);
            return [];
        }
    }

    // ===== عرض الكلمات المحظورة =====
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
                    <button class="remove-word" onclick="app.adminManager.deleteBannedWord('${item.id}')">✕</button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ===== تحميل البلاغات =====
    async loadReports() {
        try {
            const snapshot = await getDocs(collection(db, 'reports'));
            this.reports = [];
            snapshot.forEach(doc => {
                this.reports.push({ id: doc.id, ...doc.data() });
            });
            return this.reports;
        } catch (error) {
            console.error('خطأ في تحميل البلاغات:', error);
            return [];
        }
    }

    // ===== تحديث الإحصائيات =====
    updateStats() {
        const online = this.users.filter(u => u.online).length;
        const banned = this.users.filter(u => u.banned).length;
        
        document.getElementById('stat-users').textContent = this.users.length;
        document.getElementById('stat-online').textContent = online;
        document.getElementById('stat-banned').textContent = banned;
        document.getElementById('stat-messages').textContent = this.app.messages?.length || 0;
    }

    // ===== حظر مستخدم =====
    async banUser(userId) {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        if (user.isAdmin) {
            this.app.showToast('❌ لا يمكن حظر المسؤول', 'error');
            return;
        }
        
        if (!confirm(`هل تريد حظر المستخدم ${user.username}؟`)) return;
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: true,
                bannedAt: serverTimestamp(),
                online: false
            });
            this.app.showToast(`✅ تم حظر ${user.username}`, 'success');
            await this.loadUsers();
            this.updateStats();
        } catch (error) {
            console.error('خطأ في الحظر:', error);
            this.app.showToast('❌ حدث خطأ في الحظر', 'error');
        }
    }

    // ===== فك الحظر =====
    async unbanUser(userId) {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: false,
                bannedAt: null
            });
            this.app.showToast(`✅ تم فك الحظر عن ${user.username}`, 'success');
            await this.loadUsers();
            this.updateStats();
        } catch (error) {
            console.error('خطأ في فك الحظر:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ===== حذف مستخدم =====
    async deleteUser(userId) {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        if (user.isAdmin) {
            this.app.showToast('❌ لا يمكن حذف المسؤول', 'error');
            return;
        }
        
        if (!confirm(`⚠️ هل أنت متأكد من حذف المستخدم ${user.username} وجميع رسائله؟`)) return;
        
        try {
            const q = query(collection(db, 'messages'), where('senderId', '==', userId));
            const snapshot = await getDocs(q);
            for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
            }
            
            await deleteDoc(doc(db, 'users', userId));
            
            this.app.showToast(`✅ تم حذف ${user.username}`, 'success');
            await this.loadUsers();
            this.updateStats();
        } catch (error) {
            console.error('خطأ في حذف المستخدم:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ===== عرض رسائل المستخدم =====
    viewUserMessages(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        const messages = this.app.messages?.filter(m => m.senderId === userId) || [];
        if (messages.length === 0) {
            this.app.showToast(`💬 لا توجد رسائل لـ ${user.username}`, 'info');
            return;
        }
        
        let text = `📝 رسائل ${user.username}:\n\n`;
        messages.forEach(m => {
            text += `• ${m.text}\n`;
        });
        text += `\n📊 المجموع: ${messages.length} رسالة`;
        
        alert(text);
    }

    // ===== إضافة كلمة محظورة =====
    async addBannedWord(word) {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        if (!word || word.trim().length < 2) {
            this.app.showToast('⚠️ الكلمة قصيرة جداً', 'error');
            return;
        }
        
        if (this.bannedWords.some(w => w.word.toLowerCase() === word.toLowerCase())) {
            this.app.showToast('⚠️ هذه الكلمة موجودة بالفعل', 'error');
            return;
        }
        
        try {
            await addDoc(collection(db, 'bannedWords'), {
                word: word.trim(),
                addedAt: serverTimestamp(),
                addedBy: this.app.currentUser.username
            });
            this.app.showToast(`✅ تم إضافة "${word}"`, 'success');
            document.getElementById('new-word').value = '';
            await this.loadBannedWords();
        } catch (error) {
            console.error('خطأ في إضافة الكلمة:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ===== حذف كلمة محظورة =====
    async deleteBannedWord(wordId) {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        try {
            await deleteDoc(doc(db, 'bannedWords', wordId));
            this.app.showToast('✅ تم حذف الكلمة', 'success');
            await this.loadBannedWords();
        } catch (error) {
            console.error('خطأ في حذف الكلمة:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ===== تسجيل خروج جميع المستخدمين =====
    async logoutAllUsers() {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        if (!confirm('⚠️ هل أنت متأكد من تسجيل خروج جميع المستخدمين؟')) return;
        
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            for (const doc of snapshot.docs) {
                await updateDoc(doc.ref, {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            }
            this.app.showToast('✅ تم تسجيل خروج الجميع', 'success');
            await this.loadUsers();
            this.updateStats();
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ===== حذف جميع الرسائل =====
    async clearAllMessages() {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        if (!confirm('⚠️ هل أنت متأكد من حذف جميع الرسائل؟ هذا الإجراء لا يمكن التراجع عنه!')) return;
        
        try {
            const snapshot = await getDocs(collection(db, 'messages'));
            for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
            }
            this.app.showToast('✅ تم حذف جميع الرسائل', 'success');
            this.updateStats();
        } catch (error) {
            console.error('خطأ في حذف الرسائل:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ===== تصدير البيانات =====
    async exportData() {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        try {
            const data = {
                users: this.users,
                messages: this.app.messages,
                bannedWords: this.bannedWords,
                reports: this.reports,
                exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nezek-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.app.showToast('✅ تم تصدير البيانات', 'success');
        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
    }

    // ===== بحث في المستخدمين =====
    searchUsers(query) {
        if (!query || query.trim() === '') {
            this.renderUsers(this.users);
            return;
        }
        
        const filtered = this.users.filter(u => 
            u.username.toLowerCase().includes(query.toLowerCase())
        );
        this.renderUsers(filtered);
    }
        }

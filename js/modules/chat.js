import { 
    db,
    collection, doc, getDocs,
    addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy,
    where, serverTimestamp
} from '../firebase-config.js';

export class ChatManager {
    constructor(app) {
        this.app = app;
        this.messages = [];
        this.listener = null;
    }

    // ===== بدء الاستماع =====
    startListening() {
        const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
        
        this.listener = onSnapshot(q, (snapshot) => {
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
            this.app.messages = messages;
            this.renderMessages(messages);
            this.updateUnreadCount(messages);
            
            if (this.app.isAtBottom) {
                this.app.scrollToBottom();
            }
            
        }, (error) => {
            console.error('خطأ في الاستماع:', error);
            this.app.showToast('❌ خطأ في تحديث الرسائل', 'error');
        });
    }

    // ===== إيقاف الاستماع =====
    stopListening() {
        if (this.listener) {
            this.listener();
            this.listener = null;
        }
    }

    // ===== عرض الرسائل =====
    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (!this.app.currentUser) return;
        
        let html = '';
        let lastSender = null;
        let lastTime = null;
        
        messages.forEach((msg) => {
            const isOwn = msg.senderId === this.app.currentUser.id;
            const isSystem = msg.senderId === 'system';
            const isSameSender = lastSender === msg.senderId;
            const timeDiff = lastTime ? (new Date(msg.timestamp) - new Date(lastTime)) / 1000 : 999;
            const showHeader = !isSameSender || timeDiff > 300;
            
            if (isSystem) {
                html += `<div class="message message-system">${msg.text}</div>`;
                return;
            }
            
            const sender = this.app.users.find(u => u.id === msg.senderId);
            const senderColor = msg.color || '#25D366';
            const senderName = msg.senderName || sender?.username || 'مستخدم';
            const reactionsHtml = this.renderReactions(msg.reactions || {});
            
            html += `
                <div class="message ${isOwn ? 'message-sent' : 'message-received'}" 
                     data-message-id="${msg.id}"
                     data-sender-id="${msg.senderId}"
                     ${!isOwn ? `onclick="app.showMessageOptions('${msg.id}')"` : ''}
                     ${!isOwn ? 'oncontextmenu="event.preventDefault();app.showMessageOptions(this.dataset.messageId);"' : ''}>
                    
                    ${showHeader && !isOwn ? `
                        <div class="message-header">
                            <span class="message-sender" style="color:${senderColor}">${senderName}</span>
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
        this.updateReadStatus(messages);
    }

    // ===== عرض التفاعلات =====
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

    // ===== تنسيق الوقت =====
    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        return date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    }

    // ===== الهروب من HTML =====
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== تحديث حالة القراءة =====
    async updateReadStatus(messages) {
        const unread = messages.filter(m => 
            m.senderId !== this.app.currentUser.id && !m.read
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

    // ===== تحديث عدد الرسائل غير المقروءة =====
    updateUnreadCount(messages) {
        const unread = messages.filter(m => 
            m.senderId !== this.app.currentUser.id && !m.read
        ).length;
        
        this.app.unreadCount = unread;
        const badge = document.getElementById('new-messages-badge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
    }

    // ===== إرسال رسالة =====
    async sendMessage(text) {
        if (!text || !this.app.currentUser) return false;
        
        if (this.app.currentUser.banned) {
            this.app.showToast('⛔ أنت محظور من الكتابة', 'error');
            return false;
        }
        
        const hasBanned = await this.checkBannedWords(text);
        if (hasBanned) {
            this.app.showToast('⛔ تحتوي على كلمة محظورة', 'error');
            return false;
        }
        
        try {
            const messageData = {
                senderId: this.app.currentUser.id,
                senderName: this.app.currentUser.username,
                text: text,
                timestamp: serverTimestamp(),
                read: false,
                edited: false,
                color: this.app.currentUser.color || '#25D366',
                reactions: {}
            };
            
            if (this.app.replyTo) {
                messageData.replyTo = {
                    id: this.app.replyTo.id,
                    text: this.app.replyTo.text,
                    senderName: this.app.replyTo.senderName
                };
                this.app.cancelReply();
            }
            
            if (this.app.editMessageId) {
                await updateDoc(doc(db, 'messages', this.app.editMessageId), {
                    text: text,
                    edited: true,
                    editedAt: serverTimestamp()
                });
                this.app.editMessageId = null;
                document.getElementById('send-btn').innerHTML = '<span class="material-symbols-outlined">send</span>';
                document.getElementById('message-input').placeholder = 'اكتب رسالة...';
            } else {
                await addDoc(collection(db, 'messages'), messageData);
            }
            
            document.getElementById('message-input').value = '';
            document.getElementById('message-input').style.height = 'auto';
            this.app.scrollToBottom();
            return true;
            
        } catch (error) {
            console.error('خطأ في الإرسال:', error);
            this.app.showToast('❌ حدث خطأ في الإرسال', 'error');
            return false;
        }
    }

    // ===== التحقق من الكلمات المحظورة =====
    async checkBannedWords(text) {
        try {
            const snapshot = await getDocs(collection(db, 'bannedWords'));
            const bannedWords = [];
            snapshot.forEach(doc => {
                bannedWords.push(doc.data().word.toLowerCase());
            });
            
            const lowerText = text.toLowerCase();
            return bannedWords.some(word => lowerText.includes(word));
        } catch (error) {
            return false;
        }
    }

    // ===== الرد على رسالة =====
    replyToMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        this.app.replyTo = {
            id: message.id,
            text: message.text,
            senderName: message.senderName
        };
        
        document.getElementById('reply-username').textContent = message.senderName;
        document.getElementById('reply-text').textContent = message.text;
        document.getElementById('reply-bar').style.display = 'block';
        document.getElementById('message-input').focus();
        this.app.uiManager.closeMessageOptions();
    }

    // ===== إضافة تفاعل =====
    async toggleReaction(emoji, element) {
        const messageEl = element.closest('.message');
        if (!messageEl) return;
        
        const messageId = messageEl.dataset.messageId;
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        const userId = this.app.currentUser.id;
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
            console.error('خطأ في التفاعل:', error);
        }
    }

    // ===== نسخ رسالة =====
    async copyMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        try {
            await navigator.clipboard.writeText(message.text);
            this.app.showToast('✅ تم نسخ النص', 'success');
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = message.text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.app.showToast('✅ تم نسخ النص', 'success');
        }
        this.app.uiManager.closeMessageOptions();
    }

    // ===== تعديل رسالة =====
    editMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message || message.senderId !== this.app.currentUser.id) {
            this.app.showToast('❌ لا يمكنك تعديل هذه الرسالة', 'error');
            return;
        }
        
        this.app.editMessageId = messageId;
        const input = document.getElementById('message-input');
        input.value = message.text;
        input.focus();
        input.placeholder = '✏️ تعديل الرسالة...';
        document.getElementById('send-btn').innerHTML = '<span class="material-symbols-outlined">save</span>';
        this.app.uiManager.closeMessageOptions();
    }

    // ===== الإبلاغ عن رسالة =====
    async reportMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        try {
            await addDoc(collection(db, 'reports'), {
                messageId: messageId,
                messageText: message.text,
                senderId: message.senderId,
                senderName: message.senderName,
                reporterId: this.app.currentUser.id,
                reporterName: this.app.currentUser.username,
                timestamp: serverTimestamp(),
                resolved: false
            });
            this.app.showToast('✅ تم الإبلاغ، سيتم مراجعة الرسالة', 'success');
        } catch (error) {
            console.error('خطأ في الإبلاغ:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
        this.app.uiManager.closeMessageOptions();
    }

    // ===== البحث في الرسائل =====
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
            this.app.showToast('🔍 لا توجد نتائج', 'info');
            return;
        }
        
        this.renderMessages(results);
        this.app.showToast(`🔍 تم العثور على ${results.length} نتيجة`, 'success');
        
        const first = document.querySelector('[data-message-id="' + results[0].id + '"]');
        if (first) {
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            first.style.background = 'var(--primary)';
            setTimeout(() => first.style.background = '', 3000);
        }
    }

    // ===== حذف رسالة (للمسؤول) =====
    async deleteMessage(messageId) {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        
        try {
            await deleteDoc(doc(db, 'messages', messageId));
            this.app.showToast('✅ تم حذف الرسالة', 'success');
        } catch (error) {
            console.error('خطأ في حذف الرسالة:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
        this.app.uiManager.closeMessageOptions();
    }

    // ===== حذف جميع رسائل مستخدم =====
    async deleteUserMessages(senderId) {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        const user = this.app.users.find(u => u.id === senderId);
        if (!confirm(`هل تريد حذف جميع رسائل ${user?.username || 'المستخدم'}؟`)) return;
        
        try {
            const q = query(collection(db, 'messages'), where('senderId', '==', senderId));
            const snapshot = await getDocs(q);
            for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
            }
            this.app.showToast('✅ تم حذف جميع الرسائل', 'success');
        } catch (error) {
            console.error('خطأ في حذف الرسائل:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
        this.app.uiManager.closeMessageOptions();
    }

    // ===== حظر مستخدم =====
    async banUserFromChat(userId) {
        if (!this.app.isAdmin) {
            this.app.showToast('❌ غير مصرح', 'error');
            return;
        }
        
        const user = this.app.users.find(u => u.id === userId);
        if (!confirm(`هل تريد حظر ${user?.username || 'المستخدم'} من الدردشة؟`)) return;
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                banned: true,
                bannedAt: serverTimestamp()
            });
            this.app.showToast('✅ تم حظر المستخدم', 'success');
        } catch (error) {
            console.error('خطأ في الحظر:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
        this.app.uiManager.closeMessageOptions();
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
        } catch (error) {
            console.error('خطأ في حذف الرسائل:', error);
            this.app.showToast('❌ حدث خطأ', 'error');
        }
    }
              }

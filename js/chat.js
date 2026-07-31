import { db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, where, getDoc } from './firebase-config.js';

export class ChatManager {
    constructor(app) {
        this.app = app;
        this.messages = [];
        this.unreadCount = 0;
        this.listener = null;
    }

    startListening() {
        const messagesQuery = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
        
        this.listener = onSnapshot(messagesQuery, (snapshot) => {
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
            this.app.scrollToBottom();
        }, (error) => {
            console.error('خطأ في الاستماع للرسائل:', error);
            this.app.utils.showToast('خطأ في تحديث الرسائل', 'error');
        });
    }

    stopListening() {
        if (this.listener) {
            this.listener();
            this.listener = null;
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        const currentUser = this.app.currentUser;
        
        if (!currentUser) return;
        
        let html = '';
        let lastSender = null;
        let lastTime = null;
        
        messages.forEach((message, index) => {
            const isOwn = message.senderId === currentUser.id;
            const isSystem = message.senderId === 'system';
            const isSameSender = lastSender === message.senderId;
            const timeDiff = lastTime ? (new Date(message.timestamp) - new Date(lastTime)) / 1000 : 999;
            const showHeader = !isSameSender || timeDiff > 300; // 5 دقائق
            
            if (isSystem) {
                html += `
                    <div class="message message-system">
                        ${message.text}
                    </div>
                `;
            } else {
                const senderColor = message.color || '#25D366';
                const reactionsHtml = this.renderReactions(message.reactions || {});
                
                html += `
                    <div class="message ${isOwn ? 'message-sent' : 'message-received'}" 
                         data-message-id="${message.id}"
                         data-sender-id="${message.senderId}"
                         ${!isOwn ? 'style="cursor:pointer;"' : ''}
                         ${!isOwn ? `onclick="app.chatManager.showMessageOptions('${message.id}', event)"` : ''}
                         ${!isOwn ? 'oncontextmenu="event.preventDefault();app.chatManager.showMessageOptions(this.dataset.messageId, event);"' : ''}>
                        
                        ${showHeader && !isOwn ? `
                            <div class="message-header">
                                <span class="message-sender" style="color:${senderColor}">
                                    ${message.senderName}
                                </span>
                                <span class="message-time">
                                    ${this.formatTime(message.timestamp)}
                                </span>
                            </div>
                        ` : ''}
                        
                        ${!showHeader && !isOwn ? `
                            <div class="message-header" style="display:none;">
                                <span class="message-time" style="font-size:0.6rem;">
                                    ${this.formatTime(message.timestamp)}
                                </span>
                            </div>
                        ` : ''}
                        
                        ${message.replyTo ? `
                            <div class="message-reply">
                                <span class="reply-label">↩️ رد على:</span>
                                <span class="reply-text">${message.replyTo.text}</span>
                            </div>
                        ` : ''}
                        
                        <div class="message-text">${this.escapeHtml(message.text)}</div>
                        
                        ${reactionsHtml}
                        
                        <div class="message-footer">
                            ${message.edited ? '<span class="message-edited">(معدّل)</span>' : ''}
                            <span class="message-time">${this.formatTime(message.timestamp)}</span>
                            ${isOwn ? '<span class="message-status">✓✓</span>' : ''}
                        </div>
                    </div>
                `;
            }
            
            lastSender = message.senderId;
            lastTime = message.timestamp;
        });
        
        container.innerHTML = html;
        
        // إضافة مستمع للضغط المطول على الرسائل المستقبلة
        if (!this.app.isAdmin) {
            document.querySelectorAll('.message-received').forEach(msg => {
                msg.addEventListener('touchstart', this.handleTouchStart.bind(this));
                msg.addEventListener('touchend', this.handleTouchEnd.bind(this));
            });
        }
    }

    renderReactions(reactions) {
        if (!reactions || Object.keys(reactions).length === 0) return '';
        
        let html = '<div class="message-reactions">';
        for (const [emoji, users] of Object.entries(reactions)) {
            const count = users.length;
            html += `
                <span class="reaction" onclick="app.chatManager.toggleReaction('${emoji}', event)">
                    ${emoji}
                    <span class="reaction-count">${count}</span>
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

    updateUnreadCount(messages) {
        // حساب الرسائل غير المقروءة
        const unread = messages.filter(m => 
            m.senderId !== this.app.currentUser.id && !m.read
        ).length;
        this.unreadCount = unread;
        
        // تحديث العداد
        const badge = document.querySelector('.unread-badge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
    }

    async sendMessage(text, replyTo = null) {
        // يتم التعامل معها في app.js
        return this.app.sendMessage();
    }

    async replyToMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        this.app.replyTo = {
            id: message.id,
            text: message.text,
            senderName: message.senderName
        };
        
        const replyBar = document.getElementById('reply-bar');
        document.getElementById('reply-username').textContent = message.senderName;
        document.getElementById('reply-text').textContent = message.text;
        replyBar.style.display = 'block';
        
        document.getElementById('message-input').focus();
    }

    async showReactions(messageId) {
        // عرض تفاعلات الرسالة
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        const reactions = message.reactions || {};
        const emojis = Object.keys(reactions);
        
        if (emojis.length === 0) {
            this.app.utils.showToast('لا توجد تفاعلات', 'info');
            return;
        }
        
        let text = 'التفاعلات:\n';
        for (const [emoji, users] of Object.entries(reactions)) {
            text += `${emoji}: ${users.join(', ')}\n`;
        }
        this.app.utils.showToast(text, 'info');
    }

    async toggleReaction(emoji, event) {
        event.stopPropagation();
        const messageEl = event.target.closest('.message');
        if (!messageEl) return;
        
        const messageId = messageEl.dataset.messageId;
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        const userId = this.app.currentUser.id;
        const reactions = message.reactions || {};
        
        if (!reactions[emoji]) {
            reactions[emoji] = [];
        }
        
        const index = reactions[emoji].indexOf(userId);
        if (index > -1) {
            reactions[emoji].splice(index, 1);
            if (reactions[emoji].length === 0) {
                delete reactions[emoji];
            }
        } else {
            reactions[emoji].push(userId);
        }
        
        try {
            await updateDoc(doc(db, 'messages', messageId), {
                reactions: reactions
            });
        } catch (error) {
            console.error('خطأ في تحديث التفاعل:', error);
        }
    }

    async copyMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        try {
            await navigator.clipboard.writeText(message.text);
            this.app.utils.showToast('تم نسخ النص', 'success');
        } catch (error) {
            // طريقة بديلة
            const textarea = document.createElement('textarea');
            textarea.value = message.text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.app.utils.showToast('تم نسخ النص', 'success');
        }
    }

    async editMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message || message.senderId !== this.app.currentUser.id) {
            this.app.utils.showToast('لا يمكنك تعديل هذه الرسالة', 'error');
            return;
        }
        
        this.app.editMessage = messageId;
        const input = document.getElementById('message-input');
        input.value = message.text;
        input.focus();
        input.placeholder = 'تعديل الرسالة...';
        
        // تغيير زر الإرسال
        const sendBtn = document.getElementById('send-btn');
        sendBtn.innerHTML = '<span class="material-symbols-outlined">save</span>';
        sendBtn.onclick = async () => {
            const newText = input.value.trim();
            if (!newText) return;
            
            try {
                await updateDoc(doc(db, 'messages', messageId), {
                    text: newText,
                    edited: true,
                    editedAt: serverTimestamp()
                });
                
                input.value = '';
                input.placeholder = 'اكتب رسالة...';
                sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                sendBtn.onclick = () => this.app.sendMessage();
                this.app.editMessage = null;
                
                this.app.utils.showToast('تم تعديل الرسالة', 'success');
            } catch (error) {
                console.error('خطأ في تعديل الرسالة:', error);
                this.app.utils.showToast('حدث خطأ في التعديل', 'error');
            }
        };
    }

    async reportMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        try {
            // حفظ البلاغ
            await addDoc(collection(db, 'reports'), {
                messageId: messageId,
                messageText: message.text,
                senderId: message.senderId,
                reporterId: this.app.currentUser.id,
                timestamp: serverTimestamp(),
                resolved: false
            });
            
            this.app.utils.showToast('تم إبلاغ المسؤول', 'success');
        } catch (error) {
            console.error('خطأ في الإبلاغ:', error);
            this.app.utils.showToast('حدث خطأ في الإبلاغ', 'error');
        }
    }

    async checkBannedWords(text) {
        try {
            const wordsRef = collection(db, 'bannedWords');
            const querySnapshot = await getDocs(wordsRef);
            const bannedWords = [];
            querySnapshot.forEach(doc => {
                bannedWords.push(doc.data().word);
            });
            
            const lowerText = text.toLowerCase();
            for (const word of bannedWords) {
                if (lowerText.includes(word.toLowerCase())) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('خطأ في فحص الكلمات المحظورة:', error);
            return false;
        }
    }

    handleTouchStart(event) {
        this.touchStart = event.touches[0].clientY;
        this.touchStartTime = Date.now();
    }

    handleTouchEnd(event) {
        const touchEnd = event.changedTouches[0].clientY;
        const diff = Math.abs(this.touchStart - touchEnd);
        const timeDiff = Date.now() - this.touchStartTime;
        
        // إذا كانت الضغطة طويلة (أكثر من 500ms) وحركة قليلة
        if (timeDiff > 500 && diff < 10) {
            const messageEl = event.target.closest('.message');
            if (messageEl) {
                this.showMessageOptions(messageEl.dataset.messageId, event);
            }
        }
    }

    showMessageOptions(messageId, event) {
        this.app.showMessageOptions(messageId, event);
    }

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
            this.app.utils.showToast('لا توجد نتائج', 'info');
            return;
        }
        
        this.renderMessages(results);
        this.app.utils.showToast(`تم العثور على ${results.length} نتيجة`, 'success');
        
        // التمرير لأول نتيجة
        const firstResult = document.querySelector('[data-message-id="' + results[0].id + '"]');
        if (firstResult) {
            firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstResult.style.backgroundColor = 'var(--primary-color)';
            setTimeout(() => {
                firstResult.style.backgroundColor = '';
            }, 3000);
        }
    }
              }

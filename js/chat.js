// ============================================
// إدارة الدردشة - نيزك
// ============================================

import { db } from './firebase-config.js';
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
    deleteDoc,
    serverTimestamp,
    limit,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { authManager } from './auth.js';

// ============================================
// مدير الدردشة
// ============================================

class ChatManager {
    constructor() {
        this.currentUser = null;
        this.currentChatId = null;
        this.unsubscribeMessages = null;
        this.unsubscribePresence = null;
        this.messageListeners = [];
        this.replyTo = null;
        this.editingMessage = null;
    }

    // تعيين المستخدم الحالي
    setCurrentUser(user) {
        this.currentUser = user;
    }

    // الحصول على معرف المحادثة
    getChatId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    // بدء الدردشة
    startChat(otherUid) {
        if (!this.currentUser) return;
        const chatId = this.getChatId(this.currentUser.uid, otherUid);
        this.currentChatId = chatId;
        this.replyTo = null;
        this.editingMessage = null;
        return chatId;
    }

    // تحميل الرسائل
    loadMessages(chatId, callback, limitCount = 100) {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
        }

        const messagesRef = collection(db, 'messages', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(limitCount));

        this.unsubscribeMessages = onSnapshot(q, async (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.isDeleted) {
                    messages.push({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toDate() || new Date()
                    });
                }
            });
            
            // تعليم الرسائل كمقروءة
            await this.markMessagesAsRead(chatId);
            
            callback(messages);
        }, (error) => {
            console.error('خطأ في تحميل الرسائل:', error);
            callback([]);
        });
    }

    // إرسال رسالة
    async sendMessage(chatId, text, type = 'text') {
        if (!this.currentUser || !text.trim()) return null;

        const otherUid = this.getOtherUser(chatId);
        const userData = await authManager.getUserData(otherUid);
        
        // التحقق من حظر المستخدم
        if (userData && authManager.isUserBlocked(userData)) {
            return { success: false, error: 'هذا المستخدم محظور', blocked: true };
        }

        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const messageData = {
                text: text.trim(),
                sender: this.currentUser.uid,
                receiver: otherUid,
                timestamp: serverTimestamp(),
                status: 'sent',
                type: type,
                isDeleted: false,
                isEdited: false,
                replyTo: this.replyTo || null
            };

            const docRef = await addDoc(messagesRef, messageData);

            // تحديث آخر رسالة
            await this.updateChatLastMessage(chatId, text.trim(), this.currentUser.uid);

            // إعادة تعيين الرد
            this.replyTo = null;

            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            return { success: false, error: error.message };
        }
    }

    // تحديث آخر رسالة في المحادثة
    async updateChatLastMessage(chatId, text, senderId) {
        try {
            const chatRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatRef);
            
            if (chatDoc.exists()) {
                await updateDoc(chatRef, {
                    lastMessage: text,
                    lastMessageTime: serverTimestamp(),
                    lastMessageSender: senderId,
                    updatedAt: serverTimestamp()
                });
            } else {
                // إنشاء المحادثة إذا لم تكن موجودة
                await setDoc(chatRef, {
                    lastMessage: text,
                    lastMessageTime: serverTimestamp(),
                    lastMessageSender: senderId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    participants: [this.currentUser.uid, this.getOtherUser(chatId)]
                });
            }
        } catch (error) {
            console.error('خطأ في تحديث المحادثة:', error);
        }
    }

    // تعليم الرسائل كمقروءة
    async markMessagesAsRead(chatId) {
        if (!this.currentUser) return;

        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const q = query(
                messagesRef,
                where('receiver', '==', this.currentUser.uid),
                where('status', '==', 'sent')
            );
            
            const snapshot = await getDocs(q);
            const updates = snapshot.docs.map(doc => 
                updateDoc(doc.ref, { status: 'read' })
            );
            
            await Promise.all(updates);
        } catch (error) {
            console.error('خطأ في تعليم الرسائل كمقروءة:', error);
        }
    }

    // تعديل رسالة
    async editMessage(chatId, messageId, newText) {
        try {
            const messageRef = doc(db, 'messages', chatId, 'messages', messageId);
            await updateDoc(messageRef, {
                text: newText.trim(),
                isEdited: true,
                editedAt: serverTimestamp()
            });
            this.editingMessage = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // حذف رسالة (للمسؤول فقط)
    async deleteMessage(chatId, messageId) {
        try {
            const messageRef = doc(db, 'messages', chatId, 'messages', messageId);
            await updateDoc(messageRef, {
                isDeleted: true,
                text: 'تم حذف هذه الرسالة',
                deletedAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // حذف الدردشة بالكامل
    async clearChat(chatId) {
        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const snapshot = await getDocs(messagesRef);
            
            const deletions = snapshot.docs.map(doc => 
                updateDoc(doc.ref, {
                    isDeleted: true,
                    text: 'تم حذف هذه الدردشة',
                    deletedAt: serverTimestamp()
                })
            );
            
            await Promise.all(deletions);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // إضافة تفاعل على رسالة
    async addReaction(chatId, messageId, reaction) {
        try {
            const messageRef = doc(db, 'messages', chatId, 'messages', messageId);
            const messageDoc = await getDoc(messageRef);
            
            if (messageDoc.exists()) {
                const data = messageDoc.data();
                const reactions = data.reactions || {};
                const userId = this.currentUser.uid;
                
                // إذا كان المستخدم قد تفاعل بنفس التفاعل، نزيله
                if (reactions[userId] === reaction) {
                    delete reactions[userId];
                } else {
                    reactions[userId] = reaction;
                }
                
                await updateDoc(messageRef, { reactions });
                return { success: true };
            }
            return { success: false, error: 'الرسالة غير موجودة' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // الإبلاغ عن رسالة
    async reportMessage(chatId, messageId, reason = 'مخالفة') {
        try {
            const reportRef = collection(db, 'reports');
            await addDoc(reportRef, {
                chatId,
                messageId,
                reporter: this.currentUser.uid,
                reason: reason,
                timestamp: serverTimestamp(),
                status: 'pending'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // الحصول على المستخدم الآخر في المحادثة
    getOtherUser(chatId) {
        if (!this.currentUser) return null;
        const uids = chatId.split('_');
        return uids.find(uid => uid !== this.currentUser.uid);
    }

    // مراقبة حالة المستخدم
    monitorUserPresence(uid, callback) {
        if (this.unsubscribePresence) {
            this.unsubscribePresence();
        }

        const userRef = doc(db, 'users', uid);
        this.unsubscribePresence = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                callback({
                    status: data.status || 'offline',
                    lastSeen: data.lastSeen?.toDate() || new Date(),
                    isBlocked: data.isBlocked || false
                });
            }
        });
    }

    // تعيين الرد على رسالة
    setReplyTo(message) {
        this.replyTo = message;
    }

    // إلغاء الرد
    clearReplyTo() {
        this.replyTo = null;
    }

    // تعيين رسالة للتعديل
    setEditingMessage(message) {
        this.editingMessage = message;
    }

    // إلغاء التعديل
    clearEditingMessage() {
        this.editingMessage = null;
    }

    // إيقاف الاستماع
    stopListening() {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
            this.unsubscribeMessages = null;
        }
        if (this.unsubscribePresence) {
            this.unsubscribePresence();
            this.unsubscribePresence = null;
        }
    }

    // تنظيف الموارد
    cleanup() {
        this.stopListening();
        this.currentChatId = null;
        this.replyTo = null;
        this.editingMessage = null;
    }
}

export const chatManager = new ChatManager();

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
    serverTimestamp,
    limit,
    startAfter,
    getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// مدير الدردشة
// ============================================

class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.currentUser = null;
        this.unsubscribeMessages = null;
        this.unsubscribePresence = null;
        this.messageListeners = [];
        this.presenceListeners = [];
    }

    // تعيين المستخدم الحالي
    setCurrentUser(user) {
        this.currentUser = user;
    }

    // الحصول على معرف المحادثة
    getChatId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    // بدء الدردشة مع مستخدم
    startChat(otherUid) {
        if (!this.currentUser) return;
        
        const chatId = this.getChatId(this.currentUser.uid, otherUid);
        this.currentChatId = chatId;
        return chatId;
    }

    // تحميل الرسائل
    loadMessages(chatId, callback, limitCount = 50) {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
        }

        const messagesRef = collection(db, 'messages', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(limitCount));

        this.unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                messages.push({
                    id: doc.id,
                    text: data.text,
                    sender: data.sender,
                    receiver: data.receiver,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    status: data.status || 'sent',
                    type: data.type || 'text'
                });
            });
            
            // تحديث حالة الرسائل المقروءة
            this.markMessagesAsRead(chatId);
            
            callback(messages);
        }, (error) => {
            console.error('خطأ في تحميل الرسائل:', error);
            callback([]);
        });
    }

    // إرسال رسالة
    async sendMessage(chatId, text, type = 'text') {
        if (!this.currentUser || !text.trim()) return null;

        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const docRef = await addDoc(messagesRef, {
                text: text.trim(),
                sender: this.currentUser.uid,
                receiver: this.getOtherUser(chatId),
                timestamp: serverTimestamp(),
                status: 'sent',
                type: type
            });

            // تحديث آخر رسالة في محادثات المستخدم
            await this.updateLastMessage(chatId, text.trim());

            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            return { success: false, error: error.message };
        }
    }

    // تحديث آخر رسالة
    async updateLastMessage(chatId, text) {
        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: text,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: this.currentUser.uid
            });
        } catch (error) {
            console.error('خطأ في تحديث آخر رسالة:', error);
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

    // الحصول على المستخدم الآخر في المحادثة
    getOtherUser(chatId) {
        const uids = chatId.split('_');
        return uids.find(uid => uid !== this.currentUser.uid);
    }

    // حذف رسالة
    async deleteMessage(chatId, messageId) {
        try {
            const messageRef = doc(db, 'messages', chatId, 'messages', messageId);
            await updateDoc(messageRef, {
                isDeleted: true,
                text: 'تم حذف هذه الرسالة'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // البحث في الرسائل
    async searchMessages(chatId, searchText) {
        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            // ملاحظة: Firebase لا يدعم البحث النصي الكامل
            // يجب استخدام Algolia أو Elasticsearch للبحث المتقدم
            const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            
            const results = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.text?.toLowerCase().includes(searchText.toLowerCase())) {
                    results.push({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toDate() || new Date()
                    });
                }
            });
            
            return results;
        } catch (error) {
            console.error('خطأ في البحث:', error);
            return [];
        }
    }

    // عدد الرسائل غير المقروءة
    async getUnreadCount(chatId) {
        if (!this.currentUser) return 0;

        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const q = query(
                messagesRef,
                where('receiver', '==', this.currentUser.uid),
                where('status', '==', 'sent')
            );
            
            const count = await getCountFromServer(q);
            return count.data().count;
        } catch (error) {
            console.error('خطأ في حساب الرسائل غير المقروءة:', error);
            return 0;
        }
    }

    // مراقبة حالة الاتصال بالمستخدم
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
                    lastSeen: data.lastSeen?.toDate() || new Date()
                });
            }
        });
    }

    // إيقاف الاستماع للرسائل
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
    }

    // إضافة مستمع للرسائل
    addMessageListener(callback) {
        this.messageListeners.push(callback);
    }

    // إضافة مستمع للحالة
    addPresenceListener(callback) {
        this.presenceListeners.push(callback);
    }
}

// تصدير نسخة واحدة
export const chatManager = new ChatManager();

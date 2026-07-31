// ============================================
// معالج الرسائل - نيزك
// ============================================

import { db } from '../js/firebase-config.js';
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
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// فئة معالج الرسائل
// ============================================

export class MessageHandler {
    constructor() {
        this.messageCache = new Map();
        this.activeListeners = new Map();
    }

    // إرسال رسالة جديدة
    async sendMessage(chatId, senderId, receiverId, text, type = 'text') {
        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const docRef = await addDoc(messagesRef, {
                text: text.trim(),
                sender: senderId,
                receiver: receiverId,
                timestamp: serverTimestamp(),
                status: 'sent',
                type: type,
                isDeleted: false
            });

            // تحديث المحادثة
            await this.updateChat(chatId, text, senderId);

            return {
                success: true,
                id: docRef.id,
                data: {
                    text: text.trim(),
                    sender: senderId,
                    receiver: receiverId,
                    timestamp: new Date(),
                    status: 'sent',
                    type: type
                }
            };
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            return { success: false, error: error.message };
        }
    }

    // تحديث المحادثة
    async updateChat(chatId, lastMessage, senderId) {
        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: lastMessage,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: senderId,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            // إذا لم تكن المحادثة موجودة، نقوم بإنشائها
            if (error.code === 'not-found') {
                const chatRef = doc(db, 'chats', chatId);
                await setDoc(chatRef, {
                    lastMessage: lastMessage,
                    lastMessageTime: serverTimestamp(),
                    lastMessageSender: senderId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            } else {
                console.error('خطأ في تحديث المحادثة:', error);
            }
        }
    }

    // الاستماع للرسائل
    listenToMessages(chatId, callback) {
        // إلغاء الاستماع السابق
        if (this.activeListeners.has(chatId)) {
            this.activeListeners.get(chatId)();
            this.activeListeners.delete(chatId);
        }

        const messagesRef = collection(db, 'messages', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

        const unsubscribe = onSnapshot(q, (snapshot) => {
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
            callback(messages);
        }, (error) => {
            console.error('خطأ في الاستماع للرسائل:', error);
            callback([]);
        });

        this.activeListeners.set(chatId, unsubscribe);
        return unsubscribe;
    }

    // تعليم الرسائل كمقروءة
    async markAsRead(chatId, userId) {
        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const q = query(
                messagesRef,
                where('receiver', '==', userId),
                where('status', '==', 'sent')
            );
            
            const snapshot = await getDocs(q);
            const updates = snapshot.docs.map(doc => 
                updateDoc(doc.ref, { status: 'read' })
            );
            
            await Promise.all(updates);
            return { success: true, count: updates.length };
        } catch (error) {
            console.error('خطأ في تعليم الرسائل كمقروءة:', error);
            return { success: false, error: error.message };
        }
    }

    // حذف رسالة
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

    // الحصول على عدد الرسائل غير المقروءة
    async getUnreadCount(chatId, userId) {
        try {
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const q = query(
                messagesRef,
                where('receiver', '==', userId),
                where('status', '==', 'sent')
            );
            
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('خطأ في حساب الرسائل غير المقروءة:', error);
            return 0;
        }
    }

    // مسح الكاش
    clearCache() {
        this.messageCache.clear();
    }

    // تنظيف الموارد
    cleanup() {
        this.activeListeners.forEach((unsubscribe) => unsubscribe());
        this.activeListeners.clear();
        this.clearCache();
    }
}

// تصدير نسخة واحدة
export const messageHandler = new MessageHandler();

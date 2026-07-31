// ============================================
// إدارة جهات الاتصال - نيزك
// ============================================

import { db } from './firebase-config.js';
import {
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    doc,
    getDoc,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { authManager } from './auth.js';

// ============================================
// مدير جهات الاتصال
// ============================================

class ContactsManager {
    constructor() {
        this.currentUser = null;
        this.contacts = [];
        this.unsubscribeContacts = null;
        this.contactsListeners = [];
    }

    // تعيين المستخدم الحالي
    setCurrentUser(user) {
        this.currentUser = user;
    }

    // تحميل جهات الاتصال
    loadContacts(callback) {
        if (!this.currentUser) return;

        if (this.unsubscribeContacts) {
            this.unsubscribeContacts();
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '!=', this.currentUser.uid));

        this.unsubscribeContacts = onSnapshot(q, async (snapshot) => {
            const contacts = [];
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                // تجاهل المسؤول إذا كان المستخدم عادي
                if (!authManager.isAdminUser() && data.isAdmin) continue;
                
                const lastMessage = await this.getLastMessage(data.uid);
                const unreadCount = await this.getUnreadCount(data.uid);
                
                contacts.push({
                    uid: data.uid,
                    name: data.name || data.email?.split('@')[0] || 'مستخدم',
                    email: data.email || '',
                    photoURL: data.photoURL || 'assets/images/default-avatar.png',
                    status: data.status || 'offline',
                    lastSeen: data.lastSeen?.toDate() || new Date(),
                    isActive: data.isActive || false,
                    isAdmin: data.isAdmin || false,
                    isBlocked: data.isBlocked || false,
                    blockedUntil: data.blockedUntil || null,
                    lastMessage: lastMessage?.text || '',
                    lastMessageTime: lastMessage?.timestamp || null,
                    unreadCount: unreadCount
                });
            }

            // ترتيب حسب آخر رسالة
            contacts.sort((a, b) => {
                if (a.lastMessageTime && b.lastMessageTime) {
                    return b.lastMessageTime - a.lastMessageTime;
                }
                if (a.lastMessageTime) return -1;
                if (b.lastMessageTime) return 1;
                return a.name.localeCompare(b.name);
            });

            this.contacts = contacts;
            callback(contacts);
        }, (error) => {
            console.error('خطأ في تحميل جهات الاتصال:', error);
            callback([]);
        });
    }

    // جلب آخر رسالة
    async getLastMessage(otherUid) {
        if (!this.currentUser) return null;

        try {
            const chatId = this.getChatId(this.currentUser.uid, otherUid);
            const chatRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatRef);
            
            if (chatDoc.exists()) {
                const data = chatDoc.data();
                return {
                    text: data.lastMessage || '',
                    timestamp: data.lastMessageTime?.toDate() || null,
                    sender: data.lastMessageSender || ''
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // جلب عدد الرسائل غير المقروءة
    async getUnreadCount(otherUid) {
        if (!this.currentUser) return 0;

        try {
            const chatId = this.getChatId(this.currentUser.uid, otherUid);
            const messagesRef = collection(db, 'messages', chatId, 'messages');
            const q = query(
                messagesRef,
                where('receiver', '==', this.currentUser.uid),
                where('status', '==', 'sent')
            );
            
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            return 0;
        }
    }

    // الحصول على معرف المحادثة
    getChatId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    // البحث في جهات الاتصال
    searchContacts(searchTerm) {
        if (!searchTerm || !searchTerm.trim()) return this.contacts;
        
        const term = searchTerm.toLowerCase().trim();
        return this.contacts.filter(contact => 
            contact.name.toLowerCase().includes(term) ||
            contact.email.toLowerCase().includes(term)
        );
    }

    // الحصول على جهة اتصال
    getContactByUid(uid) {
        return this.contacts.find(contact => contact.uid === uid);
    }

    // تحديث حالة جهة الاتصال
    updateContactStatus(uid, status) {
        const contact = this.getContactByUid(uid);
        if (contact) {
            contact.status = status;
        }
    }

    // تحديث آخر رسالة لجهة اتصال
    updateContactLastMessage(uid, message, timestamp) {
        const contact = this.getContactByUid(uid);
        if (contact) {
            contact.lastMessage = message;
            contact.lastMessageTime = timestamp;
        }
    }

    // تنظيف الموارد
    cleanup() {
        if (this.unsubscribeContacts) {
            this.unsubscribeContacts();
            this.unsubscribeContacts = null;
        }
    }

    // إضافة مستمع
    addContactsListener(callback) {
        this.contactsListeners.push(callback);
    }
}

export const contactsManager = new ContactsManager();

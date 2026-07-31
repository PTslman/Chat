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
    updateDoc,
    serverTimestamp,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// مدير جهات الاتصال
// ============================================

class ContactsManager {
    constructor() {
        this.currentUser = null;
        this.contacts = [];
        this.unsubscribeContacts = null;
        this.contactsListeners = [];
        this.userStatusListeners = [];
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

        // جلب جميع المستخدمين ماعدا المستخدم الحالي
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '!=', this.currentUser.uid));

        this.unsubscribeContacts = onSnapshot(q, async (snapshot) => {
            const contacts = [];
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                // جلب آخر رسالة لكل جهة اتصال
                const lastMessage = await this.getLastMessage(data.uid);
                const unreadCount = await this.getUnreadCount(data.uid);
                
                contacts.push({
                    uid: data.uid,
                    name: data.name || data.email.split('@')[0],
                    email: data.email,
                    photoURL: data.photoURL || 'assets/images/default-avatar.png',
                    status: data.status || 'offline',
                    lastSeen: data.lastSeen?.toDate() || new Date(),
                    isActive: data.isActive || false,
                    lastMessage: lastMessage,
                    unreadCount: unreadCount,
                    lastMessageTime: lastMessage ? lastMessage.timestamp : null
                });
            }

            // ترتيب حسب آخر رسالة
            contacts.sort((a, b) => {
                if (a.lastMessageTime && b.lastMessageTime) {
                    return b.lastMessageTime - a.lastMessageTime;
                }
                return a.name.localeCompare(b.name);
            });

            this.contacts = contacts;
            callback(contacts);
        }, (error) => {
            console.error('خطأ في تحميل جهات الاتصال:', error);
            callback([]);
        });
    }

    // جلب آخر رسالة مع مستخدم
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
                    timestamp: data.lastMessageTime?.toDate() || new Date(),
                    sender: data.lastMessageSender || ''
                };
            }
            return null;
        } catch (error) {
            console.error('خطأ في جلب آخر رسالة:', error);
            return null;
        }
    }

    // جلب عدد الرسائل غير المقروءة من مستخدم
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
            console.error('خطأ في جلب عدد الرسائل غير المقروءة:', error);
            return 0;
        }
    }

    // الحصول على معرف المحادثة
    getChatId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    // البحث في جهات الاتصال
    searchContacts(searchTerm) {
        if (!searchTerm.trim()) return this.contacts;
        
        const term = searchTerm.toLowerCase().trim();
        return this.contacts.filter(contact => 
            contact.name.toLowerCase().includes(term) ||
            contact.email.toLowerCase().includes(term)
        );
    }

    // الحصول على جهة اتصال بواسطة المعرف
    getContactByUid(uid) {
        return this.contacts.find(contact => contact.uid === uid);
    }

    // تحديث حالة جهة الاتصال
    updateContactStatus(uid, status) {
        const contact = this.getContactByUid(uid);
        if (contact) {
            contact.status = status;
            this.notifyStatusChange(uid, status);
        }
    }

    // إضافة جهة اتصال جديدة
    async addContact(email) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                return { success: false, error: 'المستخدم غير موجود' };
            }

            const userData = snapshot.docs[0].data();
            const uid = snapshot.docs[0].id;

            // التأكد من أنه ليس المستخدم نفسه
            if (uid === this.currentUser.uid) {
                return { success: false, error: 'لا يمكن إضافة نفسك' };
            }

            // التأكد من أنه ليس موجوداً بالفعل
            if (this.getContactByUid(uid)) {
                return { success: false, error: 'جهة الاتصال موجودة بالفعل' };
            }

            // إضافة للمحليات
            this.contacts.push({
                uid: uid,
                name: userData.name || userData.email.split('@')[0],
                email: userData.email,
                photoURL: userData.photoURL || 'assets/images/default-avatar.png',
                status: 'offline',
                lastSeen: new Date(),
                isActive: userData.isActive || false,
                lastMessage: null,
                unreadCount: 0
            });

            return { success: true, contact: this.contacts[this.contacts.length - 1] };
        } catch (error) {
            console.error('خطأ في إضافة جهة اتصال:', error);
            return { success: false, error: error.message };
        }
    }

    // مراقبة حالة المستخدمين
    monitorUserStatus(uid, callback) {
        if (!this.currentUser) return;

        const userRef = doc(db, 'users', uid);
        return onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                callback({
                    status: data.status || 'offline',
                    lastSeen: data.lastSeen?.toDate() || new Date()
                });
            }
        });
    }

    // إعلام بتغيير الحالة
    notifyStatusChange(uid, status) {
        this.userStatusListeners.forEach(listener => {
            listener(uid, status);
        });
    }

    // تنظيف الموارد
    cleanup() {
        if (this.unsubscribeContacts) {
            this.unsubscribeContacts();
            this.unsubscribeContacts = null;
        }
    }

    // إضافة مستمع للتغييرات
    addContactsListener(callback) {
        this.contactsListeners.push(callback);
    }

    addStatusListener(callback) {
        this.userStatusListeners.push(callback);
    }
}

// تصدير نسخة واحدة
export const contactsManager = new ContactsManager();

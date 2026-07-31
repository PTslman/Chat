// ============================================
// لوحة تحكم المسؤول - نيزك
// ============================================

import { db } from './firebase-config.js';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { authManager } from './auth.js';

// ============================================
// مدير المسؤول
// ============================================

class AdminManager {
    constructor() {
        this.users = [];
        this.reports = [];
        this.unsubscribeUsers = null;
        this.unsubscribeReports = null;
        this.bannedWords = ['سب', 'شتم', 'بذيء', 'سيء', 'قبيح'];
    }

    // ============================================
    // إدارة المستخدمين
    // ============================================

    // تحميل جميع المستخدمين
    loadUsers(callback) {
        if (this.unsubscribeUsers) {
            this.unsubscribeUsers();
        }

        const usersRef = collection(db, 'users');
        this.unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
            const users = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                users.push({
                    uid: doc.id,
                    ...data,
                    lastSeen: data.lastSeen?.toDate() || new Date(),
                    createdAt: data.createdAt?.toDate() || new Date()
                });
            });
            
            // ترتيب حسب تاريخ الإنشاء
            users.sort((a, b) => b.createdAt - a.createdAt);
            
            this.users = users;
            callback(users);
        }, (error) => {
            console.error('خطأ في تحميل المستخدمين:', error);
            callback([]);
        });
    }

    // حظر مستخدم
    async blockUser(uid, duration = 3600000, reason = '') {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                isBlocked: true,
                blockedUntil: new Date(Date.now() + duration).toISOString(),
                blockReason: reason,
                blockedAt: serverTimestamp()
            });
            
            // تسجيل المخالفة
            await this.addViolation(uid, reason || 'حظر من المسؤول');
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // فك حظر مستخدم
    async unblockUser(uid) {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                isBlocked: false,
                blockedUntil: null,
                blockReason: null
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // حذف حساب مستخدم
    async deleteUser(uid) {
        try {
            // حذف المستند
            const userRef = doc(db, 'users', uid);
            await deleteDoc(userRef);
            
            // حذف المحادثات والرسائل
            // البحث عن جميع المحادثات التي تحتوي على هذا المستخدم
            const chatsRef = collection(db, 'chats');
            const q = query(chatsRef, where('participants', 'array-contains', uid));
            const snapshot = await getDocs(q);
            
            for (const chatDoc of snapshot.docs) {
                const chatId = chatDoc.id;
                // حذف جميع الرسائل في هذه المحادثة
                const messagesRef = collection(db, 'messages', chatId, 'messages');
                const messagesSnap = await getDocs(messagesRef);
                for (const msgDoc of messagesSnap.docs) {
                    await deleteDoc(msgDoc.ref);
                }
                // حذف المحادثة
                await deleteDoc(chatDoc.ref);
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // تسجيل مخالفة
    async addViolation(uid, reason) {
        try {
            const userRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const data = userDoc.data();
                const violations = (data.violations || 0) + 1;
                await updateDoc(userRef, {
                    violations: violations,
                    lastViolation: serverTimestamp(),
                    lastViolationReason: reason
                });
                
                // عقوبات تدريجية
                if (violations >= 5) {
                    await this.blockUser(uid, 86400000 * 7, 'تجاوز عدد المخالفات (5)');
                } else if (violations >= 3) {
                    await this.blockUser(uid, 86400000, 'تجاوز عدد المخالفات (3)');
                } else if (violations >= 2) {
                    await this.blockUser(uid, 3600000 * 6, 'تجاوز عدد المخالفات (2)');
                }
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // إدارة الكلمات المحظورة
    // ============================================

    // فحص رسالة للكلمات المحظورة
    checkMessageForBannedWords(text) {
        const lowerText = text.toLowerCase();
        for (const word of this.bannedWords) {
            if (lowerText.includes(word)) {
                return {
                    hasBannedWord: true,
                    word: word
                };
            }
        }
        return { hasBannedWord: false };
    }

    // إضافة كلمة محظورة
    addBannedWord(word) {
        if (!this.bannedWords.includes(word.toLowerCase())) {
            this.bannedWords.push(word.toLowerCase());
            // حفظ في localStorage
            localStorage.setItem('bannedWords', JSON.stringify(this.bannedWords));
        }
    }

    // حذف كلمة محظورة
    removeBannedWord(word) {
        this.bannedWords = this.bannedWords.filter(w => w !== word.toLowerCase());
        localStorage.setItem('bannedWords', JSON.stringify(this.bannedWords));
    }

    // تحميل الكلمات المحظورة
    loadBannedWords() {
        const saved = localStorage.getItem('bannedWords');
        if (saved) {
            try {
                this.bannedWords = JSON.parse(saved);
            } catch (e) {
                this.bannedWords = ['سب', 'شتم', 'بذيء', 'سيء', 'قبيح'];
            }
        }
    }

    // ============================================
    // إدارة التقارير
    // ============================================

    // تحميل التقارير
    loadReports(callback) {
        if (this.unsubscribeReports) {
            this.unsubscribeReports();
        }

        const reportsRef = collection(db, 'reports');
        const q = query(reportsRef, where('status', '==', 'pending'));
        
        this.unsubscribeReports = onSnapshot(q, (snapshot) => {
            const reports = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                reports.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });
            });
            
            this.reports = reports;
            callback(reports);
        }, (error) => {
            console.error('خطأ في تحميل التقارير:', error);
            callback([]);
        });
    }

    // حل تقرير
    async resolveReport(reportId, action = 'resolved') {
        try {
            const reportRef = doc(db, 'reports', reportId);
            await updateDoc(reportRef, {
                status: action,
                resolvedAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // إحصائيات
    // ============================================

    // الحصول على إحصائيات
    getStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.status === 'online').length;
        const blockedUsers = this.users.filter(u => u.isBlocked).length;
        const reportsCount = this.reports.length;
        
        return {
            totalUsers,
            activeUsers,
            blockedUsers,
            reportsCount
        };
    }

    // ============================================
    // تنظيف
    // ============================================

    cleanup() {
        if (this.unsubscribeUsers) {
            this.unsubscribeUsers();
            this.unsubscribeUsers = null;
        }
        if (this.unsubscribeReports) {
            this.unsubscribeReports();
            this.unsubscribeReports = null;
        }
    }

    // ============================================
    // تهيئة
    // ============================================

    constructor() {
        this.loadBannedWords();
    }
}

export const adminManager = new AdminManager();

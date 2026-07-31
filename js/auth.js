// ============================================
// إدارة المصادقة - نيزك
// ============================================

import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// بيانات المسؤول
// ============================================

const ADMIN = {
    uid: 'slx23m',
    email: 'admin@nezak.com',
    password: '1442',
    name: 'المسؤول',
    isAdmin: true
};

// ============================================
// مدير المصادقة
// ============================================

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.authStateListeners = [];
        this.setupAuthListener();
    }

    // مراقبة حالة المصادقة
    setupAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                this.isAdmin = user.uid === ADMIN.uid;
                
                // تحديث حالة المستخدم
                await this.updateUserStatus(user.uid, 'online');
                
                this.authStateListeners.forEach(listener => listener(user));
            } else {
                this.currentUser = null;
                this.isAdmin = false;
                this.authStateListeners.forEach(listener => listener(null));
            }
        });
    }

    // ============================================
    // دخول سريع للمستخدم العادي (بدون كلمة مرور)
    // ============================================
    
    async quickLogin(username) {
        if (!username || username.trim().length < 2) {
            return { success: false, error: 'اسم المستخدم قصير جداً' };
        }

        // منع استخدام اسم المسؤول
        if (username.trim() === 'slx23m') {
            return { success: false, error: 'هذا الاسم محجوز للمسؤول' };
        }

        try {
            // إنشاء مستخدم مجهول في Auth
            const email = `${username.trim().toLowerCase()}@nezak.temp`;
            const password = 'temp123456';
            
            // محاولة تسجيل الدخول
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                return { success: true, user: userCredential.user };
            } catch (error) {
                // إذا لم يكن المستخدم موجوداً، نقوم بإنشائه
                if (error.code === 'auth/user-not-found') {
                    return await this.createAnonymousUser(username.trim());
                }
                return { success: false, error: error.message };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // إنشاء مستخدم مجهول
    async createAnonymousUser(username) {
        try {
            const email = `${username.toLowerCase()}@nezak.temp`;
            const password = 'temp123456';
            
            // إنشاء حساب
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // تحديث اسم المستخدم
            await updateProfile(user, { displayName: username });
            
            // إنشاء مستند في Firestore
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                uid: user.uid,
                name: username,
                email: email,
                photoURL: '',
                isAdmin: false,
                isActive: true,
                isBlocked: false,
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                status: 'online',
                violations: 0,
                blockedUntil: null
            });
            
            return { success: true, user };
        } catch (error) {
            console.error('خطأ في إنشاء المستخدم:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // دخول المسؤول
    // ============================================
    
    async adminLogin(username, password) {
        if (username === 'slx23m' && password === '1442') {
            try {
                // محاولة تسجيل الدخول بحساب المسؤول
                const userCredential = await signInWithEmailAndPassword(auth, ADMIN.email, ADMIN.password);
                const user = userCredential.user;
                
                if (user.uid === ADMIN.uid) {
                    this.isAdmin = true;
                    await this.ensureAdminDocument(user);
                    return { success: true, user, isAdmin: true };
                }
                await signOut(auth);
                return { success: false, error: 'حساب غير مصرح به' };
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    return await this.createAdminAccount();
                }
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    // إنشاء حساب المسؤول
    async createAdminAccount() {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, ADMIN.email, ADMIN.password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: ADMIN.name });
            
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                uid: user.uid,
                name: ADMIN.name,
                email: ADMIN.email,
                photoURL: '',
                isAdmin: true,
                isActive: true,
                isBlocked: false,
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                status: 'online',
                violations: 0,
                blockedUntil: null
            });
            
            this.isAdmin = true;
            return { success: true, user, isAdmin: true };
        } catch (error) {
            console.error('خطأ في إنشاء حساب المسؤول:', error);
            return { success: false, error: error.message };
        }
    }

    // التأكد من وجود مستند المسؤول
    async ensureAdminDocument(user) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                name: ADMIN.name,
                email: ADMIN.email,
                photoURL: '',
                isAdmin: true,
                isActive: true,
                isBlocked: false,
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                status: 'online',
                violations: 0,
                blockedUntil: null
            });
        }
    }

    // ============================================
    // تسجيل الخروج
    // ============================================
    
    async signOut() {
        try {
            if (this.currentUser) {
                await this.updateUserStatus(this.currentUser.uid, 'offline');
            }
            await signOut(auth);
            this.isAdmin = false;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // تحديث حالة المستخدم
    // ============================================
    
    async updateUserStatus(uid, status) {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                status: status,
                lastSeen: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // جلب بيانات المستخدم
    // ============================================
    
    async getUserData(uid) {
        try {
            const userRef = doc(db, 'users', uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // ============================================
    // تحديث الملف الشخصي
    // ============================================
    
    async updateProfileData(uid, data) {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            
            if (data.name && this.currentUser) {
                await updateProfile(this.currentUser, { displayName: data.name });
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // حظر مستخدم
    // ============================================
    
    async blockUser(uid, duration = 3600000) {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                isBlocked: true,
                blockedUntil: new Date(Date.now() + duration).toISOString()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // فك حظر مستخدم
    // ============================================
    
    async unblockUser(uid) {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                isBlocked: false,
                blockedUntil: null
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // حذف حساب مستخدم
    // ============================================
    
    async deleteUserAccount(uid) {
        try {
            // حذف المستند من Firestore
            const userRef = doc(db, 'users', uid);
            await deleteDoc(userRef);
            
            // حذف المحادثات والرسائل
            // (يمكن إضافة منطق حذف الرسائل هنا)
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // دوال مساعدة
    // ============================================
    
    getCurrentUser() {
        return this.currentUser;
    }

    isAdminUser() {
        return this.isAdmin;
    }

    isUserBlocked(userData) {
        if (!userData) return false;
        if (userData.isBlocked) {
            const blockedUntil = userData.blockedUntil;
            if (blockedUntil && new Date(blockedUntil) > new Date()) {
                return true;
            }
            // انتهت مدة الحظر
            if (blockedUntil) {
                this.unblockUser(userData.uid);
            }
        }
        return false;
    }

    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
    }
}

export const authManager = new AuthManager();

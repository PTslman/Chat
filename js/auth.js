// ============================================
// إدارة المصادقة - نيزك
// ============================================

import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// دوال المصادقة
// ============================================

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
        this.setupAuthListener();
    }

    // مراقبة حالة المصادقة
    setupAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            
            if (user) {
                // تحديث حالة المستخدم في Firestore
                await this.updateUserPresence(user.uid, true);
                
                // جلب بيانات المستخدم
                const userData = await this.getUserData(user.uid);
                if (!userData) {
                    // إنشاء مستند المستخدم إذا لم يكن موجوداً
                    await this.createUserDocument(user);
                }
            } else {
                // المستخدم غير مسجل دخول
                if (this.currentUser) {
                    await this.updateUserPresence(this.currentUser.uid, false);
                }
            }
            
            // إعلام المستمعين
            this.authStateListeners.forEach(listener => listener(user));
        });
    }

    // تسجيل حساب جديد
    async signUp(email, password, displayName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // تحديث اسم المستخدم
            await updateProfile(user, { displayName: displayName });
            
            // إنشاء مستند المستخدم
            await this.createUserDocument(user, displayName);
            
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // تسجيل الدخول
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // تسجيل الخروج
    async signOut() {
        try {
            if (this.currentUser) {
                await this.updateUserPresence(this.currentUser.uid, false);
            }
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // إعادة تعيين كلمة المرور
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // إنشاء مستند المستخدم
    async createUserDocument(user, displayName = null) {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userData = {
                uid: user.uid,
                name: displayName || user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: user.photoURL || '',
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                status: 'online',
                isActive: true
            };
            
            await setDoc(userRef, userData);
            return { success: true };
        } catch (error) {
            console.error('خطأ في إنشاء مستند المستخدم:', error);
            return { success: false, error: error.message };
        }
    }

    // جلب بيانات المستخدم
    async getUserData(uid) {
        try {
            const userRef = doc(db, 'users', uid);
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error('خطأ في جلب بيانات المستخدم:', error);
            return null;
        }
    }

    // تحديث حالة المستخدم
    async updateUserPresence(uid, isOnline) {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                status: isOnline ? 'online' : 'offline',
                lastSeen: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('خطأ في تحديث حالة المستخدم:', error);
            return { success: false, error: error.message };
        }
    }

    // تحديث صورة الملف الشخصي
    async updateUserPhoto(uid, photoURL) {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, { photoURL: photoURL });
            
            // تحديث في Auth
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: photoURL });
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // إضافة مستمع لحالة المصادقة
    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
    }

    // جلب المستخدم الحالي
    getCurrentUser() {
        return this.currentUser;
    }

    // التحقق من حالة تسجيل الدخول
    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// تصدير نسخة واحدة من المدير
export const authManager = new AuthManager();

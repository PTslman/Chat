import { 
    db, auth, 
    collection, doc, getDoc, getDocs,
    addDoc, updateDoc, deleteDoc,
    setDoc, query, where, serverTimestamp,
    signInAnonymously, onAuthStateChanged, signOut
} from '../firebase-config.js';

export class AuthManager {
    constructor(app) {
        this.app = app;
        this.currentUser = null;
        this.isAdmin = false;
    }

    // ===== تسجيل الدخول الحقيقي =====
    async login(username, password = null) {
        try {
            // التحقق من وجود المستخدم
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                // مستخدم جديد - إنشاء حساب
                return await this.registerUser(username, password);
            }
            
            // مستخدم موجود
            let userDoc = null;
            querySnapshot.forEach(doc => {
                userDoc = { id: doc.id, ...doc.data() };
            });
            
            // التحقق من كلمة المرور للمسؤول
            if (userDoc.isAdmin) {
                if (!password || password !== '1442') {
                    throw new Error('كلمة مرور غير صحيحة للمسؤول');
                }
            }
            
            // التحقق من الحظر
            if (userDoc.banned) {
                throw new Error('⚠️ هذا الحساب محظور');
            }
            
            // تحديث حالة الاتصال
            await updateDoc(doc(db, 'users', userDoc.id), {
                online: true,
                lastSeen: serverTimestamp()
            });
            
            this.currentUser = userDoc;
            this.isAdmin = userDoc.isAdmin || false;
            
            // حفظ الجلسة
            this.saveSession(userDoc);
            
            return {
                success: true,
                user: userDoc,
                isNew: false
            };
            
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===== تسجيل مستخدم جديد =====
    async registerUser(username, password = null) {
        try {
            // التحقق من أن الاسم غير مكرر
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                throw new Error('⚠️ هذا الاسم مستخدم بالفعل');
            }
            
            // التحقق من أن الاسم ليس محظوراً
            if (username.toLowerCase() === 'slx23m') {
                throw new Error('⚠️ هذا الاسم محجوز للمسؤول');
            }
            
            // إنشاء مستخدم جديد
            const userData = {
                username: username,
                isAdmin: false,
                color: '#25D366',
                avatar: null,
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                online: true,
                banned: false,
                violations: 0,
                isRealUser: true, // علامة للمستخدم الحقيقي
                userId: this.generateUserId()
            };
            
            // تسجيل دخول مجهول للحصول على UID
            const result = await signInAnonymously(auth);
            const uid = result.user.uid;
            
            // حفظ في Firestore
            await setDoc(doc(db, 'users', uid), userData);
            
            const newUser = { id: uid, ...userData };
            this.currentUser = newUser;
            this.isAdmin = false;
            
            // حفظ الجلسة
            this.saveSession(newUser);
            
            return {
                success: true,
                user: newUser,
                isNew: true
            };
            
        } catch (error) {
            console.error('خطأ في التسجيل:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===== تسجيل الدخول كمسؤول =====
    async adminLogin(password) {
        const username = 'slx23m';
        
        if (password !== '1442') {
            return {
                success: false,
                error: 'كلمة مرور غير صحيحة'
            };
        }
        
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            let userDoc = null;
            if (!querySnapshot.empty) {
                querySnapshot.forEach(doc => {
                    userDoc = { id: doc.id, ...doc.data() };
                });
                
                // تحديث حالة المسؤول
                await updateDoc(doc(db, 'users', userDoc.id), {
                    online: true,
                    lastSeen: serverTimestamp(),
                    isAdmin: true
                });
            } else {
                // إنشاء حساب المسؤول
                const result = await signInAnonymously(auth);
                const uid = result.user.uid;
                
                const adminData = {
                    username: username,
                    isAdmin: true,
                    color: '#9C27B0',
                    avatar: null,
                    createdAt: serverTimestamp(),
                    lastSeen: serverTimestamp(),
                    online: true,
                    banned: false,
                    violations: 0,
                    isRealUser: true,
                    userId: this.generateUserId()
                };
                
                await setDoc(doc(db, 'users', uid), adminData);
                userDoc = { id: uid, ...adminData };
            }
            
            this.currentUser = userDoc;
            this.isAdmin = true;
            
            this.saveSession(userDoc);
            
            return {
                success: true,
                user: userDoc,
                isNew: false
            };
            
        } catch (error) {
            console.error('خطأ في تسجيل دخول المسؤول:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===== تسجيل الخروج =====
    async logout() {
        try {
            if (this.currentUser) {
                await updateDoc(doc(db, 'users', this.currentUser.id), {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            }
            
            await signOut(auth);
            localStorage.removeItem('nezek_session');
            this.currentUser = null;
            this.isAdmin = false;
            
            return { success: true };
            
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===== استعادة الجلسة =====
    async restoreSession() {
        const sessionData = localStorage.getItem('nezek_session');
        if (!sessionData) return null;
        
        try {
            const session = JSON.parse(sessionData);
            const userRef = doc(db, 'users', session.userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                
                // التحقق من الحظر
                if (data.banned) {
                    localStorage.removeItem('nezek_session');
                    return null;
                }
                
                // التحقق من صحة الجلسة (7 أيام)
                const sessionTime = session.timestamp || 0;
                const now = Date.now();
                if (now - sessionTime > 7 * 24 * 60 * 60 * 1000) {
                    localStorage.removeItem('nezek_session');
                    return null;
                }
                
                this.currentUser = { id: session.userId, ...data };
                this.isAdmin = data.isAdmin || false;
                
                // تحديث الحالة
                await updateDoc(userRef, {
                    online: true,
                    lastSeen: serverTimestamp()
                });
                
                return this.currentUser;
            }
            
            localStorage.removeItem('nezek_session');
            return null;
            
        } catch (error) {
            console.error('خطأ في استعادة الجلسة:', error);
            localStorage.removeItem('nezek_session');
            return null;
        }
    }

    // ===== حفظ الجلسة =====
    saveSession(user) {
        localStorage.setItem('nezek_session', JSON.stringify({
            userId: user.id,
            username: user.username,
            isAdmin: user.isAdmin || false,
            timestamp: Date.now()
        }));
    }

    // ===== التحقق من وجود المستخدم =====
    async checkUserExists(username) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('خطأ في التحقق:', error);
            return false;
        }
    }

    // ===== توليد معرف فريد =====
    generateUserId() {
        return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    // ===== تحديث الملف الشخصي =====
    async updateProfile(data) {
        if (!this.currentUser) return { success: false, error: 'غير مسجل دخول' };
        
        try {
            await updateDoc(doc(db, 'users', this.currentUser.id), {
                ...data,
                updatedAt: serverTimestamp()
            });
            
            this.currentUser = { ...this.currentUser, ...data };
            return { success: true };
            
        } catch (error) {
            console.error('خطأ في تحديث الملف:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== تغيير كلمة المرور (للمسؤول) =====
    async changeAdminPassword(newPassword) {
        if (!this.isAdmin) {
            return { success: false, error: 'غير مصرح' };
        }
        
        // في تطبيق حقيقي، يتم تخزين كلمة المرور بشكل مشفر
        // هنا نستخدم قاعدة البيانات لتخزينها
        try {
            await updateDoc(doc(db, 'users', this.currentUser.id), {
                password: newPassword
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ===== التحقق من الصلاحيات =====
    hasPermission(required) {
        if (required === 'admin') return this.isAdmin;
        if (required === 'user') return !!this.currentUser;
        return true;
    }

    // ===== الحصول على المستخدمين المتصلين =====
    async getOnlineUsers() {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('online', '==', true));
            const querySnapshot = await getDocs(q);
            const users = [];
            querySnapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error('خطأ في جلب المتصلين:', error);
            return [];
        }
    }

    // ===== الحصول على جميع المستخدمين =====
    async getAllUsers() {
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);
            const users = [];
            querySnapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error('خطأ في جلب المستخدمين:', error);
            return [];
        }
    }

    // ===== حذف الحساب =====
    async deleteAccount() {
        if (!this.currentUser) {
            return { success: false, error: 'غير مسجل دخول' };
        }
        
        try {
            // حذف رسائل المستخدم
            const messagesRef = collection(db, 'messages');
            const q = query(messagesRef, where('senderId', '==', this.currentUser.id));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            
            // حذف المستخدم
            await deleteDoc(doc(db, 'users', this.currentUser.id));
            localStorage.removeItem('nezek_session');
            
            return { success: true };
            
        } catch (error) {
            console.error('خطأ في حذف الحساب:', error);
            return { success: false, error: error.message };
        }
    }
}

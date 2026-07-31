import { db, auth, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from './firebase-config.js';

export class AuthManager {
    constructor(app) {
        this.app = app;
    }

    init() {
        // التحقق من حالة المصادقة
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // المستخدم مسجل الدخول
                await this.handleUserAuthenticated(user);
            } else {
                // المستخدم غير مسجل
                this.app.showLogin();
            }
        });
    }

    async handleUserAuthenticated(user) {
        try {
            // التحقق من وجود المستخدم في Firestore
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // التحقق من الحظر
                if (userData.banned) {
                    await auth.signOut();
                    this.app.utils.showToast('تم حظر حسابك', 'error');
                    this.app.showLogin();
                    return;
                }
                
                // تحديث حالة الاتصال
                await updateDoc(userRef, {
                    online: true,
                    lastSeen: serverTimestamp()
                });
                
                this.app.currentUser = {
                    id: user.uid,
                    ...userData
                };
                
                this.app.isAdmin = userData.isAdmin || false;
                this.app.showChat();
                this.app.hideLoading();
                
            } else {
                // مستخدم جديد - إظهار إعداد الملف الشخصي
                this.app.currentUser = { id: user.uid };
                this.app.showProfileSetup();
                this.app.hideLoading();
            }
        } catch (error) {
            console.error('خطأ في التحقق من المستخدم:', error);
            this.app.utils.showToast('حدث خطأ', 'error');
        }
    }

    async checkUsernameAvailability(username) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            return querySnapshot.empty;
        } catch (error) {
            console.error('خطأ في التحقق من الاسم:', error);
            return false;
        }
    }

    async updateUserProfile(userId, data) {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('خطأ في تحديث الملف:', error);
            return false;
        }
    }

    async getUserData(userId) {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                return { id: userDoc.id, ...userDoc.data() };
            }
            return null;
        } catch (error) {
            console.error('خطأ في جلب بيانات المستخدم:', error);
            return null;
        }
    }

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
}

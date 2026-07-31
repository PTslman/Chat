import { 
    db, auth,
    collection, doc, getDoc, getDocs,
    addDoc, updateDoc, deleteDoc,
    setDoc, query, where, serverTimestamp,
    signInAnonymously, onAuthStateChanged, signOut,
    ref, uploadBytes, getDownloadURL
} from '../firebase-config.js';

export class AuthManager {
    constructor(app) {
        this.app = app;
        this.currentUser = null;
        this.isAdmin = false;
    }

    // ===== تسجيل الدخول =====
    async login(username, password = null) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return await this.registerUser(username);
            }
            
            let userDoc = null;
            querySnapshot.forEach(doc => {
                userDoc = { id: doc.id, ...doc.data() };
            });
            
            if (userDoc.isAdmin) {
                if (!password || password !== '1442') {
                    throw new Error('كلمة مرور غير صحيحة للمسؤول');
                }
            }
            
            if (userDoc.banned) {
                throw new Error('⚠️ هذا الحساب محظور');
            }
            
            await updateDoc(doc(db, 'users', userDoc.id), {
                online: true,
                lastSeen: serverTimestamp()
            });
            
            this.currentUser = userDoc;
            this.isAdmin = userDoc.isAdmin || false;
            this.saveSession(userDoc);
            
            return { success: true, user: userDoc, isNew: false };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ===== تسجيل مستخدم جديد =====
    async registerUser(username) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                throw new Error('⚠️ هذا الاسم مستخدم بالفعل');
            }
            
            if (username.toLowerCase() === 'slx23m') {
                throw new Error('⚠️ هذا الاسم محجوز للمسؤول');
            }
            
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
                isRealUser: true,
                userId: this.generateUserId()
            };
            
            const result = await signInAnonymously(auth);
            const uid = result.user.uid;
            
            await setDoc(doc(db, 'users', uid), userData);
            
            const newUser = { id: uid, ...userData };
            this.currentUser = newUser;
            this.isAdmin = false;
            this.saveSession(newUser);
            
            return { success: true, user: newUser, isNew: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ===== تسجيل دخول المسؤول =====
    async adminLogin(password) {
        const username = 'slx23m';
        
        if (password !== '1442') {
            return { success: false, error: 'كلمة مرور غير صحيحة' };
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
                
                await updateDoc(doc(db, 'users', userDoc.id), {
                    online: true,
                    lastSeen: serverTimestamp(),
                    isAdmin: true
                });
            } else {
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
            
            return { success: true, user: userDoc, isNew: false };
            
        } catch (error) {
            return { success: false, error: error.message };
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
            return { success: false, error: error.message };
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
                
                if (data.banned) {
                    localStorage.removeItem('nezek_session');
                    return null;
                }
                
                const sessionTime = session.timestamp || 0;
                const now = Date.now();
                if (now - sessionTime > 7 * 24 * 60 * 60 * 1000) {
                    localStorage.removeItem('nezek_session');
                    return null;
                }
                
                this.currentUser = { id: session.userId, ...data };
                this.isAdmin = data.isAdmin || false;
                
                await updateDoc(userRef, {
                    online: true,
                    lastSeen: serverTimestamp()
                });
                
                return this.currentUser;
            }
            
            localStorage.removeItem('nezek_session');
            return null;
            
        } catch (error) {
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
            return { success: false, error: error.message };
        }
    }

    // ===== رفع الصورة الشخصية =====
    async uploadAvatar(file) {
        if (!file || !this.currentUser) return { success: false, error: 'لا يوجد مستخدم' };
        
        try {
            const compressed = await this.compressImage(file);
            const storageRef = ref(storage, `avatars/${this.currentUser.id}`);
            await uploadBytes(storageRef, compressed);
            const downloadURL = await getDownloadURL(storageRef);
            
            await updateDoc(doc(db, 'users', this.currentUser.id), {
                avatar: downloadURL
            });
            
            this.currentUser.avatar = downloadURL;
            return { success: true, url: downloadURL };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ===== ضغط الصورة =====
    compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 200;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX) {
                            height *= MAX / width;
                            width = MAX;
                        }
                    } else {
                        if (height > MAX) {
                            width *= MAX / height;
                            height = MAX;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(resolve, 'image/jpeg', 0.7);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    // ===== حذف الحساب =====
    async deleteAccount() {
        if (!this.currentUser) {
            return { success: false, error: 'غير مسجل دخول' };
        }
        
        try {
            const q = query(collection(db, 'messages'), where('senderId', '==', this.currentUser.id));
            const snapshot = await getDocs(q);
            for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
            }
            
            await deleteDoc(doc(db, 'users', this.currentUser.id));
            localStorage.removeItem('nezek_session');
            
            return { success: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

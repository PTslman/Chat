// login.js
import { auth, db, signInWithEmailAndPassword, collection, query, where, getDocs, setDoc, doc, getDoc } from './firebase-config.js';

const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const statusDiv = document.getElementById('login-status');

// دالة الحصول على IP (استخدام API خارجي)
async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

// التحقق من أن IP لم يسجل أكثر من حساب واحد
async function checkIPRestriction(ip, username) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('ip', '==', ip));
    const snapshot = await getDocs(q);
    
    // إذا كان IP موجود وليس لنفس المستخدم => ممنوع
    if (!snapshot.empty) {
        const existingUser = snapshot.docs[0].data().username;
        if (existingUser !== username) {
            return false; // IP مستخدم من قبل حساب آخر
        }
    }
    return true;
}

loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username) {
        statusDiv.textContent = '⚠️ يرجى إدخال اسم المستخدم';
        return;
    }
    
    statusDiv.textContent = '⏳ جاري التحقق...';
    statusDiv.style.color = '#c084fc';
    
    try {
        const ip = await getIP();
        
        // 1. التحقق من قيود IP
        const isIPAllowed = await checkIPRestriction(ip, username);
        if (!isIPAllowed) {
            statusDiv.textContent = '❌ هذا الجهاز مسجل بحساب آخر!';
            statusDiv.style.color = '#ff6b9d';
            return;
        }
        
        // 2. حالة خاصة: المسؤول
        if (username === 'slx23m') {
            if (password !== '1442') {
                statusDiv.textContent = '🔒 كلمة مرور المسؤول غير صحيحة!';
                statusDiv.style.color = '#ff6b9d';
                return;
            }
            // تسجيل دخول المسؤول
            await signInWithEmailAndPassword(auth, 'admin@nezak.com', 'Admin@1442');
            localStorage.setItem('nezak_user', JSON.stringify({ username, isAdmin: true, ip }));
            window.location.href = 'dashboard.html';
            return;
        }
        
        // 3. المستخدمون العاديون
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            // إنشاء مستخدم جديد
            const userData = {
                username,
                ip,
                createdAt: new Date(),
                isAdmin: false,
                theme: 'dark',
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
                online: true,
                lastSeen: new Date()
            };
            
            // حفظ في Firestore
            await setDoc(doc(db, 'users', username), userData);
            
            // تسجيل دخول وهمي (لأننا لا نستخدم email حقيقي)
            localStorage.setItem('nezak_user', JSON.stringify({ username, isAdmin: false, ip }));
            statusDiv.textContent = '✅ تم إنشاء الحساب ودخولك!';
            statusDiv.style.color = '#4ade80';
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            // مستخدم موجود
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            // التحقق من IP
            if (userData.ip !== ip) {
                statusDiv.textContent = '❌ هذا الحساب مسجل من جهاز آخر!';
                statusDiv.style.color = '#ff6b9d';
                return;
            }
            
            // تحديث وقت آخر ظهور
            await setDoc(doc(db, 'users', username), { 
                ...userData, 
                online: true, 
                lastSeen: new Date() 
            }, { merge: true });
            
            localStorage.setItem('nezak_user', JSON.stringify({ username, isAdmin: false, ip }));
            statusDiv.textContent = '✅ مرحباً بعودتك!';
            statusDiv.style.color = '#4ade80';
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        }
        
    } catch (error) {
        console.error(error);
        statusDiv.textContent = '❌ حدث خطأ، حاول مرة أخرى';
        statusDiv.style.color = '#ff6b9d';
    }
});

// السماح بالدخول بالضغط على Enter
usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });
passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });

// التحقق من جلسة سابقة عند تحميل الصفحة
window.addEventListener('load', () => {
    const saved = localStorage.getItem('nezak_user');
    if (saved) {
        const user = JSON.parse(saved);
        // إذا كان هناك جلسة سابقة، نذهب مباشرة للوحة
        window.location.href = 'dashboard.html';
    }
});

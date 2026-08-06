// admin-panel.js
import { db, collection, getDocs, deleteDoc, doc, updateDoc } from './firebase-config.js';

const adminShield = document.getElementById('admin-shield');
const adminModal = document.getElementById('admin-modal');
const closeModal = document.querySelector('.close-modal');
const adminUsersList = document.getElementById('admin-users-list');

// فتح لوحة المسؤول
adminShield.addEventListener('click', () => {
    if (!currentUser.isAdmin) return;
    adminModal.style.display = 'flex';
    loadAdminUsers();
});

closeModal.addEventListener('click', () => {
    adminModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === adminModal) adminModal.style.display = 'none';
});

async function loadAdminUsers() {
    const snapshot = await getDocs(collection(db, 'users'));
    adminUsersList.innerHTML = '';
    
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.username === 'slx23m') return; // لا نعرض المسؤول نفسه
        
        const div = document.createElement('div');
        div.className = 'admin-user-item';
        div.innerHTML = `
            <span>${user.username}</span>
            <div>
                <button class="ban-btn" data-username="${user.username}">⛔ حظر</button>
                <button class="delete-btn" data-username="${user.username}">🗑️ حذف</button>
                <button class="edit-btn" data-username="${user.username}">✏️ تعديل</button>
            </div>
        `;
        adminUsersList.appendChild(div);
    });
    
    // إضافة الأحداث للأزرار
    document.querySelectorAll('.ban-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const username = btn.dataset.username;
            if (confirm(`هل تريد حظر ${username}؟`)) {
                await updateDoc(doc(db, 'users', username), { banned: true });
                loadAdminUsers();
            }
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const username = btn.dataset.username;
            if (confirm(`هل تريد حذف ${username} نهائياً؟`)) {
                await deleteDoc(doc(db, 'users', username));
                loadAdminUsers();
            }
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.dataset.username;
            const newName = prompt(`تعديل اسم المستخدم ${username} إلى:`, username);
            if (newName && newName !== username) {
                // تنفيذ التعديل (هنا يمكن إضافة منطق تغيير الاسم)
                alert('سيتم تطبيق التعديل قريباً!');
            }
        });
    });
}

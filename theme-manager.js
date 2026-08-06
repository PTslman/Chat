// theme-manager.js
import { doc, updateDoc, getDoc } from './firebase-config.js';

const themeBtn = document.getElementById('theme-toggle-btn');

// تحميل الثيم المحفوظ
async function loadTheme() {
    const userDoc = await getDoc(doc(db, 'users', currentUser.username));
    if (userDoc.exists()) {
        const theme = userDoc.data().theme || 'dark';
        document.body.classList.toggle('light-theme', theme === 'light');
        themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}
loadTheme();

// تبديل الثيم
themeBtn.addEventListener('click', async () => {
    const isLight = document.body.classList.contains('light-theme');
    const newTheme = isLight ? 'dark' : 'light';
    
    document.body.classList.toggle('light-theme', !isLight);
    themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    
    // حفظ في Firebase
    await updateDoc(doc(db, 'users', currentUser.username), {
        theme: newTheme
    });
});

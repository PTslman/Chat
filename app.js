// ============================================================
// 🔥 إعدادات Firebase
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyDKF6Jb-CLB8xM7TvNfoRnxWgiwD54SOXo",
    authDomain: "chat-app-ba3c8.firebaseapp.com",
    projectId: "chat-app-ba3c8",
    storageBucket: "chat-app-ba3c8.firebasestorage.app",
    messagingSenderId: "181727674867",
    appId: "1:181727674867:web:ae9824d9051bab9f73d286",
    measurementId: "G-VEL3PGTKY1"
};

// ============================================================
// 🚀 تهيئة Firebase
// ============================================================
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ============================================================
// 👑 إعدادات المسؤول
// ============================================================
const ADMIN_NAME = "slx23m";
const ADMIN_PASSWORD = "1442";
const VERSION = "v3.5.0";

// ============================================================
// 🚫 الكلمات المحظورة الافتراضية
// ============================================================
const DEFAULT_BAD_WORDS = [
    'كس', 'قحب', 'عاهر', 'زاني', 'زنا', 'خنا', 'لوط',
    'منيوك', 'شرموط', 'قحبة', 'عاهرة', 'زانية', 'خنيث',
    'مخنث', 'لاطي', 'لوطي', 'شاذ', 'منيوكة', 'شرموطة',
    'مومس', 'داعر', 'داعرة', 'فاجر', 'فاجرة'
];

// ============================================================
// 📦 حالة التطبيق
// ============================================================
let currentUser = '';
let userColor = '#2b6ef0';
let isLoggedIn = false;
let isAdmin = false;
let isAdminVerified = false;
let replyTo = null;
let editingMessage = null;
let unsubscribe = null;
let blockedUsers = [];
let badWords = [];
let userIP = '';
let lastSender = '';
let isMuted = false;
let muteTimeout = null;
let muteCount = 0;
let currentTheme = 'dark';
let userAvatarBase64 = '';
let tempAvatarBase64 = '';
let isAdminLoginAttempt = false;
let messageIds = new Set();

// ============================================================
// 📄 عناصر DOM
// ============================================================
const $ = id => document.getElementById(id);

const loginOverlay = $('loginOverlay');
const chatContainer = $('chatContainer');
const usernameInput = $('usernameInput');
const loginBtn = $('loginBtn');
const loginError = $('loginError');
const connectionError = $('connectionError');
const infoMsg = $('infoMsg');
const messagesDiv = $('messages');
const msgInput = $('msgInput');
const sendBtn = $('sendBtn');
const emptyState = $('emptyState');
const logoutBtn = $('logoutBtn');
const adminBtn = $('adminBtn');
const adminBadge = $('adminBadge');
const adminModal = $('adminModal');
const adminPanel = $('adminPanel');
const adminPasswordBox = $('adminPasswordBox');
const adminPasswordInput = $('adminPasswordInput');
const adminPasswordBtn = $('adminPasswordBtn');
const adminPasswordError = $('adminPasswordError');
const adminUsersList = $('adminUsersList');
const closeAdminModal = $('closeAdminModal');
const forceLogoutBtn = $('forceLogoutBtn');
const clearChatBtn = $('clearChatBtn');
const rulesBtn = $('rulesBtn');
const rulesModal = $('rulesModal');
const closeRulesModal = $('closeRulesModal');
const emojiToggle = $('emojiToggle');
const emojiRail = $('emojiRail');
const typingIndicator = $('typingIndicator');
const loadingOverlay = $('loadingOverlay');
const mutedNotice = $('mutedNotice');
const badwordInput = $('badwordInput');
const addBadwordBtn = $('addBadwordBtn');
const badwordsList = $('badwordsList');
const themeToggle = $('themeToggle');
const themeIcon = $('themeIcon');
const themeOptions = $('themeOptions');
const scrollBottomBtn = $('scrollBottomBtn');

const headerAvatar = $('headerAvatar');
const headerAvatarPlaceholder = $('headerAvatarPlaceholder');
const headerUsername = $('headerUsername');
const profileModal = $('profileModal');
const closeProfileModal = $('closeProfileModal');
const profileAvatarPreview = $('profileAvatarPreview');
const profileAvatarPlaceholder = $('profileAvatarPlaceholder');
const profileAvatarBtn = $('profileAvatarBtn');
const profileAvatarInput = $('profileAvatarInput');
const profileNameInput = $('profileNameInput');
const profileSaveBtn = $('profileSaveBtn');
const profileUploadStatus = $('profileUploadStatus');

const loginAdminPasswordBox = $('loginAdminPasswordBox');
const loginAdminPasswordInput = $('loginAdminPasswordInput');
const loginAdminPasswordError = $('loginAdminPasswordError');

// ============================================================
// 📸 دوال الصورة الشخصية
// ============================================================
function getInitials(name) {
    if (!name) return '👤';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name) {
    const colors = ['#2b6ef0', '#ed4245', '#faa81a', '#23a55a', '#a78bfa', '#f472b6', '#60a5fa', '#34d399'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function updateAvatarUI(element, placeholder, avatarBase64, name) {
    if (!element) return;
    if (avatarBase64 && avatarBase64.startsWith('data:image')) {
        element.innerHTML = `<img src="${avatarBase64}" alt="صورة شخصية" loading="lazy">`;
        if (placeholder) placeholder.textContent = '';
    } else {
        const initials = getInitials(name);
        const color = getAvatarColor(name);
        const fontSize = element === profileAvatarPreview ? '32px' : '16px';
        element.innerHTML = `
            <span class="avatar-placeholder" style="background:${color};display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;font-size:${fontSize};font-weight:700;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.2);">
                ${initials}
            </span>
        `;
        if (placeholder) placeholder.textContent = '';
    }
}

function updateAllAvatars(avatarBase64, name) {
    updateAvatarUI(headerAvatar, headerAvatarPlaceholder, avatarBase64, name);
    updateAvatarUI(profileAvatarPreview, profileAvatarPlaceholder, avatarBase64, name);
    if (headerUsername) headerUsername.textContent = name;
}

// ============================================================
// 🖼️ ضغط الصورة إلى Base64
// ============================================================
function compressImageToBase64(file, maxWidth, maxHeight, quality, statusElement) {
    return new Promise((resolve, reject) => {
        try {
            if (statusElement) {
                statusElement.textContent = '⏳ جاري ضغط الصورة...';
                statusElement.className = 'upload-status show loading';
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const img = new Image();
                    img.onload = function() {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');

                            let width = img.width;
                            let height = img.height;

                            if (width > maxWidth) {
                                height = (height * maxWidth) / width;
                                width = maxWidth;
                            }
                            if (height > maxHeight) {
                                width = (width * maxHeight) / height;
                                height = maxHeight;
                            }

                            canvas.width = width;
                            canvas.height = height;
                            ctx.drawImage(img, 0, 0, width, height);

                            const base64 = canvas.toDataURL('image/jpeg', quality);

                            if (statusElement) {
                                statusElement.textContent = '✅ تم ضغط الصورة بنجاح';
                                statusElement.className = 'upload-status show success';
                                setTimeout(() => {
                                    statusElement.className = 'upload-status';
                                }, 1500);
                            }

                            resolve(base64);
                        } catch (err) {
                            console.warn('⚠️ خطأ في معالجة الصورة:', err);
                            if (statusElement) {
                                statusElement.textContent = '❌ فشل معالجة الصورة';
                                statusElement.className = 'upload-status show error';
                            }
                            reject(err);
                        }
                    };
                    img.onerror = function() {
                        console.warn('⚠️ فشل تحميل الصورة');
                        if (statusElement) {
                            statusElement.textContent = '❌ فشل تحميل الصورة';
                            statusElement.className = 'upload-status show error';
                        }
                        reject(new Error('فشل تحميل الصورة'));
                    };
                    img.src = e.target.result;
                } catch (err) {
                    console.warn('⚠️ خطأ في قراءة الصورة:', err);
                    if (statusElement) {
                        statusElement.textContent = '❌ فشل قراءة الصورة';
                        statusElement.className = 'upload-status show error';
                    }
                    reject(err);
                }
            };
            reader.onerror = function() {
                console.warn('⚠️ فشل قراءة الملف');
                if (statusElement) {
                    statusElement.textContent = '❌ فشل قراءة الملف';
                    statusElement.className = 'upload-status show error';
                }
                reject(new Error('فشل قراءة الملف'));
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.warn('⚠️ خطأ في الضغط:', err);
            if (statusElement) {
                statusElement.textContent = '❌ فشل الضغط: ' + err.message;
                statusElement.className = 'upload-status show error';
            }
            reject(err);
        }
    });
}

// ============================================================
// 👤 الملف الشخصي
// ============================================================
function openProfileModal() {
    if (!isLoggedIn) return;
    profileNameInput.value = currentUser;
    profileModal.classList.add('active');
    updateAvatarUI(profileAvatarPreview, profileAvatarPlaceholder, userAvatarBase64, currentUser);
    profileUploadStatus.className = 'upload-status';
    profileUploadStatus.textContent = '';
}

async function saveProfile() {
    const newName = profileNameInput.value.trim();
    if (!newName || newName.length < 2) {
        alert('⚠️ الاسم يجب أن يكون حرفين على الأقل');
        return;
    }

    showLoading(true);

    try {
        let newAvatarBase64 = userAvatarBase64;

        if (tempAvatarBase64) {
            newAvatarBase64 = tempAvatarBase64;
            tempAvatarBase64 = '';
        }

        const oldName = currentUser;

        await db.collection('users').doc(oldName).update({
            username: newName,
            avatar: newAvatarBase64,
            color: userColor
        });

        currentUser = newName;
        userAvatarBase64 = newAvatarBase64;
        updateAllAvatars(newAvatarBase64, newName);

        if (oldName !== newName) {
            const messagesSnap = await db.collection('messages')
                .where('sender', '==', oldName)
                .get();
            const batch = db.batch();
            messagesSnap.forEach(doc => {
                batch.update(doc.ref, { sender: newName, avatar: newAvatarBase64 });
            });
            await batch.commit();
        }

        addSystemMessage(`✅ تم تحديث الملف الشخصي لـ ${newName}`, 'success');
        profileModal.classList.remove('active');

    } catch (error) {
        console.error('❌ خطأ في حفظ الملف الشخصي:', error);
        alert('⚠️ حدث خطأ أثناء حفظ الملف الشخصي');
    }

    showLoading(false);
}

// ============================================================
// 🌓 نظام الثيمات
// ============================================================
function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    if (theme === 'light') {
        themeIcon.textContent = 'light_mode';
    } else {
        themeIcon.textContent = 'dark_mode';
    }

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    try {
        localStorage.setItem('chat_theme', theme);
    } catch (e) {}

    if (isAdmin && isAdminVerified) {
        db.collection('settings').doc('theme').set({ theme }).catch(() => {});
    }
}

function toggleTheme() {
    const themes = ['dark', 'light', 'admin-dark', 'admin-forest', 'admin-rose'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    applyTheme(themes[nextIndex]);
}

function loadSavedTheme() {
    try {
        const saved = localStorage.getItem('chat_theme');
        if (saved) {
            applyTheme(saved);
            return;
        }
    } catch (e) {}

    db.collection('settings').doc('theme').get()
        .then(doc => {
            if (doc.exists && doc.data().theme) {
                applyTheme(doc.data().theme);
            } else {
                applyTheme('dark');
            }
        })
        .catch(() => {
            applyTheme('dark');
        });
}

// ============================================================
// 🔒 تشفير IP
// ============================================================
function getHashedIP() {
    const h = Date.now().toString(36) + Math.random().toString(36).substr(2, 8) + navigator.userAgent.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    try { return btoa(h).substring(0, 20); } catch (e) { return h.substring(0, 20); }
}

// ============================================================
// 🛠️ أدوات مساعدة
// ============================================================
function sanitizeInput(text) {
    return text.replace(/[<>]/g, '').trim();
}

function isEmojiOnly(text) {
    return /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2700}-\u{27BF}\s]+$/u.test(text.trim());
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

function updateClock() {
    const now = new Date();
    $('statusTime').textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}
updateClock();
setInterval(updateClock, 30000);

// ============================================================
// 🎨 منتقي الألوان
// ============================================================
document.querySelectorAll('.color-circle').forEach(el => {
    el.addEventListener('click', function() {
        document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        userColor = this.dataset.color;
    });
});

// ============================================================
// 😊 الإيموجي
// ============================================================
emojiToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    emojiRail.classList.toggle('active');
    emojiToggle.classList.toggle('active');
});

document.addEventListener('click', function(e) {
    if (!emojiRail.contains(e.target) && e.target !== emojiToggle && !emojiToggle.contains(e.target)) {
        emojiRail.classList.remove('active');
        emojiToggle.classList.remove('active');
    }
});

document.querySelectorAll('.emoji-item').forEach(el => {
    el.addEventListener('click', function() {
        msgInput.value += this.textContent;
        msgInput.focus();
        emojiRail.classList.remove('active');
        emojiToggle.classList.remove('active');
    });
});

// ============================================================
// 🌓 أحداث الثيم
// ============================================================
themeToggle.addEventListener('click', toggleTheme);

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        if (!isAdmin || !isAdminVerified) return;
        applyTheme(this.dataset.theme);
    });
});

// ============================================================
// 👑 كشف المسؤول
// ============================================================
usernameInput.addEventListener('input', function() {
    const val = this.value.trim();
    if (val === ADMIN_NAME) {
        loginAdminPasswordBox.style.display = 'block';
        loginAdminPasswordInput.value = '';
        loginAdminPasswordError.classList.remove('show');
        isAdminLoginAttempt = true;
    } else {
        loginAdminPasswordBox.style.display = 'none';
        isAdminLoginAttempt = false;
    }
});

// ============================================================
// 📸 أحداث الصورة الشخصية
// ============================================================
profileAvatarBtn.addEventListener('click', () => profileAvatarInput.click());
profileAvatarPreview.addEventListener('click', () => profileAvatarInput.click());

profileAvatarInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert('⚠️ حجم الصورة كبير جداً (الحد الأقصى 5MB)');
            this.value = '';
            return;
        }

        compressImageToBase64(file, 300, 300, 0.6, profileUploadStatus)
            .then(base64 => {
                profileAvatarPreview.innerHTML = `<img src="${base64}" alt="صورة شخصية">`;
                profileAvatarPlaceholder.textContent = '';
                tempAvatarBase64 = base64;
                profileUploadStatus.textContent = '📸 تم اختيار الصورة، اضغط حفظ للتحديث';
                profileUploadStatus.className = 'upload-status show success';
            })
            .catch(err => {
                console.error('❌ فشل ضغط الصورة:', err);
                alert('⚠️ فشل معالجة الصورة: ' + err.message);
            });
    }
});

// ============================================================
// 👤 أحداث الملف الشخصي
// ============================================================
headerAvatar.addEventListener('click', () => isLoggedIn && openProfileModal());

closeProfileModal.addEventListener('click', () => {
    profileModal.classList.remove('active');
    tempAvatarBase64 = '';
    profileUploadStatus.className = 'upload-status';
    profileUploadStatus.textContent = '';
});

profileModal.addEventListener('click', function(e) {
    if (e.target === this) {
        profileModal.classList.remove('active');
        tempAvatarBase64 = '';
        profileUploadStatus.className = 'upload-status';
        profileUploadStatus.textContent = '';
    }
});

profileSaveBtn.addEventListener('click', saveProfile);

profileNameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') saveProfile();
});

// ============================================================
// 📋 النوافذ المنبثقة
// ============================================================
rulesBtn.addEventListener('click', () => rulesModal.classList.toggle('active'));
closeRulesModal.addEventListener('click', () => rulesModal.classList.remove('active'));
rulesModal.addEventListener('click', function(e) {
    if (e.target === this) rulesModal.classList.remove('active');
});

adminBtn.addEventListener('click', function() {
    isAdminVerified = false;
    adminPanel.style.display = 'none';
    adminPasswordBox.style.display = 'block';
    adminPasswordInput.value = '';
    adminPasswordError.classList.remove('show');
    adminModal.classList.toggle('active');
    if (adminModal.classList.contains('active')) adminPasswordInput.focus();
});

adminPasswordBtn.addEventListener('click', function() {
    if (adminPasswordInput.value.trim() === ADMIN_PASSWORD) {
        isAdminVerified = true;
        adminPasswordBox.style.display = 'none';
        adminPanel.style.display = 'block';
        loadAdminUsers();
        loadBadWords();
    } else {
        adminPasswordError.classList.add('show');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    }
});

adminPasswordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') adminPasswordBtn.click();
});

closeAdminModal.addEventListener('click', function() {
    adminModal.classList.remove('active');
    isAdminVerified = false;
    adminPanel.style.display = 'none';
    adminPasswordBox.style.display = 'block';
    adminPasswordInput.value = '';
    adminPasswordError.classList.remove('show');
});

adminModal.addEventListener('click', function(e) {
    if (e.target === this) {
        adminModal.classList.remove('active');
        isAdminVerified = false;
        adminPanel.style.display = 'none';
        adminPasswordBox.style.display = 'block';
        adminPasswordInput.value = '';
        adminPasswordError.classList.remove('show');
    }
});

// ============================================================
// 🚫 الكلمات المحظورة
// ============================================================
function loadBadWords() {
    db.collection('settings').doc('badwords').get()
        .then(doc => {
            badWords = (doc.exists && doc.data().words) ? doc.data().words : DEFAULT_BAD_WORDS;
            if (!doc.exists) saveBadWords();
            renderBadWords();
        })
        .catch(() => { badWords = DEFAULT_BAD_WORDS;
            renderBadWords(); });
}

function saveBadWords() {
    db.collection('settings').doc('badwords').set({ words: badWords });
}

function renderBadWords() {
    if (!badwordsList) return;
    if (!badWords.length) {
        badwordsList.innerHTML = '<span style="color:var(--text-muted);font-size:11px;">لا توجد كلمات محظورة</span>';
        return;
    }
    let html = '';
    badWords.forEach(word => {
        html += `
            <span class="badword-tag">
                ${word}
                <button class="remove-badword" data-word="${word}">
                    <span class="material-symbols-outlined" style="font-size:12px;">close</span>
                </button>
            </span>
        `;
    });
    badwordsList.innerHTML = html;
    document.querySelectorAll('.remove-badword').forEach(btn => {
        btn.addEventListener('click', function() {
            removeBadWord(this.dataset.word);
        });
    });
}

function addBadWord() {
    const word = badwordInput.value.trim();
    if (!word) return;
    if (badWords.includes(word)) {
        alert('⚠️ هذه الكلمة موجودة بالفعل');
        return;
    }
    badWords.push(word);
    saveBadWords();
    renderBadWords();
    badwordInput.value = '';
    badwordInput.focus();
}

function removeBadWord(word) {
    const index = badWords.indexOf(word);
    if (index > -1) {
        badWords.splice(index, 1);
        saveBadWords();
        renderBadWords();
    }
}

addBadwordBtn.addEventListener('click', addBadWord);
badwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addBadWord();
});

// ============================================================
// 🔍 كشف الكلمات المحظورة
// ============================================================
function containsBadWord(text) {
    const lower = text.toLowerCase();
    for (let i = 0; i < badWords.length; i++) {
        if (lower.includes(badWords[i].toLowerCase())) return badWords[i];
    }
    return null;
}

function applyMute(seconds) {
    isMuted = true;
    msgInput.disabled = true;
    sendBtn.disabled = true;
    mutedNotice.classList.add('active');
    mutedNotice.textContent = `⛔ ممنوع من الكتابة لمدة ${Math.ceil(seconds / 60)} دقيقة`;
    if (muteTimeout) clearTimeout(muteTimeout);
    muteTimeout = setTimeout(() => {
        isMuted = false;
        msgInput.disabled = false;
        sendBtn.disabled = false;
        mutedNotice.classList.remove('active');
        msgInput.focus();
    }, seconds * 1000);
}

function handleBadWord(text, sender) {
    const found = containsBadWord(text);
    if (found) {
        muteCount++;
        const duration = muteCount * 60;
        addSystemMessage(`⚠️ تنبيه: @${sender} استخدم كلمة ممنوعة "${found}" (المخالفة رقم ${muteCount})`, 'warning');
        applyMute(duration);
        db.collection('violations').add({
            user: sender,
            word: found,
            text: text,
            count: muteCount,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    }
    return false;
}

// ============================================================
// 💬 إنشاء الرسائل
// ============================================================
function createMessage(id, data, self) {
    if (blockedUsers.includes(data.sender) && !self) return null;

    const group = document.createElement('div');
    const grouped = (data.sender === lastSender && lastSender !== '');
    group.className = `msg-group ${self ? 'self' : 'other'}${grouped ? ' grouped' : ''}`;
    group.dataset.id = id;
    group.dataset.sender = data.sender;
    lastSender = data.sender;

    // الصورة الرمزية
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    const avatarData = data.avatar || '';

    if (avatarData && avatarData.startsWith('data:image')) {
        avatar.innerHTML = `<img src="${avatarData}" alt="${data.sender}" loading="lazy">`;
    } else {
        const initials = getInitials(data.sender);
        const color = getAvatarColor(data.sender);
        avatar.style.background = color;
        avatar.textContent = initials;
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.fontSize = '11px';
        avatar.style.fontWeight = '600';
        avatar.style.color = '#fff';
    }

    const content = document.createElement('div');
    content.className = 'msg-content';

    // اسم المرسل
    const sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.textContent = data.sender;
    if (data.sender === ADMIN_NAME) {
        const tag = document.createElement('span');
        tag.className = 'admin-tag';
        tag.textContent = '👑 مسؤول';
        sender.appendChild(tag);
    }

    // الفقاعة
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (data.replyTo) {
        const reply = document.createElement('div');
        reply.className = 'reply-box';
        reply.innerHTML = `<span class="r-sender">@${data.replyTo.sender}</span> ${data.replyTo.text.substring(0, 50)}${data.replyTo.text.length > 50 ? '...' : ''}`;
        bubble.appendChild(reply);
    }

    const text = document.createElement('div');
    text.className = 'msg-text';
    if (data.deleted) {
        text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
    } else {
        if (isEmojiOnly(data.text)) text.classList.add('emoji-big');
        text.textContent = data.text;
        if (data.edited) {
            const ed = document.createElement('span');
            ed.className = 'edited-badge';
            ed.textContent = '(معدّل)';
            text.appendChild(ed);
        }
        if (data.warning) {
            const wb = document.createElement('span');
            wb.className = 'warning-badge';
            wb.textContent = '⚠️ كلمة ممنوعة';
            text.appendChild(wb);
        }
    }
    bubble.appendChild(text);

    // الوقت
    const time = document.createElement('div');
    time.className = 'msg-time';
    if (data.timestamp) {
        const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        time.textContent = date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
        if (self && !data.deleted) {
            time.innerHTML += ' <span class="read-status"><span class="material-symbols-outlined" style="font-size:10px;">done_all</span></span>';
        }
    }

    // قائمة الإجراءات
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    let actionsHTML = `
        <button class="reply" title="رد"><span class="material-symbols-outlined">reply</span></button>
        <button class="report" title="إبلاغ"><span class="material-symbols-outlined">flag</span></button>
    `;
    if (isAdmin && !data.deleted) {
        actionsHTML += `<button class="delete" title="حذف نهائي"><span class="material-symbols-outlined">delete_forever</span></button>`;
    }
    if (isAdmin && data.sender !== ADMIN_NAME) {
        actionsHTML += `<button class="block" title="حظر"><span class="material-symbols-outlined">block</span></button>`;
    }
    actions.innerHTML = actionsHTML;

    actions.querySelector('.reply')?.addEventListener('click', function(e) {
        e.stopPropagation();
        setReply(id, data.sender, data.text);
        hideAllActions();
    });
    actions.querySelector('.report')?.addEventListener('click', function(e) {
        e.stopPropagation();
        reportMsg(id, data.sender);
        hideAllActions();
    });
    const del = actions.querySelector('.delete');
    if (del) del.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteMsg(id);
        hideAllActions();
    });
    const blk = actions.querySelector('.block');
    if (blk) blk.addEventListener('click', function(e) {
        e.stopPropagation();
        blockUser(data.sender);
        hideAllActions();
    });

    content.appendChild(sender);
    content.appendChild(bubble);
    content.appendChild(time);
    content.appendChild(actions);

    if (self) {
        group.appendChild(content);
        group.appendChild(avatar);
    } else {
        group.appendChild(avatar);
        group.appendChild(content);
    }

    // الضغط المطول
    let timer = null,
        pressed = false;
    group.addEventListener('mousedown', function() {
        pressed = true;
        timer = setTimeout(() => {
            if (pressed) {
                hideAllActions();
                actions.classList.add('active');
            }
        }, 500);
    });
    group.addEventListener('mouseup', function() {
        pressed = false;
        clearTimeout(timer);
    });
    group.addEventListener('mouseleave', function() {
        pressed = false;
        clearTimeout(timer);
    });
    group.addEventListener('touchstart', function() {
        pressed = true;
        timer = setTimeout(() => {
            if (pressed) {
                hideAllActions();
                actions.classList.add('active');
            }
        }, 500);
    }, { passive: true });
    group.addEventListener('touchend', function() {
        pressed = false;
        clearTimeout(timer);
    });
    group.addEventListener('touchmove', function() {
        pressed = false;
        clearTimeout(timer);
    });

    return group;
}

function hideAllActions() {
    document.querySelectorAll('.msg-actions.active').forEach(el => el.classList.remove('active'));
}
document.addEventListener('click', hideAllActions);

// ============================================================
// 📨 إضافة رسالة
// ============================================================
function addMessage(id, data, self) {
    if (messageIds.has(id)) return;
    messageIds.add(id);

    if (emptyState) emptyState.style.display = 'none';
    const el = createMessage(id, data, self);
    if (el) {
        messagesDiv.appendChild(el);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        updateMessageCount();
    }
}

function addSystemMessage(text, type) {
    type = type || '';
    if (emptyState) emptyState.style.display = 'none';
    const div = document.createElement('div');
    div.className = `system-msg${type ? ' ' + type : ''}`;
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    updateMessageCount();
}

function showRules() {
    const rulesHTML = `
        <div class="rule-title">📜 قوانين الغروب</div>
        <div class="rule-item">1. احترام جميع الأعضاء</div>
        <div class="rule-item">2. لا للسب أو الشتم</div>
        <div class="rule-item">3. لا للمضايقات أو التحرش</div>
        <div class="rule-item">4. لا للمحتوى غير اللائق</div>
        <div class="rule-item">5. الالتزام بالموضوعية</div>
        <div class="rule-item">6. لا للإعلانات دون إذن</div>
        <div class="rule-item">7. احترام قرارات المسؤول</div>
    `;
    const div = document.createElement('div');
    div.className = 'system-msg rules';
    div.innerHTML = rulesHTML;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    updateMessageCount();
}

// ============================================================
// 📊 عدد الرسائل
// ============================================================
function updateMessageCount() {
    const count = messagesDiv.querySelectorAll('.msg-group, .system-msg').length;
    const existing = messagesDiv.querySelector('.msg-count');
    if (existing) existing.remove();

    if (count > 0) {
        const div = document.createElement('div');
        div.className = 'msg-count';
        div.innerHTML = `📬 <span>${count}</span> رسالة`;
        messagesDiv.insertBefore(div, messagesDiv.firstChild);
    }
}

// ============================================================
// 📥 تحميل الرسائل
// ============================================================
function loadMessages() {
    if (emptyState) emptyState.style.display = 'flex';
    lastSender = '';
    messageIds.clear();

    db.collection('messages')
        .orderBy('timestamp', 'asc')
        .get()
        .then(snapshot => {
            if (emptyState) emptyState.style.display = 'none';

            const promises = [];
            const tempMessages = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (blockedUsers.includes(data.sender)) return;

                if (!data.avatar) {
                    const promise = db.collection('users').doc(data.sender).get()
                        .then(userDoc => {
                            if (userDoc.exists) {
                                data.avatar = userDoc.data().avatar || '';
                            }
                            tempMessages.push({ id: doc.id, data });
                        })
                        .catch(() => {
                            tempMessages.push({ id: doc.id, data });
                        });
                    promises.push(promise);
                } else {
                    tempMessages.push({ id: doc.id, data });
                }
            });

            Promise.all(promises).then(() => {
                tempMessages.forEach(({ id, data }) => {
                    addMessage(id, data, data.sender === currentUser);
                });

                if (snapshot.empty && emptyState) emptyState.style.display = 'flex';
                showRules();
                updateMessageCount();

                setTimeout(() => {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }, 100);
            });
        })
        .catch(err => {
            console.error('❌ خطأ في تحميل الرسائل:', err);
        });
}

function listenMessages() {
    if (unsubscribe) unsubscribe();
    lastSender = '';

    unsubscribe = db.collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                if (blockedUsers.includes(data.sender)) return;

                if (change.type === 'added') {
                    if (!messageIds.has(change.doc.id)) {
                        if (!data.avatar) {
                            db.collection('users').doc(data.sender).get()
                                .then(userDoc => {
                                    if (userDoc.exists) {
                                        data.avatar = userDoc.data().avatar || '';
                                    }
                                    addMessage(change.doc.id, data, data.sender === currentUser);
                                })
                                .catch(() => {
                                    addMessage(change.doc.id, data, data.sender === currentUser);
                                });
                        } else {
                            addMessage(change.doc.id, data, data.sender === currentUser);
                        }
                    }
                }

                if (change.type === 'modified') {
                    const existing = messagesDiv.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) {
                        const text = existing.querySelector('.msg-text');
                        if (text) {
                            if (data.deleted) {
                                text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
                            } else {
                                text.innerHTML = data.text + (data.edited ? ' <span class="edited-badge">(معدّل)</span>' : '');
                                if (isEmojiOnly(data.text)) text.classList.add('emoji-big');
                                else text.classList.remove('emoji-big');
                            }
                        }
                    }
                }

                if (change.type === 'removed') {
                    const existing = messagesDiv.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) existing.remove();
                    messageIds.delete(change.doc.id);
                    updateMessageCount();
                }
            });

            if (snapshot.empty) {
                if (emptyState) emptyState.style.display = 'flex';
            } else {
                if (emptyState) emptyState.style.display = 'none';
            }
        }, error => {
            console.error('❌ خطأ في الاستماع للرسائل:', error);
        });
}

// ============================================================
// 📤 إرسال الرسالة
// ============================================================
function sendMessage() {
    const raw = msgInput.value.trim();
    if (!raw || !isLoggedIn) return;
    if (isMuted) {
        alert('⛔ أنت ممنوع من الكتابة حالياً');
        return;
    }
    const text = sanitizeInput(raw);
    if (!text) return;
    if (handleBadWord(text, currentUser)) {
        msgInput.value = '';
        return;
    }
    if (editingMessage) {
        updateMsg(editingMessage.id, text);
        return;
    }

    sendBtn.disabled = true;
    msgInput.disabled = true;

    const data = {
        text: text,
        sender: currentUser,
        color: userColor,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: userIP,
        avatar: userAvatarBase64
    };

    if (replyTo) {
        data.replyTo = {
            id: replyTo.id,
            sender: replyTo.sender,
            text: replyTo.text.substring(0, 60) + (replyTo.text.length > 60 ? '...' : '')
        };
    }

    db.collection('messages').add(data)
        .then(() => {
            msgInput.value = '';
            msgInput.focus();
            clearReply();
        })
        .catch(() => {
            alert('⚠️ فشل الإرسال');
        })
        .finally(() => {
            sendBtn.disabled = false;
            msgInput.disabled = false;
        });
}

// ============================================================
// ✏️ تعديل الرسالة
// ============================================================
function startEdit(id, text) {
    editingMessage = { id, text };
    msgInput.value = text;
    msgInput.focus();
    sendBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
    sendBtn.style.background = '#faa81a';
}

function updateMsg(id, newText) {
    if (!editingMessage) return;
    db.collection('messages').doc(id).update({ text: newText, edited: true })
        .then(() => {
            editingMessage = null;
            sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
            sendBtn.style.background = '';
            msgInput.value = '';
        });
}

// ============================================================
// 🗑️ حذف الرسالة
// ============================================================
function deleteMsg(id) {
    if (!isAdmin) return;
    if (!confirm('🗑️ هل أنت متأكد من حذف هذه الرسالة نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;
    db.collection('messages').doc(id).delete()
        .then(() => {
            addSystemMessage('🗑️ تم حذف رسالة نهائياً بواسطة المسؤول', 'success');
            messageIds.delete(id);
            updateMessageCount();
        })
        .catch(err => {
            console.error('❌ خطأ في الحذف:', err);
            alert('⚠️ فشل حذف الرسالة');
        });
}

// ============================================================
// 🗑️ حذف الدردشة
// ============================================================
function clearChat() {
    if (!isAdmin || !isAdminVerified) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع الرسائل نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;

    showLoading(true);
    db.collection('messages').get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        })
        .then(() => {
            addSystemMessage('🗑️ تم حذف جميع الرسائل نهائياً بواسطة المسؤول', 'success');
            document.querySelectorAll('.msg-group, .system-msg, .msg-count').forEach(el => el.remove());
            emptyState.style.display = 'flex';
            messageIds.clear();
            updateMessageCount();
            showLoading(false);
        })
        .catch(err => {
            console.error('❌ خطأ في حذف الدردشة:', err);
            alert('⚠️ فشل حذف الدردشة');
            showLoading(false);
        });
}
clearChatBtn.addEventListener('click', clearChat);

// ============================================================
// 🚫 الحظر
// ============================================================
function blockUser(username) {
    if (!isAdmin || username === ADMIN_NAME) return;
    if (!confirm(`🚫 حظر @${username} نهائياً؟`)) return;
    if (!blockedUsers.includes(username)) {
        blockedUsers.push(username);
        db.collection('blocked').doc('list').set({ users: blockedUsers })
            .then(() => {
                addSystemMessage(`🚫 @${username} تم حظره بواسطة المسؤول`, 'warning');
                document.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
                loadAdminUsers();
                updateMessageCount();
            });
    }
}

// ============================================================
// 🔓 فك الحظر
// ============================================================
function unblockUser(username) {
    if (!isAdmin) return;
    if (!confirm(`🔓 هل أنت متأكد من فك الحظر عن @${username}؟`)) return;
    const index = blockedUsers.indexOf(username);
    if (index > -1) {
        blockedUsers.splice(index, 1);
        db.collection('blocked').doc('list').set({ users: blockedUsers })
            .then(() => {
                addSystemMessage(`✅ @${username} تم فك الحظر عنه بواسطة المسؤول`, 'success');
                loadAdminUsers();
                loadMessages();
            });
    }
}

// ============================================================
// 🗑️ حذف الحساب
// ============================================================
function deleteUserAccount(username) {
    if (!isAdmin || username === ADMIN_NAME) return;
    if (!confirm(`⚠️ هل أنت متأكد من حذف حساب @${username} بالكامل؟\nسيتم حذف جميع رسائله وبياناته نهائياً.`))
        return;

    showLoading(true);
    db.collection('users').doc(username).delete()
        .then(() => {
            return db.collection('messages').where('sender', '==', username).get()
                .then(snapshot => {
                    const batch = db.batch();
                    snapshot.forEach(doc => batch.delete(doc.ref));
                    return batch.commit();
                });
        })
        .then(() => {
            const index = blockedUsers.indexOf(username);
            if (index > -1) {
                blockedUsers.splice(index, 1);
                return db.collection('blocked').doc('list').set({ users: blockedUsers });
            }
        })
        .then(() => {
            addSystemMessage(`🗑️ تم حذف حساب @${username} بالكامل نهائياً بواسطة المسؤول`, 'success');
            document.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
            loadAdminUsers();
            showLoading(false);
            updateMessageCount();
        })
        .catch(() => {
            alert('⚠️ حدث خطأ');
            showLoading(false);
        });
}

// ============================================================
// 📋 تحميل المحظورين
// ============================================================
function loadBlockedUsers() {
    return db.collection('blocked').doc('list').get()
        .then(doc => {
            blockedUsers = (doc.exists && doc.data().users) ? doc.data().users : [];
            return blockedUsers;
        })
        .catch(() => {
            blockedUsers = [];
            return blockedUsers;
        });
}

// ============================================================
// 📋 الإبلاغ
// ============================================================
function reportMsg(id, sender) {
    if (confirm(`📋 الإبلاغ عن @${sender}؟`)) {
        db.collection('reports').add({
            messageId: id,
            sender: sender,
            reportedBy: currentUser,
            reportedIP: userIP,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            addSystemMessage(`📋 تم الإبلاغ عن @${sender}`);
        });
    }
}

// ============================================================
// ↩️ الرد
// ============================================================
function setReply(id, sender, text) {
    replyTo = { id, sender, text };
    msgInput.placeholder = `رد على @${sender}...`;
    msgInput.focus();
}

function clearReply() {
    replyTo = null;
    msgInput.placeholder = 'اكتب رسالة...';
}

msgInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (editingMessage) {
            editingMessage = null;
            sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
            sendBtn.style.background = '';
            msgInput.value = '';
        }
        clearReply();
    }
});

// ============================================================
// 👥 قائمة المستخدمين للمسؤول
// ============================================================
function loadAdminUsers() {
    if (!isAdmin || !isAdminVerified) return;
    adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">جاري التحميل...</div>';

    db.collection('users').get()
        .then(snapshot => {
            if (snapshot.empty) {
                adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">لا يوجد مستخدمون مسجلون</div>';
                return;
            }

            db.collection('users').where('online', '==', true).get()
                .then(onlineSnapshot => {
                    const onlineSet = new Set();
                    onlineSnapshot.forEach(doc => onlineSet.add(doc.id));

                    db.collection('violations').get()
                        .then(violationsSnapshot => {
                            const violationCount = {};
                            violationsSnapshot.forEach(doc => {
                                const data = doc.data();
                                if (data.user) violationCount[data.user] = (violationCount[data.user] || 0) + 1;
                            });

                            let html = '';
                            snapshot.forEach(doc => {
                                const data = doc.data();
                                const blocked = blockedUsers.includes(data.username);
                                const online = onlineSet.has(data.username);
                                const vcount = violationCount[data.username] || 0;
                                let avatarHtml = '';

                                if (data.avatar && data.avatar.startsWith('data:image')) {
                                    avatarHtml = `<img src="${data.avatar}" alt="${data.username}">`;
                                } else {
                                    avatarHtml = getInitials(data.username);
                                }

                                html += `
                                    <div class="user-item">
                                        <div class="user-info">
                                            <div class="user-avatar-small" style="display:flex;align-items:center;justify-content:center;background:${getAvatarColor(data.username)};color:#fff;font-weight:600;">
                                                ${avatarHtml}
                                            </div>
                                            <span>${data.username}${data.username === ADMIN_NAME ? ' 👑' : ''}${blocked ? ' 🚫' : ''}${online ? ' 🟢' : ' ⚪'}</span>
                                            ${vcount > 0 ? `<span class="muted-badge">⚠️ ${vcount}</span>` : ''}
                                        </div>
                                        <div class="user-actions">
                                            ${data.username !== ADMIN_NAME ? `
                                                ${blocked ? 
                                                    `<button class="unblock-user" onclick="unblockUser('${data.username}')" title="فك الحظر"><span class="material-symbols-outlined">check_circle</span></button>` :
                                                    `<button class="block-user" onclick="blockUser('${data.username}')" title="حظر"><span class="material-symbols-outlined">block</span></button>`
                                                }
                                                <button class="delete-user" onclick="deleteUserAccount('${data.username}')" title="حذف الحساب نهائياً"><span class="material-symbols-outlined">delete_forever</span></button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                            });
                            adminUsersList.innerHTML = html;
                        });
                });
        })
        .catch(() => {
            adminUsersList.innerHTML = '<div style="color:var(--red);font-size:12px;">❌ خطأ في التحميل</div>';
        });
}

// ============================================================
// 🚪 تسجيل الخروج القسري
// ============================================================
forceLogoutBtn.addEventListener('click', function() {
    if (!isAdmin || !isAdminVerified) return;
    if (!confirm('⚠️ هل أنت متأكد من تسجيل خروج جميع المستخدمين؟')) return;

    showLoading(true);
    db.collection('users').where('online', '==', true).get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => batch.update(doc.ref, { online: false, forceLogout: true }));
            return batch.commit();
        })
        .then(() => {
            addSystemMessage('👑 المسؤول قام بتسجيل خروج جميع المستخدمين');
            loadAdminUsers();
            showLoading(false);
        })
        .catch(() => {
            alert('⚠️ حدث خطأ');
            showLoading(false);
        });
});

// ============================================================
// 🚪 تسجيل الخروج
// ============================================================
function logout() {
    if (!confirm('🚪 تسجيل الخروج؟\nسيتم حذف جلسة الدخول من هذا الجهاز.')) return;
    localStorage.removeItem('chat_session');
    performLogout();
}

function performLogout() {
    if (currentUser) {
        db.collection('users').doc(currentUser).update({
            online: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        addSystemMessage(`👋 ${currentUser} غادر الدردشة`);
    }

    isLoggedIn = false;
    currentUser = '';
    isAdmin = false;
    isAdminVerified = false;

    if (unsubscribe) unsubscribe();

    chatContainer.style.display = 'none';
    loginOverlay.classList.remove('hidden');

    messagesDiv.innerHTML = `
        <div class="empty-state" id="emptyState">
            <div class="empty-icon"><span class="material-symbols-outlined">chat</span></div>
            <div class="empty-title">لا توجد رسائل</div>
            <div class="empty-sub">كن أول من يكتب ✨</div>
        </div>
    `;

    msgInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
    sendBtn.style.background = '';
    clearReply();
    editingMessage = null;

    infoMsg.textContent = '👋 تم تسجيل الخروج';
    infoMsg.classList.add('show');
    setTimeout(() => infoMsg.classList.remove('show'), 2000);

    usernameInput.value = '';
    loginAdminPasswordBox.style.display = 'none';
    isAdminLoginAttempt = false;

    userAvatarBase64 = '';
    tempAvatarBase64 = '';
    messageIds.clear();
}

logoutBtn.addEventListener('click', logout);

// ============================================================
// 🔍 التحقق من الخروج القسري
// ============================================================
function checkForceLogout() {
    if (currentUser) {
        db.collection('users').doc(currentUser).get()
            .then(doc => {
                if (doc.exists && doc.data().forceLogout === true) {
                    db.collection('users').doc(currentUser).update({ forceLogout: false });
                    addSystemMessage('🔒 تم تسجيل خروجك قسراً بواسطة المسؤول');
                    setTimeout(() => performLogout(), 1000);
                }
            })
            .catch(() => {});
    }
}
setInterval(checkForceLogout, 5000);

// ============================================================
// 👤 حالة المستخدم
// ============================================================
function setUserOnline(name) {
    db.collection('users').doc(name).set({
        username: name,
        color: userColor,
        ip: userIP,
        online: true,
        forceLogout: false,
        avatar: userAvatarBase64 || '',
        firstSeen: firebase.firestore.FieldValue.serverTimestamp(),
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function setUserOffline(name) {
    db.collection('users').doc(name).update({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ============================================================
// 💾 حفظ الجلسة
// ============================================================
function saveSession(username, color, avatar) {
    try {
        const session = {
            username: username,
            color: color,
            ip: userIP,
            avatar: avatar || '',
            timestamp: Date.now()
        };
        localStorage.setItem('chat_session', JSON.stringify(session));
        console.log('✅ تم حفظ الجلسة');
    } catch (e) {
        console.log('⚠️ لا يمكن حفظ الجلسة');
    }
}

// ============================================================
// 🔍 التحقق من الجلسة
// ============================================================
function checkSession() {
    try {
        const sessionData = localStorage.getItem('chat_session');
        if (!sessionData) return null;
        const session = JSON.parse(sessionData);
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - session.timestamp > maxAge) {
            localStorage.removeItem('chat_session');
            return null;
        }
        return session;
    } catch (e) {
        return null;
    }
}

// ============================================================
// 🚪 تسجيل الدخول
// ============================================================
async function login() {
    const raw = usernameInput.value.trim();
    if (!raw || raw.length < 2) {
        loginError.style.display = 'block';
        return;
    }

    if (raw === ADMIN_NAME) {
        const pass = loginAdminPasswordInput.value.trim();
        if (pass !== ADMIN_PASSWORD) {
            loginAdminPasswordError.classList.add('show');
            loginAdminPasswordInput.value = '';
            loginAdminPasswordInput.focus();
            return;
        }
        loginAdminPasswordError.classList.remove('show');
    }

    const name = sanitizeInput(raw);
    if (!name) {
        loginError.textContent = '⚠️ اسم غير صالح';
        loginError.style.display = 'block';
        return;
    }

    loginError.style.display = 'none';
    connectionError.style.display = 'none';

    showLoading(true);
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="material-symbols-outlined">progress_activity</span> جاري...';

    try {
        userIP = getHashedIP();

        const userDoc = await db.collection('users').doc(name).get();
        let avatarBase64 = '';
        if (userDoc.exists && userDoc.data().avatar) {
            avatarBase64 = userDoc.data().avatar;
        }

        await auth.signInAnonymously();

        currentUser = name;
        userAvatarBase64 = avatarBase64;
        isLoggedIn = true;
        isAdmin = (name === ADMIN_NAME);
        isMuted = false;
        muteCount = 0;

        if (muteTimeout) clearTimeout(muteTimeout);
        mutedNotice.classList.remove('active');

        if (isAdmin) {
            adminBtn.classList.remove('hidden');
            adminBadge.classList.add('show');
        } else {
            adminBtn.classList.add('hidden');
            adminBadge.classList.remove('show');
        }

        await loadBlockedUsers();

        loginOverlay.classList.add('hidden');
        chatContainer.style.display = 'flex';

        msgInput.disabled = false;
        sendBtn.disabled = false;
        msgInput.focus();

        updateAllAvatars(avatarBase64, name);

        if (isAdmin) {
            db.collection('users').doc(name).update({ forceLogout: false }).catch(() => {});
        }

        setUserOnline(name);
        saveSession(name, userColor, avatarBase64);

        if (isAdmin) {
            db.collection('settings').doc('theme').get()
                .then(doc => {
                    if (doc.exists && doc.data().theme) {
                        applyTheme(doc.data().theme);
                    }
                })
                .catch(() => {});
        }

        if (!userDoc.exists) {
            addSystemMessage(`👋 مرحباً ${name}! هذه أول مرة لك في الغروب`);
        } else if (isAdmin) {
            addSystemMessage(`👑 المسؤول ${name} انضم إلى الدردشة`);
        } else {
            addSystemMessage(`👋 ${name} انضم إلى الدردشة`);
        }

        loadMessages();
        listenMessages();
        loadBadWords();

        window.addEventListener('beforeunload', function() {
            if (currentUser) {
                db.collection('users').doc(currentUser).update({ online: false });
            }
        });

    } catch (error) {
        connectionError.textContent = `❌ ${error.message}`;
        connectionError.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
    }

    showLoading(false);
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
}

// ============================================================
// 🔄 بدء التشغيل
// ============================================================
function init() {
    loadSavedTheme();
    infoMsg.textContent = '👋 أدخل اسمك ثم اضغط دخول';
    infoMsg.classList.add('show');
    setTimeout(() => infoMsg.classList.remove('show'), 3000);

    const session = checkSession();
    if (session) {
        usernameInput.value = session.username || '';
        userColor = session.color || '#2b6ef0';
        userAvatarBase64 = session.avatar || '';
        document.querySelectorAll('.color-circle').forEach(el => {
            el.classList.toggle('selected', el.dataset.color === userColor);
        });
        setTimeout(() => login(), 300);
    }
}

// ============================================================
// 🖱️ زر التمرير للأسفل
// ============================================================
messagesDiv.addEventListener('scroll', function() {
    const atBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 50;
    scrollBottomBtn.classList.toggle('show', !atBottom);
});

scrollBottomBtn.addEventListener('click', function() {
    messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: 'smooth' });
});

// ============================================================
// 🎯 الأحداث
// ============================================================
loginBtn.addEventListener('click', login);

usernameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        if (isAdminLoginAttempt) {
            loginAdminPasswordInput.focus();
        } else {
            login();
        }
    }
});

loginAdminPasswordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

// ============================================================
// 🔐 حالة المصادقة
// ============================================================
auth.onAuthStateChanged(function(user) {
    if (!user && !isLoggedIn) {
        loginOverlay.classList.remove('hidden');
        chatContainer.style.display = 'none';
        showLoading(false);
    }
});

// ============================================================
// 🚀 بدء التطبيق
// ============================================================
userIP = getHashedIP();

console.log(`🚀 نيزك ${VERSION} - أقدم فوق، أحدث تحت (مثل الدردشة الطبيعية)`);
console.log(`👑 المسؤول: ${ADMIN_NAME}`);
console.log(`🔒 كلمة المرور: ${ADMIN_PASSWORD}`);
console.log(`🔒 IP مشوش: ${userIP}`);
console.log(`🚫 عدد الكلمات المحظورة: ${DEFAULT_BAD_WORDS.length}`);
console.log('💾 ميزة حفظ الجلسة مفعلة');
console.log('📱 تسجيل الدخول المتعدد من نفس الاسم مفعل');
console.log('🌓 نظام الثيمات مفعل');
console.log('📸 الصور الشخصية مخزنة في Firestore (Base64)');

init();

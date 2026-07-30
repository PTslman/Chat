// ============================================================
// 🔥 إعدادات Firebase - تم التحقق من صحتها
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
// 🚀 تهيئة Firebase مع إعادة المحاولة
// ============================================================
let db, auth, storage;
let firebaseReady = false;

function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK لم يتم تحميله');
            return false;
        }
        
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ تم تهيئة Firebase بنجاح');
        }
        
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();
        
        // تمكين الإعدادات دون اتصال
        db.enablePersistence({ synchronizeTabs: true })
            .then(() => {
                console.log('✅ تم تمكين التخزين المؤقت دون اتصال');
                firebaseReady = true;
            })
            .catch((err) => {
                console.warn('⚠️ تعذر تمكين التخزين المؤقت:', err);
                firebaseReady = true;
            });
        
        return true;
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        return false;
    }
}

// تهيئة Firebase فوراً
initFirebase();

// محاولة إعادة التهيئة إذا فشلت
if (!firebaseReady) {
    setTimeout(() => {
        initFirebase();
    }, 2000);
}

// ============================================================
// 👑 إعدادات المسؤول
// ============================================================
const ADMIN_NAME = "slx23m";
const ADMIN_PASSWORD = "1442";
const VERSION = "v5.0.0";

// ============================================================
// 🚫 الكلمات المحظورة
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
let state = {
    currentUser: '',
    userColor: '#2b6ef0',
    isLoggedIn: false,
    isAdmin: false,
    isAdminVerified: false,
    replyTo: null,
    editingMessage: null,
    unsubscribe: null,
    blockedUsers: [],
    badWords: [],
    userIP: '',
    lastSender: '',
    isMuted: false,
    muteTimeout: null,
    muteCount: 0,
    currentTheme: 'dark',
    userAvatarBase64: '',
    tempAvatarBase64: '',
    isAdminLoginAttempt: false,
    messageIds: new Set(),
    unreadCount: 0,
    onlineUsers: new Set(),
    isFirebaseReady: false,
    connectionRetries: 0,
    maxRetries: 5
};

// ============================================================
// 🎤 متغيرات التسجيل الصوتي
// ============================================================
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;
let recordedBlob = null;

// ============================================================
// 📄 عناصر DOM - مع التحقق من الوجود
// ============================================================
const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`⚠️ العنصر "${id}" غير موجود`);
    return el;
};

// ============================================================
// 📄 تعريف جميع العناصر مع التحقق
// ============================================================
const elements = {};

function initElements() {
    const ids = [
        'loginOverlay', 'chatContainer', 'usernameInput', 'loginBtn',
        'loginError', 'connectionError', 'infoMsg', 'messages',
        'msgInput', 'sendBtn', 'emptyState', 'logoutBtn',
        'adminBtn', 'adminBadge', 'adminModal', 'adminPanel',
        'adminPasswordBox', 'adminPasswordInput', 'adminPasswordBtn',
        'adminPasswordError', 'adminUsersList', 'closeAdminModal',
        'forceLogoutBtn', 'clearChatBtn', 'rulesBtn', 'rulesModal',
        'closeRulesModal', 'emojiToggle', 'emojiRail', 'typingIndicator',
        'typingText', 'loadingOverlay', 'mutedNotice', 'badwordInput',
        'addBadwordBtn', 'badwordsList', 'themeToggle', 'themeIcon',
        'themeOptions', 'scrollBottomBtn', 'newMsgBadge', 'onlineCount',
        'headerAvatar', 'headerAvatarPlaceholder', 'headerUsername',
        'profileModal', 'closeProfileModal', 'profileAvatarPreview',
        'profileAvatarPlaceholder', 'profileAvatarBtn', 'profileAvatarInput',
        'profileNameInput', 'profileSaveBtn', 'profileUploadStatus',
        'loginAdminPasswordBox', 'loginAdminPasswordInput', 'loginAdminPasswordError',
        'replyPreview', 'replyPreviewSender', 'replyPreviewText', 'replyPreviewCancel',
        'reactionPicker', 'searchBtn', 'searchBar', 'searchInput',
        'searchResults', 'searchClose', 'attachBtn', 'voiceBtn',
        'voiceRecording', 'recordingTime', 'voiceCancel', 'voiceSend',
        'uploadProgress', 'uploadProgressBar', 'uploadProgressText',
        'fileViewer', 'fileViewerTitle', 'fileViewerBody',
        'fileViewerImage', 'fileViewerFile', 'fileViewerFileName',
        'fileViewerDownload', 'fileViewerAudio', 'fileViewerAudioPlayer',
        'closeFileViewer', 'appFooter', 'statusTime', 'colorPicker'
    ];
    
    ids.forEach(id => {
        elements[id] = $(id);
        if (!elements[id]) {
            console.warn(`⚠️ عنصر مفقود: ${id}`);
        }
    });
}

// استدعاء التهيئة
initElements();

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
        const fontSize = element === elements.profileAvatarPreview ? '34px' : '16px';
        element.innerHTML = `
            <span style="background:${color};display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;font-size:${fontSize};font-weight:700;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.2);">
                ${initials}
            </span>
        `;
        if (placeholder) placeholder.textContent = '';
    }
}

function updateAllAvatars(avatarBase64, name) {
    updateAvatarUI(elements.headerAvatar, elements.headerAvatarPlaceholder, avatarBase64, name);
    updateAvatarUI(elements.profileAvatarPreview, elements.profileAvatarPlaceholder, avatarBase64, name);
    if (elements.headerUsername) elements.headerUsername.textContent = name;
}

// ============================================================
// 🖼️ ضغط الصورة
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
// 📤 رفع الملفات إلى Firebase Storage
// ============================================================
async function uploadFileToStorage(file, path) {
    return new Promise((resolve, reject) => {
        if (!storage) {
            reject(new Error('Firebase Storage غير جاهز'));
            return;
        }
        
        const storageRef = storage.ref(path);
        const uploadTask = storageRef.put(file);

        if (elements.uploadProgress) {
            elements.uploadProgress.style.display = 'block';
        }

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (elements.uploadProgressBar) {
                    elements.uploadProgressBar.style.width = progress + '%';
                }
                if (elements.uploadProgressText) {
                    elements.uploadProgressText.textContent = `جاري الرفع: ${Math.round(progress)}%`;
                }
            },
            (error) => {
                if (elements.uploadProgress) {
                    elements.uploadProgress.style.display = 'none';
                }
                reject(error);
            },
            async () => {
                if (elements.uploadProgress) {
                    elements.uploadProgress.style.display = 'none';
                }
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                resolve(downloadURL);
            }
        );
    });
}

// ============================================================
// 👤 الملف الشخصي
// ============================================================
function openProfileModal() {
    if (!state.isLoggedIn) return;
    if (elements.profileNameInput) elements.profileNameInput.value = state.currentUser;
    if (elements.profileModal) elements.profileModal.classList.add('active');
    updateAvatarUI(elements.profileAvatarPreview, elements.profileAvatarPlaceholder, state.userAvatarBase64, state.currentUser);
    if (elements.profileUploadStatus) {
        elements.profileUploadStatus.className = 'upload-status';
        elements.profileUploadStatus.textContent = '';
    }
}

async function saveProfile() {
    const newName = elements.profileNameInput ? elements.profileNameInput.value.trim() : '';
    if (!newName || newName.length < 2) {
        alert('⚠️ الاسم يجب أن يكون حرفين على الأقل');
        return;
    }

    showLoading(true);

    try {
        let newAvatarBase64 = state.userAvatarBase64;

        if (state.tempAvatarBase64) {
            newAvatarBase64 = state.tempAvatarBase64;
            state.tempAvatarBase64 = '';
        }

        const oldName = state.currentUser;

        await db.collection('users').doc(oldName).update({
            username: newName,
            avatar: newAvatarBase64,
            color: state.userColor
        });

        state.currentUser = newName;
        state.userAvatarBase64 = newAvatarBase64;
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
        if (elements.profileModal) elements.profileModal.classList.remove('active');

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
    state.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    if (elements.themeIcon) {
        elements.themeIcon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
    }

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    try {
        localStorage.setItem('chat_theme', theme);
    } catch (e) {}

    if (state.isAdmin && state.isAdminVerified) {
        db.collection('settings').doc('theme').set({ theme }).catch(() => {});
    }
}

function toggleTheme() {
    const themes = ['dark', 'light', 'admin-dark', 'admin-forest', 'admin-rose', 'admin-ocean'];
    const currentIndex = themes.indexOf(state.currentTheme);
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

    if (db) {
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
    } else {
        applyTheme('dark');
    }
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
    if (elements.loadingOverlay) {
        if (show) {
            elements.loadingOverlay.classList.add('active');
        } else {
            elements.loadingOverlay.classList.remove('active');
        }
    }
}

function updateClock() {
    const now = new Date();
    if (elements.statusTime) {
        elements.statusTime.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
}
updateClock();
setInterval(updateClock, 30000);

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// ============================================================
// 🎨 منتقي الألوان
// ============================================================
document.querySelectorAll('.color-circle').forEach(el => {
    el.addEventListener('click', function() {
        document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        state.userColor = this.dataset.color;
    });
});

// ============================================================
// 😊 الإيموجي
// ============================================================
if (elements.emojiToggle) {
    elements.emojiToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (elements.emojiRail) {
            elements.emojiRail.classList.toggle('active');
        }
        this.classList.toggle('active');
    });
}

document.addEventListener('click', function(e) {
    if (elements.emojiRail && !elements.emojiRail.contains(e.target) && e.target !== elements.emojiToggle && !elements.emojiToggle?.contains(e.target)) {
        elements.emojiRail.classList.remove('active');
        elements.emojiToggle?.classList.remove('active');
    }
    if (elements.reactionPicker && !elements.reactionPicker.contains(e.target)) {
        elements.reactionPicker.classList.remove('active');
    }
});

document.querySelectorAll('.emoji-item').forEach(el => {
    el.addEventListener('click', function() {
        if (elements.msgInput) {
            elements.msgInput.value += this.textContent;
            elements.msgInput.focus();
        }
        if (elements.emojiRail) elements.emojiRail.classList.remove('active');
        if (elements.emojiToggle) elements.emojiToggle.classList.remove('active');
    });
});

// ============================================================
// 🌓 أحداث الثيم
// ============================================================
if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme);
}

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        if (!state.isAdmin || !state.isAdminVerified) return;
        applyTheme(this.dataset.theme);
    });
});

// ============================================================
// 👑 كشف المسؤول
// ============================================================
if (elements.usernameInput) {
    elements.usernameInput.addEventListener('input', function() {
        const val = this.value.trim();
        console.log('🔄 تغيير في حقل الاسم:', val);
        
        if (val === ADMIN_NAME) {
            if (elements.loginAdminPasswordBox) {
                elements.loginAdminPasswordBox.style.display = 'block';
            }
            if (elements.loginAdminPasswordInput) {
                elements.loginAdminPasswordInput.value = '';
            }
            if (elements.loginAdminPasswordError) {
                elements.loginAdminPasswordError.classList.remove('show');
            }
            state.isAdminLoginAttempt = true;
            console.log('👑 تم كشف المسؤول، ظهور حقل كلمة المرور');
        } else {
            if (elements.loginAdminPasswordBox) {
                elements.loginAdminPasswordBox.style.display = 'none';
            }
            state.isAdminLoginAttempt = false;
            console.log('👤 مستخدم عادي');
        }
    });
}

// ============================================================
// 📸 أحداث الصورة الشخصية
// ============================================================
if (elements.profileAvatarBtn) {
    elements.profileAvatarBtn.addEventListener('click', () => {
        if (elements.profileAvatarInput) elements.profileAvatarInput.click();
    });
}
if (elements.profileAvatarPreview) {
    elements.profileAvatarPreview.addEventListener('click', () => {
        if (elements.profileAvatarInput) elements.profileAvatarInput.click();
    });
}

if (elements.profileAvatarInput) {
    elements.profileAvatarInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('⚠️ حجم الصورة كبير جداً (الحد الأقصى 5MB)');
                this.value = '';
                return;
            }

            compressImageToBase64(file, 300, 300, 0.6, elements.profileUploadStatus)
                .then(base64 => {
                    if (elements.profileAvatarPreview) {
                        elements.profileAvatarPreview.innerHTML = `<img src="${base64}" alt="صورة شخصية">`;
                    }
                    if (elements.profileAvatarPlaceholder) {
                        elements.profileAvatarPlaceholder.textContent = '';
                    }
                    state.tempAvatarBase64 = base64;
                    if (elements.profileUploadStatus) {
                        elements.profileUploadStatus.textContent = '📸 تم اختيار الصورة، اضغط حفظ للتحديث';
                        elements.profileUploadStatus.className = 'upload-status show success';
                    }
                })
                .catch(err => {
                    console.error('❌ فشل ضغط الصورة:', err);
                    alert('⚠️ فشل معالجة الصورة: ' + err.message);
                });
        }
    });
}

// ============================================================
// 👤 أحداث الملف الشخصي
// ============================================================
if (elements.headerAvatar) {
    elements.headerAvatar.addEventListener('click', () => state.isLoggedIn && openProfileModal());
}

if (elements.closeProfileModal) {
    elements.closeProfileModal.addEventListener('click', () => {
        if (elements.profileModal) elements.profileModal.classList.remove('active');
        state.tempAvatarBase64 = '';
        if (elements.profileUploadStatus) {
            elements.profileUploadStatus.className = 'upload-status';
            elements.profileUploadStatus.textContent = '';
        }
    });
}

if (elements.profileModal) {
    elements.profileModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            state.tempAvatarBase64 = '';
            if (elements.profileUploadStatus) {
                elements.profileUploadStatus.className = 'upload-status';
                elements.profileUploadStatus.textContent = '';
            }
        }
    });
}

if (elements.profileSaveBtn) {
    elements.profileSaveBtn.addEventListener('click', saveProfile);
}

if (elements.profileNameInput) {
    elements.profileNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveProfile();
    });
}

// ============================================================
// 📋 النوافذ المنبثقة
// ============================================================
if (elements.rulesBtn) {
    elements.rulesBtn.addEventListener('click', () => {
        if (elements.rulesModal) elements.rulesModal.classList.toggle('active');
    });
}
if (elements.closeRulesModal) {
    elements.closeRulesModal.addEventListener('click', () => {
        if (elements.rulesModal) elements.rulesModal.classList.remove('active');
    });
}
if (elements.rulesModal) {
    elements.rulesModal.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });
}

if (elements.adminBtn) {
    elements.adminBtn.addEventListener('click', function() {
        state.isAdminVerified = false;
        if (elements.adminPanel) elements.adminPanel.style.display = 'none';
        if (elements.adminPasswordBox) elements.adminPasswordBox.style.display = 'block';
        if (elements.adminPasswordInput) {
            elements.adminPasswordInput.value = '';
        }
        if (elements.adminPasswordError) {
            elements.adminPasswordError.classList.remove('show');
        }
        if (elements.adminModal) elements.adminModal.classList.toggle('active');
        if (elements.adminModal?.classList.contains('active') && elements.adminPasswordInput) {
            elements.adminPasswordInput.focus();
        }
    });
}

if (elements.adminPasswordBtn) {
    elements.adminPasswordBtn.addEventListener('click', function() {
        const pass = elements.adminPasswordInput ? elements.adminPasswordInput.value.trim() : '';
        if (pass === ADMIN_PASSWORD) {
            state.isAdminVerified = true;
            if (elements.adminPasswordBox) elements.adminPasswordBox.style.display = 'none';
            if (elements.adminPanel) elements.adminPanel.style.display = 'block';
            loadAdminUsers();
            loadBadWords();
        } else {
            if (elements.adminPasswordError) elements.adminPasswordError.classList.add('show');
            if (elements.adminPasswordInput) {
                elements.adminPasswordInput.value = '';
                elements.adminPasswordInput.focus();
            }
        }
    });
}

if (elements.adminPasswordInput) {
    elements.adminPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && elements.adminPasswordBtn) {
            elements.adminPasswordBtn.click();
        }
    });
}

if (elements.closeAdminModal) {
    elements.closeAdminModal.addEventListener('click', function() {
        if (elements.adminModal) elements.adminModal.classList.remove('active');
        state.isAdminVerified = false;
    });
}

if (elements.adminModal) {
    elements.adminModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            state.isAdminVerified = false;
        }
    });
}

// ============================================================
// 🚫 الكلمات المحظورة
// ============================================================
function loadBadWords() {
    if (!db) return;
    db.collection('settings').doc('badwords').get()
        .then(doc => {
            state.badWords = (doc.exists && doc.data().words) ? doc.data().words : DEFAULT_BAD_WORDS;
            if (!doc.exists) saveBadWords();
            renderBadWords();
        })
        .catch(() => { state.badWords = DEFAULT_BAD_WORDS;
            renderBadWords(); });
}

function saveBadWords() {
    if (!db) return;
    db.collection('settings').doc('badwords').set({ words: state.badWords });
}

function renderBadWords() {
    if (!elements.badwordsList) return;
    if (!state.badWords.length) {
        elements.badwordsList.innerHTML = '<span style="color:var(--text-muted);font-size:11px;">لا توجد كلمات محظورة</span>';
        return;
    }
    let html = '';
    state.badWords.forEach(word => {
        html += `
            <span class="badword-tag">
                ${word}
                <button class="remove-badword" data-word="${word}">
                    <span class="material-symbols-outlined" style="font-size:12px;">close</span>
                </button>
            </span>
        `;
    });
    elements.badwordsList.innerHTML = html;
    document.querySelectorAll('.remove-badword').forEach(btn => {
        btn.addEventListener('click', function() {
            removeBadWord(this.dataset.word);
        });
    });
}

function addBadWord() {
    const word = elements.badwordInput ? elements.badwordInput.value.trim() : '';
    if (!word) return;
    if (state.badWords.includes(word)) {
        alert('⚠️ هذه الكلمة موجودة بالفعل');
        return;
    }
    state.badWords.push(word);
    saveBadWords();
    renderBadWords();
    if (elements.badwordInput) {
        elements.badwordInput.value = '';
        elements.badwordInput.focus();
    }
}

function removeBadWord(word) {
    const index = state.badWords.indexOf(word);
    if (index > -1) {
        state.badWords.splice(index, 1);
        saveBadWords();
        renderBadWords();
    }
}

if (elements.addBadwordBtn) {
    elements.addBadwordBtn.addEventListener('click', addBadWord);
}
if (elements.badwordInput) {
    elements.badwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addBadWord();
    });
}

// ============================================================
// 🔍 كشف الكلمات المحظورة
// ============================================================
function containsBadWord(text) {
    const lower = text.toLowerCase();
    for (let i = 0; i < state.badWords.length; i++) {
        if (lower.includes(state.badWords[i].toLowerCase())) return state.badWords[i];
    }
    return null;
}

function applyMute(seconds) {
    state.isMuted = true;
    if (elements.msgInput) elements.msgInput.disabled = true;
    if (elements.sendBtn) elements.sendBtn.disabled = true;
    if (elements.mutedNotice) {
        elements.mutedNotice.classList.add('active');
        elements.mutedNotice.textContent = `⛔ ممنوع من الكتابة لمدة ${Math.ceil(seconds / 60)} دقيقة`;
    }
    if (state.muteTimeout) clearTimeout(state.muteTimeout);
    state.muteTimeout = setTimeout(() => {
        state.isMuted = false;
        if (elements.msgInput) elements.msgInput.disabled = false;
        if (elements.sendBtn) elements.sendBtn.disabled = false;
        if (elements.mutedNotice) elements.mutedNotice.classList.remove('active');
        if (elements.msgInput) elements.msgInput.focus();
    }, seconds * 1000);
}

function handleBadWord(text, sender) {
    const found = containsBadWord(text);
    if (found) {
        state.muteCount++;
        const duration = state.muteCount * 60;
        addSystemMessage(`⚠️ تنبيه: @${sender} استخدم كلمة ممنوعة "${found}" (المخالفة رقم ${state.muteCount})`, 'warning');
        applyMute(duration);
        if (db) {
            db.collection('violations').add({
                user: sender,
                word: found,
                text: text,
                count: state.muteCount,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        return true;
    }
    return false;
}

// ============================================================
// 🔍 البحث في الرسائل
// ============================================================
if (elements.searchBtn) {
    elements.searchBtn.addEventListener('click', function() {
        if (elements.searchBar) {
            elements.searchBar.style.display = elements.searchBar.style.display === 'none' ? 'block' : 'none';
        }
        if (elements.searchBar?.style.display === 'block') {
            if (elements.searchInput) {
                elements.searchInput.focus();
            }
            if (elements.searchResults) {
                elements.searchResults.innerHTML = '';
                elements.searchResults.classList.remove('active');
            }
        }
    });
}

if (elements.searchClose) {
    elements.searchClose.addEventListener('click', function() {
        if (elements.searchBar) elements.searchBar.style.display = 'none';
        if (elements.searchResults) {
            elements.searchResults.innerHTML = '';
            elements.searchResults.classList.remove('active');
        }
        if (elements.searchInput) elements.searchInput.value = '';
    });
}

if (elements.searchInput) {
    elements.searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) {
            if (elements.searchResults) {
                elements.searchResults.innerHTML = '';
                elements.searchResults.classList.remove('active');
            }
            return;
        }

        const results = [];
        if (elements.messages) {
            const messages = elements.messages.querySelectorAll('.msg-group');
            messages.forEach(msg => {
                const textEl = msg.querySelector('.msg-text');
                if (textEl && !textEl.querySelector('.deleted-badge')) {
                    const text = textEl.textContent.toLowerCase();
                    if (text.includes(query)) {
                        const sender = msg.dataset.sender || 'مستخدم';
                        const time = msg.querySelector('.msg-time')?.textContent || '';
                        results.push({
                            element: msg,
                            text: textEl.textContent,
                            sender: sender,
                            time: time
                        });
                    }
                }
            });
        }

        if (!elements.searchResults) return;
        
        if (results.length === 0) {
            elements.searchResults.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:13px;text-align:center;">🔍 لا توجد نتائج</div>';
            elements.searchResults.classList.add('active');
            return;
        }

        let html = '';
        results.forEach((result, index) => {
            html += `
                <div class="search-result-item" data-index="${index}">
                    <div class="result-sender">${result.sender}</div>
                    <div class="result-text">${result.text.substring(0, 80)}${result.text.length > 80 ? '...' : ''}</div>
                    <div class="result-time">${result.time}</div>
                </div>
            `;
        });
        elements.searchResults.innerHTML = html;
        elements.searchResults.classList.add('active');

        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                const result = results[index];
                if (result && result.element) {
                    result.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    result.element.style.background = 'var(--accent-glow)';
                    setTimeout(() => {
                        result.element.style.background = '';
                    }, 2000);
                    if (elements.searchBar) elements.searchBar.style.display = 'none';
                    if (elements.searchResults) {
                        elements.searchResults.classList.remove('active');
                        elements.searchResults.innerHTML = '';
                    }
                    if (elements.searchInput) elements.searchInput.value = '';
                }
            });
        });
    });
}

// ============================================================
// 🎤 التسجيل الصوتي
// ============================================================
if (elements.voiceBtn) {
    elements.voiceBtn.addEventListener('click', async function() {
        if (isRecording) {
            stopRecording();
            return;
        }
        await startRecording();
    });
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        isRecording = true;
        recordingSeconds = 0;

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
            if (elements.voiceRecording) elements.voiceRecording.style.display = 'flex';
            if (elements.recordingTime) elements.recordingTime.textContent = '00:00';
            if (elements.voiceBtn) {
                elements.voiceBtn.classList.remove('recording');
                elements.voiceBtn.innerHTML = '<span class="material-symbols-outlined">mic</span>';
            }
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        if (elements.voiceBtn) {
            elements.voiceBtn.classList.add('recording');
            elements.voiceBtn.innerHTML = '<span class="material-symbols-outlined">stop</span>';
        }

        recordingTimer = setInterval(() => {
            recordingSeconds++;
            const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
            const secs = String(recordingSeconds % 60).padStart(2, '0');
            if (elements.recordingTime) {
                elements.recordingTime.textContent = `${mins}:${secs}`;
            }
        }, 1000);

    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        alert('⚠️ لا يمكن الوصول إلى الميكروفون. يرجى السماح بالوصول.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        clearInterval(recordingTimer);
    }
}

if (elements.voiceCancel) {
    elements.voiceCancel.addEventListener('click', function() {
        if (elements.voiceRecording) elements.voiceRecording.style.display = 'none';
        recordedBlob = null;
        audioChunks = [];
    });
}

if (elements.voiceSend) {
    elements.voiceSend.addEventListener('click', async function() {
        if (!recordedBlob) return;
        
        showLoading(true);
        try {
            const fileName = `audio_${Date.now()}.webm`;
            const path = `audio/${state.currentUser}/${fileName}`;
            const downloadURL = await uploadFileToStorage(recordedBlob, path);

            const data = {
                text: '🎤 رسالة صوتية',
                sender: state.currentUser,
                color: state.userColor,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ip: state.userIP,
                avatar: state.userAvatarBase64,
                audio: downloadURL,
                audioDuration: recordingSeconds,
                reactions: {}
            };

            await db.collection('messages').add(data);
            
            if (elements.voiceRecording) elements.voiceRecording.style.display = 'none';
            recordedBlob = null;
            audioChunks = [];
            
            addSystemMessage(`🎤 تم إرسال رسالة صوتية (${recordingSeconds}ث)`, 'success');
            
        } catch (error) {
            console.error('❌ خطأ في إرسال الصوت:', error);
            alert('⚠️ فشل إرسال الرسالة الصوتية');
        }
        showLoading(false);
    });
}

// ============================================================
// 📎 إرفاق ملفات
// ============================================================
if (elements.attachBtn) {
    elements.attachBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,audio/*,video/*,.pdf,.doc,.docx,.txt';
        input.onchange = async function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                await handleFileUpload(file);
            }
        };
        input.click();
    });
}

async function handleFileUpload(file) {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('⚠️ حجم الملف كبير جداً (الحد الأقصى 10MB)');
        return;
    }

    showLoading(true);
    try {
        const fileName = `${Date.now()}_${file.name}`;
        const path = `files/${state.currentUser}/${fileName}`;
        const downloadURL = await uploadFileToStorage(file, path);

        let fileType = 'file';
        let fileIcon = 'attach_file';
        let displayText = `📎 ${file.name}`;

        if (file.type.startsWith('image/')) {
            fileType = 'image';
            fileIcon = 'image';
            displayText = `🖼️ ${file.name}`;
        } else if (file.type.startsWith('audio/')) {
            fileType = 'audio';
            fileIcon = 'audiotrack';
            displayText = `🎵 ${file.name}`;
        } else if (file.type.startsWith('video/')) {
            fileType = 'video';
            fileIcon = 'videocam';
            displayText = `🎬 ${file.name}`;
        } else if (file.type.includes('pdf')) {
            fileIcon = 'picture_as_pdf';
        } else if (file.type.includes('word') || file.type.includes('document')) {
            fileIcon = 'description';
        } else if (file.type.includes('sheet') || file.type.includes('excel')) {
            fileIcon = 'table_chart';
        }

        const data = {
            text: displayText,
            sender: state.currentUser,
            color: state.userColor,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ip: state.userIP,
            avatar: state.userAvatarBase64,
            file: {
                name: file.name,
                url: downloadURL,
                type: fileType,
                mimeType: file.type,
                size: file.size,
                icon: fileIcon
            },
            reactions: {}
        };

        await db.collection('messages').add(data);
        addSystemMessage(`📎 تم إرسال ملف: ${file.name}`, 'info');

    } catch (error) {
        console.error('❌ خطأ في رفع الملف:', error);
        alert('⚠️ فشل رفع الملف');
    }
    showLoading(false);
}

// ============================================================
// 👁️ عارض الملفات
// ============================================================
function openFileViewer(fileData, sender) {
    if (elements.fileViewerTitle) {
        elements.fileViewerTitle.textContent = `📎 ${fileData.name || 'ملف'} من ${sender}`;
    }
    if (elements.fileViewerImage) elements.fileViewerImage.style.display = 'none';
    if (elements.fileViewerFile) elements.fileViewerFile.style.display = 'none';
    if (elements.fileViewerAudio) elements.fileViewerAudio.style.display = 'none';

    if (fileData.type === 'image') {
        if (elements.fileViewerImage) {
            elements.fileViewerImage.src = fileData.url;
            elements.fileViewerImage.style.display = 'block';
        }
    } else if (fileData.type === 'audio') {
        if (elements.fileViewerAudioPlayer) {
            elements.fileViewerAudioPlayer.src = fileData.url;
        }
        if (elements.fileViewerAudio) elements.fileViewerAudio.style.display = 'block';
    } else {
        if (elements.fileViewerFileName) {
            elements.fileViewerFileName.textContent = fileData.name || 'ملف';
        }
        if (elements.fileViewerDownload) {
            elements.fileViewerDownload.href = fileData.url;
            elements.fileViewerDownload.download = fileData.name || 'ملف';
        }
        if (elements.fileViewerFile) elements.fileViewerFile.style.display = 'flex';
    }

    if (elements.fileViewer) elements.fileViewer.classList.add('active');
}

if (elements.closeFileViewer) {
    elements.closeFileViewer.addEventListener('click', function() {
        if (elements.fileViewer) elements.fileViewer.classList.remove('active');
        if (elements.fileViewerAudioPlayer) {
            elements.fileViewerAudioPlayer.pause();
        }
    });
}

if (elements.fileViewer) {
    elements.fileViewer.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            if (elements.fileViewerAudioPlayer) {
                elements.fileViewerAudioPlayer.pause();
            }
        }
    });
}

// ============================================================
// 💬 إنشاء الرسائل
// ============================================================
let lastSender = '';

function createMessage(id, data, self) {
    if (state.blockedUsers.includes(data.sender) && !self) return null;

    const group = document.createElement('div');
    const grouped = (data.sender === lastSender && lastSender !== '');
    group.className = `msg-group ${self ? 'self' : 'other'}${grouped ? ' grouped' : ''}`;
    group.dataset.id = id;
    group.dataset.sender = data.sender;
    lastSender = data.sender;

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
        avatar.style.fontSize = '12px';
        avatar.style.fontWeight = '600';
        avatar.style.color = '#fff';
    }

    const content = document.createElement('div');
    content.className = 'msg-content';

    const sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.textContent = data.sender;
    if (data.sender === ADMIN_NAME) {
        const tag = document.createElement('span');
        tag.className = 'admin-tag';
        tag.textContent = '👑 مسؤول';
        sender.appendChild(tag);
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (data.replyTo) {
        const reply = document.createElement('div');
        reply.className = 'reply-box';
        reply.innerHTML = `<span class="r-sender">@${data.replyTo.sender}</span> ${data.replyTo.text.substring(0, 60)}${data.replyTo.text.length > 60 ? '...' : ''}`;
        bubble.appendChild(reply);
    }

    const text = document.createElement('div');
    text.className = 'msg-text';
    if (data.deleted) {
        text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
    } else {
        if (data.file) {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'msg-file';
            fileDiv.innerHTML = `
                <span class="file-icon material-symbols-outlined">${data.file.icon || 'attach_file'}</span>
                <div class="file-info">
                    <div class="file-name">${data.file.name}</div>
                    <div class="file-size">${formatFileSize(data.file.size)}</div>
                </div>
                <button class="file-download material-symbols-outlined">download</button>
            `;
            
            if (data.file.type === 'image') {
                const img = document.createElement('img');
                img.src = data.file.url;
                img.className = 'msg-image';
                img.loading = 'lazy';
                img.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openFileViewer(data.file, data.sender);
                });
                bubble.appendChild(img);
            } else if (data.file.type === 'audio') {
                const audioDiv = document.createElement('div');
                audioDiv.className = 'msg-audio';
                audioDiv.innerHTML = `<audio controls><source src="${data.file.url}" type="${data.file.mimeType || 'audio/webm'}"></audio>`;
                bubble.appendChild(audioDiv);
            } else {
                bubble.appendChild(fileDiv);
                fileDiv.querySelector('.file-download').addEventListener('click', function(e) {
                    e.stopPropagation();
                    window.open(data.file.url, '_blank');
                });
                fileDiv.addEventListener('click', function(e) {
                    if (!e.target.closest('.file-download')) {
                        openFileViewer(data.file, data.sender);
                    }
                });
            }
        } else if (data.audio) {
            const audioDiv = document.createElement('div');
            audioDiv.className = 'msg-audio';
            const duration = data.audioDuration ? ` (${data.audioDuration}ث)` : '';
            audioDiv.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-size:12px;color:var(--text-muted);">🎤 رسالة صوتية${duration}</span>
                </div>
                <audio controls><source src="${data.audio}" type="audio/webm"></audio>
            `;
            bubble.appendChild(audioDiv);
        } else {
            if (isEmojiOnly(data.text)) text.classList.add('emoji-big');
            text.textContent = data.text;
            if (data.edited) {
                const ed = document.createElement('span');
                ed.className = 'edited-badge';
                ed.textContent = '(معدّل)';
                text.appendChild(ed);
            }
            bubble.appendChild(text);
        }
    }

    const time = document.createElement('div');
    time.className = 'msg-time';
    if (data.timestamp) {
        const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        time.textContent = date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
        if (self && !data.deleted) {
            time.innerHTML += ' <span class="read-status"><span class="material-symbols-outlined" style="font-size:10px;">done_all</span></span>';
        }
    }

    const reactions = document.createElement('div');
    reactions.className = 'msg-reactions';
    if (data.reactions && Object.keys(data.reactions).length > 0) {
        Object.keys(data.reactions).forEach(emoji => {
            const users = data.reactions[emoji] || [];
            const count = users.length;
            const reacted = users.includes(state.currentUser);
            const reactionEl = document.createElement('button');
            reactionEl.className = `msg-reaction${reacted ? ' reacted' : ''}`;
            reactionEl.innerHTML = `${emoji} <span class="reaction-count">${count}</span>`;
            reactionEl.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleReaction(id, emoji);
            });
            reactions.appendChild(reactionEl);
        });
    }

    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    let actionsHTML = `
        <button class="reply" title="رد"><span class="material-symbols-outlined">reply</span></button>
        <button class="react" title="تفاعل"><span class="material-symbols-outlined">emoji_emotions</span></button>
        <button class="copy" title="نسخ"><span class="material-symbols-outlined">content_copy</span></button>
    `;
    if (data.sender === state.currentUser && !data.deleted) {
        actionsHTML += `<button class="edit" title="تعديل"><span class="material-symbols-outlined">edit</span></button>`;
    }
    actionsHTML += `<button class="report" title="إبلاغ"><span class="material-symbols-outlined">flag</span></button>`;
    if (state.isAdmin && !data.deleted) {
        actionsHTML += `<button class="delete" title="حذف"><span class="material-symbols-outlined">delete_forever</span></button>`;
    }
    if (state.isAdmin && data.sender !== ADMIN_NAME) {
        actionsHTML += `<button class="block" title="حظر"><span class="material-symbols-outlined">block</span></button>`;
    }
    actions.innerHTML = actionsHTML;

    actions.querySelector('.reply')?.addEventListener('click', function(e) {
        e.stopPropagation();
        setReply(id, data.sender, data.text || 'ملف');
        hideAllActions();
    });
    actions.querySelector('.react')?.addEventListener('click', function(e) {
        e.stopPropagation();
        showReactionPicker(id);
        hideAllActions();
    });
    actions.querySelector('.copy')?.addEventListener('click', function(e) {
        e.stopPropagation();
        const textToCopy = data.text || data.file?.name || 'رسالة';
        navigator.clipboard.writeText(textToCopy).then(() => {
            addSystemMessage('📋 تم نسخ النص', 'info');
        }).catch(() => {});
        hideAllActions();
    });
    actions.querySelector('.edit')?.addEventListener('click', function(e) {
        e.stopPropagation();
        if (data.text && !data.file && !data.audio) {
            startEdit(id, data.text);
        }
        hideAllActions();
    });
    actions.querySelector('.report')?.addEventListener('click', function(e) {
        e.stopPropagation();
        reportMsg(id, data.sender);
        hideAllActions();
    });
    actions.querySelector('.delete')?.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteMsg(id);
        hideAllActions();
    });
    actions.querySelector('.block')?.addEventListener('click', function(e) {
        e.stopPropagation();
        blockUser(data.sender);
        hideAllActions();
    });

    content.appendChild(sender);
    content.appendChild(bubble);
    if (reactions.children.length > 0) {
        content.appendChild(reactions);
    }
    content.appendChild(time);
    content.appendChild(actions);

    if (self) {
        group.appendChild(content);
        group.appendChild(avatar);
    } else {
        group.appendChild(avatar);
        group.appendChild(content);
    }

    // سحب للرد
    let startX = 0, startY = 0, isSwiping = false;
    group.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isSwiping = true;
    }, { passive: true });

    group.addEventListener('touchmove', function(e) {
        if (!isSwiping || data.deleted) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
            e.preventDefault();
            const self = data.sender === state.currentUser;
            const direction = self ? -1 : 1;
            if (deltaX * direction > 0) {
                group.style.transform = `translateX(${deltaX * direction}px)`;
                group.style.opacity = 1 - Math.min(Math.abs(deltaX) / 150, 0.4);
                group.style.transition = 'none';
            }
        }
    }, { passive: false });

    group.addEventListener('touchend', function(e) {
        if (!isSwiping) return;
        isSwiping = false;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const self = data.sender === state.currentUser;
        const direction = self ? -1 : 1;
        if (deltaX * direction > 60 && !data.deleted) {
            setReply(id, data.sender, data.text || 'ملف');
        }
        group.style.transform = '';
        group.style.opacity = '';
        group.style.transition = '';
    }, { passive: true });

    // الضغط المطول
    let timer = null, pressed = false;
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
// 😊 لوحة التفاعلات
// ============================================================
let currentReactionMessageId = null;

function showReactionPicker(messageId) {
    currentReactionMessageId = messageId;
    if (elements.reactionPicker) {
        elements.reactionPicker.classList.toggle('active');
    }
    const msgEl = document.querySelector(`[data-id="${messageId}"]`);
    if (msgEl && elements.reactionPicker) {
        const rect = msgEl.getBoundingClientRect();
        const containerRect = document.querySelector('.chat-container')?.getBoundingClientRect();
        if (containerRect) {
            const top = rect.top - containerRect.top - 60;
            elements.reactionPicker.style.top = Math.max(10, top) + 'px';
        }
    }
}

document.querySelectorAll('.reaction-option').forEach(btn => {
    btn.addEventListener('click', function() {
        if (currentReactionMessageId) {
            toggleReaction(currentReactionMessageId, this.dataset.reaction);
            if (elements.reactionPicker) elements.reactionPicker.classList.remove('active');
            currentReactionMessageId = null;
        }
    });
});

function toggleReaction(messageId, emoji) {
    const msgRef = db.collection('messages').doc(messageId);
    db.runTransaction(async (transaction) => {
        const doc = await transaction.get(msgRef);
        if (!doc.exists) return;
        const data = doc.data();
        const reactions = data.reactions || {};
        if (!reactions[emoji]) {
            reactions[emoji] = [];
        }
        const index = reactions[emoji].indexOf(state.currentUser);
        if (index > -1) {
            reactions[emoji].splice(index, 1);
            if (reactions[emoji].length === 0) {
                delete reactions[emoji];
            }
        } else {
            reactions[emoji].push(state.currentUser);
        }
        transaction.update(msgRef, { reactions });
    }).catch(err => console.error('❌ خطأ في التفاعل:', err));
}

// ============================================================
// 📨 إضافة رسالة
// ============================================================
function addMessage(id, data, self) {
    if (state.messageIds.has(id)) return;
    state.messageIds.add(id);

    if (elements.emptyState) elements.emptyState.style.display = 'none';
    const el = createMessage(id, data, self);
    if (el && elements.messages) {
        elements.messages.appendChild(el);
        if (!isScrolledToBottom()) {
            state.unreadCount++;
            updateNewMsgBadge();
        }
        setTimeout(() => {
            if (elements.messages) {
                elements.messages.scrollTop = elements.messages.scrollHeight;
            }
        }, 100);
        updateMessageCount();
    }
}

function isScrolledToBottom() {
    if (!elements.messages) return true;
    return elements.messages.scrollTop + elements.messages.clientHeight >= elements.messages.scrollHeight - 50;
}

function updateNewMsgBadge() {
    if (elements.newMsgBadge) {
        if (state.unreadCount > 0) {
            elements.newMsgBadge.textContent = state.unreadCount;
            elements.newMsgBadge.classList.add('show');
        } else {
            elements.newMsgBadge.classList.remove('show');
        }
    }
}

function addSystemMessage(text, type) {
    type = type || '';
    if (elements.emptyState) elements.emptyState.style.display = 'none';
    const div = document.createElement('div');
    div.className = `system-msg${type ? ' ' + type : ''}`;
    div.textContent = text;
    if (elements.messages) {
        elements.messages.appendChild(div);
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }
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
    if (elements.messages) {
        elements.messages.appendChild(div);
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }
    updateMessageCount();
}

// ============================================================
// 📊 عدد الرسائل والمستخدمين
// ============================================================
function updateMessageCount() {
    if (!elements.messages) return;
    const count = elements.messages.querySelectorAll('.msg-group, .system-msg').length;
    const existing = elements.messages.querySelector('.msg-count');
    if (existing) existing.remove();

    if (count > 0) {
        const div = document.createElement('div');
        div.className = 'msg-count';
        div.innerHTML = `📬 <span>${count}</span> رسالة`;
        elements.messages.insertBefore(div, elements.messages.firstChild);
    }
}

function updateOnlineCount() {
    if (elements.onlineCount) {
        elements.onlineCount.textContent = `🟢 ${state.onlineUsers.size}`;
    }
}

// ============================================================
// 📥 تحميل الرسائل
// ============================================================
function loadMessages() {
    if (!db) {
        console.error('❌ Firebase غير جاهز');
        setTimeout(loadMessages, 2000);
        return;
    }
    
    if (elements.emptyState) elements.emptyState.style.display = 'flex';
    lastSender = '';
    state.messageIds.clear();

    db.collection('messages')
        .orderBy('timestamp', 'asc')
        .get()
        .then(snapshot => {
            if (elements.emptyState) elements.emptyState.style.display = 'none';

            const promises = [];
            const tempMessages = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (state.blockedUsers.includes(data.sender)) return;

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
                    addMessage(id, data, data.sender === state.currentUser);
                });

                if (snapshot.empty && elements.emptyState) elements.emptyState.style.display = 'flex';
                showRules();
                updateMessageCount();

                setTimeout(() => {
                    if (elements.messages) {
                        elements.messages.scrollTop = elements.messages.scrollHeight;
                    }
                }, 100);
            });
        })
        .catch(err => {
            console.error('❌ خطأ في تحميل الرسائل:', err);
            // محاولة إعادة الاتصال
            setTimeout(loadMessages, 3000);
        });
}

function listenMessages() {
    if (!db) {
        console.error('❌ Firebase غير جاهز للاستماع');
        setTimeout(listenMessages, 2000);
        return;
    }
    
    if (state.unsubscribe) state.unsubscribe();
    lastSender = '';

    state.unsubscribe = db.collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                if (state.blockedUsers.includes(data.sender)) return;

                if (change.type === 'added') {
                    if (!state.messageIds.has(change.doc.id)) {
                        if (!data.avatar) {
                            db.collection('users').doc(data.sender).get()
                                .then(userDoc => {
                                    if (userDoc.exists) {
                                        data.avatar = userDoc.data().avatar || '';
                                    }
                                    addMessage(change.doc.id, data, data.sender === state.currentUser);
                                })
                                .catch(() => {
                                    addMessage(change.doc.id, data, data.sender === state.currentUser);
                                });
                        } else {
                            addMessage(change.doc.id, data, data.sender === state.currentUser);
                        }
                    }
                }

                if (change.type === 'modified') {
                    const existing = elements.messages?.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) {
                        const text = existing.querySelector('.msg-text');
                        if (text) {
                            if (data.deleted) {
                                text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
                            } else if (data.file || data.audio) {
                            } else {
                                text.innerHTML = data.text + (data.edited ? ' <span class="edited-badge">(معدّل)</span>' : '');
                                if (isEmojiOnly(data.text)) text.classList.add('emoji-big');
                                else text.classList.remove('emoji-big');
                            }
                        }
                        const reactionsContainer = existing.querySelector('.msg-reactions');
                        if (reactionsContainer) {
                            reactionsContainer.innerHTML = '';
                            if (data.reactions && Object.keys(data.reactions).length > 0) {
                                Object.keys(data.reactions).forEach(emoji => {
                                    const users = data.reactions[emoji] || [];
                                    const count = users.length;
                                    const reacted = users.includes(state.currentUser);
                                    const reactionEl = document.createElement('button');
                                    reactionEl.className = `msg-reaction${reacted ? ' reacted' : ''}`;
                                    reactionEl.innerHTML = `${emoji} <span class="reaction-count">${count}</span>`;
                                    reactionEl.addEventListener('click', function(e) {
                                        e.stopPropagation();
                                        toggleReaction(change.doc.id, emoji);
                                    });
                                    reactionsContainer.appendChild(reactionEl);
                                });
                            }
                        }
                    }
                }

                if (change.type === 'removed') {
                    const existing = elements.messages?.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) existing.remove();
                    state.messageIds.delete(change.doc.id);
                    updateMessageCount();
                }
            });

            if (snapshot.empty) {
                if (elements.emptyState) elements.emptyState.style.display = 'flex';
            } else {
                if (elements.emptyState) elements.emptyState.style.display = 'none';
            }
        }, error => {
            console.error('❌ خطأ في الاستماع للرسائل:', error);
            // محاولة إعادة الاتصال
            setTimeout(listenMessages, 3000);
        });
}

// ============================================================
// 📤 إرسال الرسالة - تم إصلاحها
// ============================================================
function sendMessage() {
    const raw = elements.msgInput ? elements.msgInput.value.trim() : '';
    if (!raw || !state.isLoggedIn) {
        console.log('⚠️ لا يمكن الإرسال: لا توجد رسالة أو المستخدم غير مسجل');
        return;
    }
    if (state.isMuted) {
        alert('⛔ أنت ممنوع من الكتابة حالياً');
        return;
    }
    if (!db) {
        alert('⚠️ Firebase غير جاهز، يرجى المحاولة مرة أخرى');
        return;
    }
    
    const text = sanitizeInput(raw);
    if (!text) return;
    if (handleBadWord(text, state.currentUser)) {
        if (elements.msgInput) elements.msgInput.value = '';
        return;
    }
    if (state.editingMessage) {
        updateMsg(state.editingMessage.id, text);
        return;
    }

    if (elements.sendBtn) elements.sendBtn.disabled = true;
    if (elements.msgInput) elements.msgInput.disabled = true;

    const data = {
        text: text,
        sender: state.currentUser,
        color: state.userColor,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: state.userIP,
        avatar: state.userAvatarBase64,
        reactions: {}
    };

    if (state.replyTo) {
        data.replyTo = {
            id: state.replyTo.id,
            sender: state.replyTo.sender,
            text: state.replyTo.text.substring(0, 60) + (state.replyTo.text.length > 60 ? '...' : '')
        };
    }

    db.collection('messages').add(data)
        .then(() => {
            if (elements.msgInput) elements.msgInput.value = '';
            if (elements.msgInput) elements.msgInput.focus();
            clearReply();
            state.unreadCount = 0;
            updateNewMsgBadge();
            console.log('✅ تم إرسال الرسالة بنجاح');
        })
        .catch((error) => {
            console.error('❌ فشل الإرسال:', error);
            alert('⚠️ فشل الإرسال: ' + error.message);
        })
        .finally(() => {
            if (elements.sendBtn) elements.sendBtn.disabled = false;
            if (elements.msgInput) elements.msgInput.disabled = false;
        });
}

// ============================================================
// ✏️ تعديل الرسالة
// ============================================================
function startEdit(id, text) {
    state.editingMessage = { id, text };
    if (elements.msgInput) elements.msgInput.value = text;
    if (elements.msgInput) elements.msgInput.focus();
    if (elements.sendBtn) {
        elements.sendBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
        elements.sendBtn.style.background = 'var(--orange)';
    }
}

function updateMsg(id, newText) {
    if (!state.editingMessage) return;
    if (!db) return;
    
    db.collection('messages').doc(id).update({ text: newText, edited: true })
        .then(() => {
            state.editingMessage = null;
            if (elements.sendBtn) {
                elements.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                elements.sendBtn.style.background = '';
            }
            if (elements.msgInput) elements.msgInput.value = '';
        })
        .catch(err => console.error('❌ خطأ في التعديل:', err));
}

// ============================================================
// 🗑️ حذف الرسالة
// ============================================================
function deleteMsg(id) {
    if (!state.isAdmin) return;
    if (!confirm('🗑️ هل أنت متأكد من حذف هذه الرسالة نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;
    if (!db) return;
    
    db.collection('messages').doc(id).delete()
        .then(() => {
            addSystemMessage('🗑️ تم حذف رسالة نهائياً بواسطة المسؤول', 'success');
            state.messageIds.delete(id);
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
    if (!state.isAdmin || !state.isAdminVerified) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع الرسائل نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;
    if (!db) return;

    showLoading(true);
    db.collection('messages').get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        })
        .then(() => {
            addSystemMessage('🗑️ تم حذف جميع الرسائل نهائياً بواسطة المسؤول', 'success');
            if (elements.messages) {
                elements.messages.querySelectorAll('.msg-group, .system-msg, .msg-count').forEach(el => el.remove());
            }
            if (elements.emptyState) elements.emptyState.style.display = 'flex';
            state.messageIds.clear();
            updateMessageCount();
            showLoading(false);
        })
        .catch(err => {
            console.error('❌ خطأ في حذف الدردشة:', err);
            alert('⚠️ فشل حذف الدردشة');
            showLoading(false);
        });
}

if (elements.clearChatBtn) {
    elements.clearChatBtn.addEventListener('click', clearChat);
}

// ============================================================
// 🚫 الحظر
// ============================================================
function blockUser(username) {
    if (!state.isAdmin || username === ADMIN_NAME) return;
    if (!confirm(`🚫 حظر @${username} نهائياً؟`)) return;
    if (!db) return;
    
    if (!state.blockedUsers.includes(username)) {
        state.blockedUsers.push(username);
        db.collection('blocked').doc('list').set({ users: state.blockedUsers })
            .then(() => {
                addSystemMessage(`🚫 @${username} تم حظره بواسطة المسؤول`, 'warning');
                if (elements.messages) {
                    elements.messages.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
                }
                loadAdminUsers();
                updateMessageCount();
            });
    }
}

function unblockUser(username) {
    if (!state.isAdmin) return;
    if (!confirm(`🔓 هل أنت متأكد من فك الحظر عن @${username}؟`)) return;
    if (!db) return;
    
    const index = state.blockedUsers.indexOf(username);
    if (index > -1) {
        state.blockedUsers.splice(index, 1);
        db.collection('blocked').doc('list').set({ users: state.blockedUsers })
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
    if (!state.isAdmin || username === ADMIN_NAME) return;
    if (!confirm(`⚠️ هل أنت متأكد من حذف حساب @${username} بالكامل؟\nسيتم حذف جميع رسائله وبياناته نهائياً.`))
        return;
    if (!db) return;

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
            const index = state.blockedUsers.indexOf(username);
            if (index > -1) {
                state.blockedUsers.splice(index, 1);
                return db.collection('blocked').doc('list').set({ users: state.blockedUsers });
            }
        })
        .then(() => {
            addSystemMessage(`🗑️ تم حذف حساب @${username} بالكامل نهائياً بواسطة المسؤول`, 'success');
            if (elements.messages) {
                elements.messages.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
            }
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
    if (!db) return Promise.resolve([]);
    return db.collection('blocked').doc('list').get()
        .then(doc => {
            state.blockedUsers = (doc.exists && doc.data().users) ? doc.data().users : [];
            return state.blockedUsers;
        })
        .catch(() => {
            state.blockedUsers = [];
            return state.blockedUsers;
        });
}

// ============================================================
// 📋 الإبلاغ
// ============================================================
function reportMsg(id, sender) {
    if (!db) return;
    if (confirm(`📋 الإبلاغ عن @${sender}؟`)) {
        db.collection('reports').add({
            messageId: id,
            sender: sender,
            reportedBy: state.currentUser,
            reportedIP: state.userIP,
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
    state.replyTo = { id, sender, text };
    if (elements.replyPreviewSender) {
        elements.replyPreviewSender.textContent = `@${sender}`;
    }
    if (elements.replyPreviewText) {
        elements.replyPreviewText.textContent = text.substring(0, 80) + (text.length > 80 ? '...' : '');
    }
    if (elements.replyPreview) elements.replyPreview.style.display = 'flex';
    if (elements.msgInput) {
        elements.msgInput.placeholder = 'اكتب ردك...';
        elements.msgInput.focus();
    }
}

function clearReply() {
    state.replyTo = null;
    if (elements.replyPreview) elements.replyPreview.style.display = 'none';
    if (elements.msgInput) elements.msgInput.placeholder = 'اكتب رسالة...';
}

if (elements.replyPreviewCancel) {
    elements.replyPreviewCancel.addEventListener('click', clearReply);
}

if (elements.msgInput) {
    elements.msgInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (state.editingMessage) {
                state.editingMessage = null;
                if (elements.sendBtn) {
                    elements.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                    elements.sendBtn.style.background = '';
                }
                if (elements.msgInput) elements.msgInput.value = '';
            }
            clearReply();
        }
    });
}

// ============================================================
// 👥 قائمة المستخدمين للمسؤول
// ============================================================
function loadAdminUsers() {
    if (!state.isAdmin || !state.isAdminVerified) return;
    if (!db) {
        if (elements.adminUsersList) {
            elements.adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">جاري الاتصال...</div>';
        }
        setTimeout(loadAdminUsers, 2000);
        return;
    }
    
    if (elements.adminUsersList) {
        elements.adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">جاري التحميل...</div>';
    }

    db.collection('users').get()
        .then(snapshot => {
            if (snapshot.empty) {
                if (elements.adminUsersList) {
                    elements.adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">لا يوجد مستخدمون مسجلون</div>';
                }
                return;
            }

            db.collection('users').where('online', '==', true).get()
                .then(onlineSnapshot => {
                    const onlineSet = new Set();
                    onlineSnapshot.forEach(doc => onlineSet.add(doc.id));
                    state.onlineUsers = onlineSet;
                    updateOnlineCount();

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
                                const blocked = state.blockedUsers.includes(data.username);
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
                                            ${vcount > 0 ? `<span style="font-size:9px;color:var(--orange);background:rgba(250,168,26,0.08);padding:0 5px;border-radius:4px;">⚠️ ${vcount}</span>` : ''}
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
                            if (elements.adminUsersList) {
                                elements.adminUsersList.innerHTML = html;
                            }
                        });
                });
        })
        .catch(() => {
            if (elements.adminUsersList) {
                elements.adminUsersList.innerHTML = '<div style="color:var(--red);font-size:12px;">❌ خطأ في التحميل</div>';
            }
        });
}

// ============================================================
// 🚪 تسجيل الخروج القسري
// ============================================================
if (elements.forceLogoutBtn) {
    elements.forceLogoutBtn.addEventListener('click', function() {
        if (!state.isAdmin || !state.isAdminVerified) return;
        if (!confirm('⚠️ هل أنت متأكد من تسجيل خروج جميع المستخدمين؟')) return;
        if (!db) return;

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
}

// ============================================================
// 🚪 تسجيل الخروج
// ============================================================
function logout() {
    if (!confirm('🚪 تسجيل الخروج؟\nسيتم حذف جلسة الدخول من هذا الجهاز.')) return;
    localStorage.removeItem('chat_session');
    performLogout();
}

function performLogout() {
    if (state.currentUser && db) {
        db.collection('users').doc(state.currentUser).update({
            online: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        addSystemMessage(`👋 ${state.currentUser} غادر الدردشة`);
    }

    state.isLoggedIn = false;
    state.currentUser = '';
    state.isAdmin = false;
    state.isAdminVerified = false;

    if (state.unsubscribe) state.unsubscribe();

    if (elements.chatContainer) elements.chatContainer.style.display = 'none';
    if (elements.loginOverlay) elements.loginOverlay.classList.remove('hidden');

    if (elements.messages) {
        elements.messages.innerHTML = `
            <div class="empty-state" id="emptyState">
                <div class="empty-icon"><span class="material-symbols-outlined">chat</span></div>
                <div class="empty-title">لا توجد رسائل</div>
                <div class="empty-sub">كن أول من يكتب ✨</div>
            </div>
        `;
    }

    if (elements.msgInput) elements.msgInput.disabled = true;
    if (elements.sendBtn) {
        elements.sendBtn.disabled = true;
        elements.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        elements.sendBtn.style.background = '';
    }
    clearReply();
    state.editingMessage = null;

    if (elements.infoMsg) {
        elements.infoMsg.textContent = '👋 تم تسجيل الخروج';
        elements.infoMsg.classList.add('show');
        setTimeout(() => {
            if (elements.infoMsg) elements.infoMsg.classList.remove('show');
        }, 2000);
    }

    if (elements.usernameInput) elements.usernameInput.value = '';
    if (elements.loginAdminPasswordBox) elements.loginAdminPasswordBox.style.display = 'none';
    state.isAdminLoginAttempt = false;

    state.userAvatarBase64 = '';
    state.tempAvatarBase64 = '';
    state.messageIds.clear();
    state.unreadCount = 0;
    updateNewMsgBadge();
    state.onlineUsers.clear();
    updateOnlineCount();
}

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', logout);
}

// ============================================================
// 🔍 التحقق من الخروج القسري
// ============================================================
function checkForceLogout() {
    if (state.currentUser && db) {
        db.collection('users').doc(state.currentUser).get()
            .then(doc => {
                if (doc.exists && doc.data().forceLogout === true) {
                    db.collection('users').doc(state.currentUser).update({ forceLogout: false });
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
    if (!db) return;
    db.collection('users').doc(name).set({
        username: name,
        color: state.userColor,
        ip: state.userIP,
        online: true,
        forceLogout: false,
        avatar: state.userAvatarBase64 || '',
        firstSeen: firebase.firestore.FieldValue.serverTimestamp(),
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
            ip: state.userIP,
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
// 🚪 تسجيل الدخول - تم إصلاحها بالكامل
// ============================================================
async function login() {
    console.log('🟢 محاولة تسجيل الدخول...');
    
    if (!db || !auth) {
        console.error('❌ Firebase غير جاهز');
        if (elements.connectionError) {
            elements.connectionError.textContent = '⚠️ جاري تهيئة الاتصال... يرجى المحاولة مرة أخرى';
            elements.connectionError.style.display = 'block';
        }
        // محاولة إعادة التهيئة
        initFirebase();
        setTimeout(() => login(), 2000);
        return;
    }
    
    const raw = elements.usernameInput ? elements.usernameInput.value.trim() : '';
    console.log('📝 الاسم المدخل:', raw);
    
    if (!raw || raw.length < 2) {
        if (elements.loginError) {
            elements.loginError.style.display = 'block';
            elements.loginError.textContent = '⚠️ الاسم يجب أن يكون حرفين على الأقل';
        }
        console.log('❌ خطأ: الاسم قصير جداً');
        return;
    }

    if (raw === ADMIN_NAME) {
        console.log('👑 تم اكتشاف اسم المسؤول');
        const pass = elements.loginAdminPasswordInput ? elements.loginAdminPasswordInput.value.trim() : '';
        console.log('🔑 كلمة المرور المدخلة:', pass ? '****' : '(فارغة)');
        
        if (pass !== ADMIN_PASSWORD) {
            if (elements.loginAdminPasswordError) {
                elements.loginAdminPasswordError.classList.add('show');
            }
            if (elements.loginAdminPasswordInput) {
                elements.loginAdminPasswordInput.value = '';
                elements.loginAdminPasswordInput.focus();
            }
            console.log('❌ خطأ: كلمة مرور غير صحيحة');
            return;
        }
        if (elements.loginAdminPasswordError) {
            elements.loginAdminPasswordError.classList.remove('show');
        }
        console.log('✅ كلمة المرور صحيحة');
    }

    const name = sanitizeInput(raw);
    if (!name) {
        if (elements.loginError) {
            elements.loginError.textContent = '⚠️ اسم غير صالح';
            elements.loginError.style.display = 'block';
        }
        console.log('❌ خطأ: اسم غير صالح');
        return;
    }

    if (elements.loginError) elements.loginError.style.display = 'none';
    if (elements.connectionError) elements.connectionError.style.display = 'none';

    showLoading(true);
    if (elements.loginBtn) {
        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<span class="material-symbols-outlined">progress_activity</span> جاري...';
    }
    console.log('⏳ جاري تسجيل الدخول...');

    try {
        state.userIP = getHashedIP();
        console.log('🔒 IP مشوش:', state.userIP);

        console.log('📡 جاري التحقق من المستخدم في Firestore...');
        const userDoc = await db.collection('users').doc(name).get();
        let avatarBase64 = '';
        if (userDoc.exists && userDoc.data().avatar) {
            avatarBase64 = userDoc.data().avatar;
            console.log('✅ تم العثور على المستخدم مع صورة شخصية');
        } else {
            console.log('ℹ️ مستخدم جديد');
        }

        console.log('🔐 جاري تسجيل الدخول إلى Firebase Auth...');
        try {
            await auth.signInAnonymously();
            console.log('✅ تم تسجيل الدخول إلى Firebase Auth بنجاح');
        } catch (authError) {
            console.error('❌ خطأ في Firebase Auth:', authError);
            throw new Error('فشل تسجيل الدخول إلى Firebase: ' + authError.message);
        }

        state.currentUser = name;
        state.userAvatarBase64 = avatarBase64;
        state.isLoggedIn = true;
        state.isAdmin = (name === ADMIN_NAME);
        state.isMuted = false;
        state.muteCount = 0;
        console.log('👤 المستخدم الحالي:', state.currentUser);
        console.log('👑 هل هو مسؤول؟', state.isAdmin);

        if (state.muteTimeout) clearTimeout(state.muteTimeout);
        if (elements.mutedNotice) elements.mutedNotice.classList.remove('active');

        if (state.isAdmin) {
            if (elements.adminBtn) elements.adminBtn.classList.remove('hidden');
            if (elements.adminBadge) elements.adminBadge.classList.add('show');
            console.log('👑 تم تفعيل أزرار المسؤول');
        } else {
            if (elements.adminBtn) elements.adminBtn.classList.add('hidden');
            if (elements.adminBadge) elements.adminBadge.classList.remove('show');
        }

        console.log('📋 جاري تحميل قائمة المحظورين...');
        await loadBlockedUsers();
        console.log('✅ تم تحميل قائمة المحظورين');

        if (elements.loginOverlay) elements.loginOverlay.classList.add('hidden');
        if (elements.chatContainer) elements.chatContainer.style.display = 'flex';
        console.log('🔄 تم تبديل الشاشات');

        if (elements.msgInput) elements.msgInput.disabled = false;
        if (elements.sendBtn) elements.sendBtn.disabled = false;
        if (elements.msgInput) elements.msgInput.focus();
        console.log('⌨️ تم تفعيل الإدخال');

        updateAllAvatars(avatarBase64, name);
        console.log('🖼️ تم تحديث الصورة الشخصية');

        if (state.isAdmin && db) {
            db.collection('users').doc(name).update({ forceLogout: false }).catch(() => {});
        }

        console.log('🟢 جاري تعيين المستخدم متصل...');
        setUserOnline(name);
        saveSession(name, state.userColor, avatarBase64);
        console.log('✅ تم تعيين المستخدم متصل');

        if (state.isAdmin && db) {
            db.collection('settings').doc('theme').get()
                .then(doc => {
                    if (doc.exists && doc.data().theme) {
                        applyTheme(doc.data().theme);
                        console.log('🎨 تم تحميل الثيم:', doc.data().theme);
                    }
                })
                .catch(() => {});
        }

        if (!userDoc.exists) {
            addSystemMessage(`👋 مرحباً ${name}! هذه أول مرة لك في الغروب`);
            console.log('👋 مستخدم جديد');
        } else if (state.isAdmin) {
            addSystemMessage(`👑 المسؤول ${name} انضم إلى الدردشة`);
            console.log('👑 المسؤول انضم');
        } else {
            addSystemMessage(`👋 ${name} انضم إلى الدردشة`);
            console.log('👋 مستخدم عادي انضم');
        }

        console.log('📨 جاري تحميل الرسائل...');
        loadMessages();
        listenMessages();
        loadBadWords();
        console.log('✅ تم تحميل جميع البيانات');

        if (db) {
            db.collection('users').where('online', '==', true).onSnapshot(snapshot => {
                state.onlineUsers.clear();
                snapshot.forEach(doc => state.onlineUsers.add(doc.id));
                updateOnlineCount();
            });
        }

        window.addEventListener('beforeunload', function() {
            if (state.currentUser && db) {
                db.collection('users').doc(state.currentUser).update({ online: false });
            }
        });

        console.log(`✅ تم تسجيل الدخول بنجاح: ${name}`);
        console.log('🎉 اكتملت عملية تسجيل الدخول!');

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        if (elements.connectionError) {
            elements.connectionError.textContent = `❌ ${error.message}`;
            elements.connectionError.style.display = 'block';
        }
        if (elements.loginBtn) {
            elements.loginBtn.disabled = false;
            elements.loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
        }
        showLoading(false);
        return;
    }

    showLoading(false);
    if (elements.loginBtn) {
        elements.loginBtn.disabled = false;
        elements.loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
    }
    console.log('✅ تم إعادة زر الدخول');
}

// ============================================================
// 🔄 أحداث الدخول
// ============================================================
if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🖱️ تم الضغط على زر الدخول');
        login();
    });
}

if (elements.usernameInput) {
    elements.usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            console.log('⌨️ تم الضغط على Enter في حقل الاسم');
            if (state.isAdminLoginAttempt) {
                if (elements.loginAdminPasswordInput) {
                    elements.loginAdminPasswordInput.focus();
                }
                console.log('👑 تحويل التركيز إلى حقل كلمة المرور');
            } else {
                login();
            }
        }
    });
}

if (elements.loginAdminPasswordInput) {
    elements.loginAdminPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            console.log('⌨️ تم الضغط على Enter في حقل كلمة المرور');
            login();
        }
    });
}

// ============================================================
// 🔄 بدء التشغيل
// ============================================================
function init() {
    console.log('🚀 بدء تشغيل التطبيق...');
    
    loadSavedTheme();
    console.log('🎨 تم تحميل الثيم');
    
    if (elements.infoMsg) {
        elements.infoMsg.textContent = '👋 أدخل اسمك ثم اضغط دخول';
        elements.infoMsg.classList.add('show');
        setTimeout(() => {
            if (elements.infoMsg) elements.infoMsg.classList.remove('show');
        }, 3000);
    }

    const session = checkSession();
    if (session) {
        console.log('💾 تم العثور على جلسة محفوظة:', session.username);
        if (elements.usernameInput) elements.usernameInput.value = session.username || '';
        state.userColor = session.color || '#2b6ef0';
        state.userAvatarBase64 = session.avatar || '';
        document.querySelectorAll('.color-circle').forEach(el => {
            el.classList.toggle('selected', el.dataset.color === state.userColor);
        });
        setTimeout(() => login(), 500);
    } else {
        console.log('ℹ️ لا توجد جلسة محفوظة');
    }
    
    console.log('✅ تم تهيئة التطبيق بنجاح');
}

// ============================================================
// 🖱️ زر التمرير للأسفل
// ============================================================
if (elements.messages) {
    elements.messages.addEventListener('scroll', function() {
        const atBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 50;
        if (elements.scrollBottomBtn) {
            elements.scrollBottomBtn.classList.toggle('show', !atBottom);
        }
        if (atBottom && state.unreadCount > 0) {
            state.unreadCount = 0;
            updateNewMsgBadge();
        }
    });
}

if (elements.scrollBottomBtn) {
    elements.scrollBottomBtn.addEventListener('click', function() {
        if (elements.messages) {
            elements.messages.scrollTo({ top: elements.messages.scrollHeight, behavior: 'smooth' });
        }
        if (state.unreadCount > 0) {
            state.unreadCount = 0;
            updateNewMsgBadge();
        }
    });
}

// ============================================================
// 🔐 حالة المصادقة
// ============================================================
if (auth) {
    auth.onAuthStateChanged(function(user) {
        if (!user && !state.isLoggedIn) {
            console.log('🔐 المستخدم غير مسجل الدخول');
            if (elements.loginOverlay) elements.loginOverlay.classList.remove('hidden');
            if (elements.chatContainer) elements.chatContainer.style.display = 'none';
            showLoading(false);
        } else if (user && state.isLoggedIn) {
            console.log('🔐 المستخدم مسجل الدخول:', user.uid);
        }
    });
}

// ============================================================
// 📤 أحداث الإرسال
// ============================================================
if (elements.sendBtn) {
    elements.sendBtn.addEventListener('click', sendMessage);
}

if (elements.msgInput) {
    elements.msgInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
}

// ============================================================
// 🚀 بدء التطبيق
// ============================================================
state.userIP = getHashedIP();

console.log(`🚀 نيزك ${VERSION} - دردشة متطورة مع جميع الميزات`);
console.log(`👑 المسؤول: ${ADMIN_NAME}`);
console.log(`🔒 كلمة المرور: ${ADMIN_PASSWORD}`);
console.log(`📱 الميزات: سحب للرد • تفاعلات • تعديل • ملفات • صوت • بحث`);
console.log(`🔒 IP مشوش: ${state.userIP}`);

// بدء التطبيق بعد تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 تم تحميل الصفحة بالكامل');
        init();
    });
} else {
    console.log('📄 الصفحة جاهزة بالفعل');
    init();
}

// ============================================================
// 🔄 إعادة المحاولة عند فقدان الاتصال
// ============================================================
setInterval(() => {
    if (!db || !auth) {
        console.log('🔄 محاولة إعادة تهيئة Firebase...');
        initFirebase();
    }
}, 10000);

console.log('✅ تم تحميل التطبيق بالكامل');

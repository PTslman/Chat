// ============================================
// التطبيق الرئيسي - نيزك
// ============================================

import { authManager } from './auth.js';
import { chatManager } from './chat.js';
import { contactsManager } from './contacts.js';
import { adminManager } from './admin.js';
import { 
    formatTime, 
    truncateText, 
    scrollToBottom, 
    getInitials,
    copyToClipboard,
    imageToBase64
} from './utils.js';

// ============================================
// عناصر DOM
// ============================================

const elements = {
    // شاشة التحميل
    loadingScreen: document.getElementById('loading-screen'),
    
    // شاشة الدخول
    authScreen: document.getElementById('auth-screen'),
    chatApp: document.getElementById('chat-app'),
    
    // علامات التبويب
    authTabs: document.querySelectorAll('.auth-tab'),
    userLogin: document.getElementById('user-login'),
    adminLogin: document.getElementById('admin-login'),
    
    // دخول المستخدم
    loginUsername: document.getElementById('login-username'),
    loginBtn: document.getElementById('login-btn'),
    
    // دخول المسؤول
    adminUsername: document.getElementById('admin-username'),
    adminPassword: document.getElementById('admin-password'),
    adminLoginBtn: document.getElementById('admin-login-btn'),
    
    // الشريط الجانبي
    userName: document.getElementById('user-name'),
    userAvatar: document.getElementById('user-avatar'),
    profileImg: document.getElementById('profile-img'),
    userStatusDot: document.getElementById('user-status-dot'),
    userStatusText: document.getElementById('user-status-text'),
    contactsList: document.getElementById('contacts-list'),
    searchInput: document.getElementById('search-contacts'),
    logoutBtn: document.getElementById('logout-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    onlineCountText: document.getElementById('online-count-text'),
    
    // الدردشة
    chatMessages: document.getElementById('chat-messages'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    chatUserName: document.getElementById('chat-user-name'),
    chatUserStatus: document.getElementById('chat-user-status'),
    chatAvatar: document.getElementById('chat-avatar'),
    emojiBtn: document.getElementById('emoji-btn'),
    emojiPicker: document.getElementById('emoji-picker'),
    scrollDownBtn: document.getElementById('scroll-down-btn'),
    newMessagesCount: document.getElementById('new-messages-count'),
    replyBar: document.getElementById('reply-bar'),
    replyText: document.getElementById('reply-text'),
    cancelReply: document.getElementById('cancel-reply'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    searchMessagesBtn: document.getElementById('search-messages-btn'),
    
    // خيارات الرسالة
    messageOptions: document.getElementById('message-options'),
    optionsOverlay: document.getElementById('options-overlay'),
    optionsMenu: document.getElementById('options-menu'),
    
    // نافذة الملف الشخصي
    profileModal: document.getElementById('profile-modal'),
    profilePreviewImg: document.getElementById('profile-preview-img'),
    profileName: document.getElementById('profile-name'),
    colorOptions: document.querySelectorAll('.color-option'),
    avatarInput: document.getElementById('avatar-input'),
    saveProfileBtn: document.getElementById('save-profile-btn'),
    
    // عارض الصور
    imageViewer: document.getElementById('image-viewer'),
    viewerImage: document.getElementById('viewer-image'),
    
    // تفاعلات
    reactionsPopup: document.getElementById('reactions-popup'),
    
    // نتائج البحث
    searchResultsModal: document.getElementById('search-results-modal'),
    searchResultsBody: document.getElementById('search-results-body'),
};

// ============================================
// متغيرات الحالة
// ============================================

let currentContact = null;
let selectedMessageId = null;
let selectedChatId = null;
let isAdmin = false;
let userColor = '#0088cc';
let newMessagesCount = 0;
let isAtBottom = true;

// ============================================
// تهيئة التطبيق
// ============================================

// إخفاء شاشة التحميل بعد 1.5 ثانية
setTimeout(() => {
    elements.loadingScreen.classList.add('hidden');
}, 1500);

// تحميل الثيم المحفوظ
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// تحميل اللون المحفوظ
const savedColor = localStorage.getItem('userColor');
if (savedColor) {
    userColor = savedColor;
    applyUserColor(userColor);
}

// ============================================
// تبديل علامات التبويب
// ============================================

elements.authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabName = tab.dataset.tab;
        if (tabName === 'user') {
            elements.userLogin.classList.add('active');
            elements.adminLogin.classList.remove('active');
        } else {
            elements.adminLogin.classList.add('active');
            elements.userLogin.classList.remove('active');
        }
    });
});

// ============================================
// مراقبة حالة المصادقة
// ============================================

authManager.onAuthStateChanged(async (user) => {
    if (user) {
        elements.authScreen.style.display = 'none';
        elements.chatApp.style.display = 'flex';
        
        isAdmin = authManager.isAdminUser();
        
        // تحميل بيانات المستخدم
        const userData = await authManager.getUserData(user.uid);
        if (userData) {
            elements.userName.textContent = userData.name || user.email?.split('@')[0] || 'مستخدم';
            
            // أيقونة المسؤول
            if (isAdmin) {
                elements.userName.innerHTML = '👑 ' + elements.userName.textContent;
            }
            
            // الصورة الشخصية
            if (userData.photoURL) {
                elements.profileImg.src = userData.photoURL;
            }
            
            // تطبيق اللون
            if (userData.color) {
                userColor = userData.color;
                applyUserColor(userColor);
                localStorage.setItem('userColor', userColor);
            }
        }
        
        // تحميل جهات الاتصال
        contactsManager.setCurrentUser(user);
        contactsManager.loadContacts(renderContacts);
        
        // تحميل الدردشة
        chatManager.setCurrentUser(user);
        
        // تحميل الكلمات المحظورة
        adminManager.loadBannedWords();
        
        // عرض قوانين الغروب لأول مرة
        if (!localStorage.getItem('rulesAccepted')) {
            document.getElementById('rules-modal').style.display = 'flex';
        }
    } else {
        elements.authScreen.style.display = 'flex';
        elements.chatApp.style.display = 'none';
        elements.messageInput.disabled = true;
        elements.sendBtn.disabled = true;
        chatManager.cleanup();
        contactsManager.cleanup();
    }
});

// ============================================
// دوال القوانين
// ============================================

window.closeRules = function() {
    document.getElementById('rules-modal').style.display = 'none';
    localStorage.setItem('rulesAccepted', 'true');
};

// ============================================
// تسجيل دخول المستخدم
// ============================================

elements.loginBtn.addEventListener('click', async () => {
    const username = elements.loginUsername.value.trim();
    
    if (!username || username.length < 2) {
        alert('الرجاء إدخال اسم مستخدم صحيح (حرفين على الأقل)');
        return;
    }
    
    try {
        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
        
        const result = await authManager.quickLogin(username);
        if (!result.success) {
            alert(result.error);
        }
    } catch (error) {
        alert('فشل تسجيل الدخول: ' + error.message);
    } finally {
        elements.loginBtn.disabled = false;
        elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول سريع';
    }
});

// Enter للدخول السريع
elements.loginUsername.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        elements.loginBtn.click();
    }
});

// ============================================
// تسجيل دخول المسؤول
// ============================================

elements.adminLoginBtn.addEventListener('click', async () => {
    const username = elements.adminUsername.value.trim();
    const password = elements.adminPassword.value.trim();
    
    if (!username || !password) {
        alert('الرجاء إدخال اسم المستخدم وكلمة المرور');
        return;
    }
    
    try {
        elements.adminLoginBtn.disabled = true;
        elements.adminLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
        
        const result = await authManager.adminLogin(username, password);
        if (!result.success) {
            alert(result.error);
        } else {
            elements.adminUsername.value = '';
            elements.adminPassword.value = '';
        }
    } catch (error) {
        alert('فشل تسجيل الدخول: ' + error.message);
    } finally {
        elements.adminLoginBtn.disabled = false;
        elements.adminLoginBtn.innerHTML = '<i class="fas fa-crown"></i> دخول المسؤول';
    }
});

// Enter لدخول المسؤول
elements.adminPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        elements.adminLoginBtn.click();
    }
});

// ============================================
// تسجيل الخروج
// ============================================

elements.logoutBtn.addEventListener('click', async () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        await authManager.signOut();
        chatManager.cleanup();
        contactsManager.cleanup();
        elements.chatMessages.innerHTML = '';
        currentContact = null;
        selectedChatId = null;
    }
});

// ============================================
// تبديل الثيم
// ============================================

elements.themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const themes = ['dark', 'light', 'purple', 'forest', 'pink', 'ocean'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = elements.themeToggle.querySelector('i');
    const icons = {
        dark: 'fa-moon',
        light: 'fa-sun',
        purple: 'fa-gem',
        forest: 'fa-tree',
        pink: 'fa-heart',
        ocean: 'fa-water'
    };
    icon.className = 'fas ' + (icons[theme] || 'fa-moon');
}

// ============================================
// تطبيق لون المستخدم
// ============================================

function applyUserColor(color) {
    document.documentElement.style.setProperty('--user-color', color);
    document.documentElement.style.setProperty('--primary', color);
    
    // تحديث ألوان الأزرار
    document.querySelectorAll('.btn-primary').forEach(btn => {
        if (!btn.classList.contains('admin-btn')) {
            btn.style.background = color;
        }
    });
}

// ============================================
// عرض جهات الاتصال
// ============================================

function renderContacts(contacts) {
    const filter = elements.searchInput.value.trim();
    const filtered = contacts.filter(c => 
        c.name.toLowerCase().includes(filter.toLowerCase())
    );
    
    // عدد المتصلين
    const onlineCount = contacts.filter(c => c.status === 'online').length;
    elements.onlineCountText.textContent = `${onlineCount} متصل`;
    
    if (filtered.length === 0) {
        elements.contactsList.innerHTML = `
            <div class="empty-state" style="padding:40px 20px;">
                <i class="fas fa-users" style="font-size:40px;opacity:0.3;display:block;margin-bottom:12px;"></i>
                <p style="color:var(--text-secondary);">${filter ? 'لا توجد نتائج' : 'لا توجد جهات اتصال'}</p>
            </div>
        `;
        return;
    }
    
    elements.contactsList.innerHTML = filtered.map(contact => {
        const isBlocked = contact.isBlocked || false;
        return `
            <div class="contact-item ${currentContact?.uid === contact.uid ? 'active' : ''} ${isBlocked ? 'blocked' : ''}" 
                 data-uid="${contact.uid}">
                <div class="contact-avatar">
                    <img src="${contact.photoURL || 'assets/images/default-avatar.png'}" 
                         alt="${contact.name}" 
                         onerror="this.src='assets/images/default-avatar.png'" />
                    <span class="status-dot ${contact.status === 'online' ? 'online' : 'offline'}"></span>
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name} ${contact.isAdmin ? '👑' : ''}</div>
                    <div class="contact-last-message ${contact.lastMessage === 'تم حذف هذه الرسالة' ? 'deleted' : ''}">
                        ${contact.lastMessage ? truncateText(contact.lastMessage, 30) : 'ابدأ المحادثة'}
                    </div>
                </div>
                <div class="contact-meta">
                    ${contact.lastMessageTime ? 
                        `<span class="contact-time">${formatTime(contact.lastMessageTime)}</span>` : ''}
                    ${contact.unreadCount > 0 ? 
                        `<span class="contact-unread">${contact.unreadCount}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // مستمعي الأحداث
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', () => {
            if (item.classList.contains('blocked')) {
                alert('هذا المستخدم محظور');
                return;
            }
            const uid = item.dataset.uid;
            const contact = filtered.find(c => c.uid === uid);
            if (contact) {
                openChat(contact);
            }
        });
    });
}

// ============================================
// فتح الدردشة
// ============================================

function openChat(contact) {
    currentContact = contact;
    selectedChatId = chatManager.startChat(contact.uid);
    
    // تحديث معلومات الدردشة
    elements.chatUserName.textContent = contact.name + (contact.isAdmin ? ' 👑' : '');
    elements.chatUserStatus.textContent = contact.status === 'online' ? 'متصل' : 'غير متصل';
    elements.chatUserStatus.className = 'chat-user-status ' + (contact.status === 'online' ? 'online' : '');
    elements.chatAvatar.src = contact.photoURL || 'assets/images/default-avatar.png';
    
    // تفعيل الإدخال
    elements.messageInput.disabled = false;
    elements.sendBtn.disabled = false;
    elements.messageInput.focus();
    
    // إلغاء الرد والتعديل
    chatManager.clearReplyTo();
    chatManager.clearEditingMessage();
    elements.replyBar.style.display = 'none';
    
    // تحميل الرسائل
    if (selectedChatId) {
        chatManager.loadMessages(selectedChatId, renderMessages);
    }
    
    // مراقبة حالة المستخدم
    chatManager.monitorUserPresence(contact.uid, (data) => {
        const statusText = data.status === 'online' ? 'متصل' : 'غير متصل';
        elements.chatUserStatus.textContent = statusText;
        elements.chatUserStatus.className = 'chat-user-status ' + (data.status === 'online' ? 'online' : '');
    });
    
    // تحديث العنصر النشط
    document.querySelectorAll('.contact-item').forEach(el => {
        el.classList.toggle('active', el.dataset.uid === contact.uid);
    });
    
    // إعادة تعيين عداد الرسائل الجديدة
    newMessagesCount = 0;
    elements.newMessagesCount.textContent = '0';
    elements.scrollDownBtn.style.display = 'none';
}

// ============================================
// عرض الرسائل
// ============================================

function renderMessages(messages) {
    if (!currentContact) {
        elements.chatMessages.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-dots"></i>
                <h3>ابدأ محادثة جديدة</h3>
                <p>اختر أحد جهات الاتصال للبدء</p>
            </div>
        `;
        return;
    }
    
    if (messages.length === 0) {
        elements.chatMessages.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-smile"></i>
                <h3>لا توجد رسائل</h3>
                <p>ارسل أول رسالة لبدء المحادثة</p>
            </div>
        `;
        return;
    }
    
    const currentUser = authManager.getCurrentUser();
    let lastSender = null;
    let lastTime = null;
    
    elements.chatMessages.innerHTML = messages.map((msg, index) => {
        const isSent = msg.sender === currentUser?.uid;
        const isSystem = msg.type === 'system';
        const isSameSender = index > 0 && messages[index - 1].sender === msg.sender;
        const isSameTime = index > 0 && Math.abs(messages[index - 1].timestamp - msg.timestamp) < 60000;
        const isGrouped = isSameSender && isSameTime;
        
        if (isSystem) {
            return `
                <div class="message system">
                    ${msg.text}
                    <span class="message-time">${formatTime(msg.timestamp)}</span>
                </div>
            `;
        }
        
        // بناء الرسالة
        let html = `<div class="message-wrapper ${isSent ? 'sent' : 'received'} ${isGrouped ? 'grouped' : ''}">`;
        
        // اسم المرسل (لغير المرسل)
        if (!isSent && !isGrouped) {
            html += `<div class="message-sender" style="font-size:12px;color:var(--text-secondary);margin-bottom:2px;">${currentContact?.name || 'مستخدم'}</div>`;
        }
        
        html += `<div class="message ${isSent ? 'sent' : 'received'}" data-message-id="${msg.id}" data-chat-id="${selectedChatId}">`;
        html += `<div class="message-content">`;
        
        // الرد على رسالة
        if (msg.replyTo) {
            html += `
                <div class="message-reply">
                    <div class="message-reply-sender">${msg.replyTo.senderName || 'مستخدم'}</div>
                    <div class="message-reply-text">${truncateText(msg.replyTo.text || '', 40)}</div>
                </div>
            `;
        }
        
        // النص
        html += `<div class="message-text${msg.isEdited ? ' edited' : ''}">${msg.text}</div>`;
        
        // علامة معدل
        if (msg.isEdited) {
            html += `<span class="message-edited-label">(معدّل)</span>`;
        }
        
        // الوقت والحالة
        html += `<span class="message-time">`;
        html += formatTime(msg.timestamp);
        if (isSent) {
            html += `<span class="message-status">`;
            if (msg.status === 'read') {
                html += `<i class="fas fa-check-double"></i>`;
            } else if (msg.status === 'sent') {
                html += `<i class="fas fa-check"></i>`;
            }
            html += `</span>`;
        }
        html += `</span>`;
        
        // التفاعلات
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
            const reactionCounts = {};
            Object.values(msg.reactions).forEach(r => {
                reactionCounts[r] = (reactionCounts[r] || 0) + 1;
            });
            html += `<div class="message-reactions">`;
            Object.entries(reactionCounts).forEach(([reaction, count]) => {
                html += `<span class="message-reaction" data-reaction="${reaction}">${reaction} <span class="message-reaction-count">${count}</span></span>`;
            });
            html += `</div>`;
        }
        
        html += `</div></div></div>`;
        return html;
    }).join('');
    
    // إضافة مستمعي الأحداث للرسائل
    document.querySelectorAll('.message').forEach(msgEl => {
        // ضغط مطول لعرض الخيارات
        let pressTimer = null;
        
        msgEl.addEventListener('mousedown', (e) => {
            pressTimer = setTimeout(() => {
                showMessageOptions(msgEl.dataset.messageId);
            }, 500);
        });
        
        msgEl.addEventListener('mouseup', () => clearTimeout(pressTimer));
        msgEl.addEventListener('mouseleave', () => clearTimeout(pressTimer));
        
        // نقر على الرد
        msgEl.querySelector('.message-reply')?.addEventListener('click', (e) => {
            e.stopPropagation();
            // التمرير للرسالة المراد الرد عليها
        });
        
        // نقر على التفاعل
        msgEl.querySelectorAll('.message-reaction').forEach(reactionEl => {
            reactionEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const reaction = reactionEl.dataset.reaction;
                const messageId = msgEl.dataset.messageId;
                chatManager.addReaction(selectedChatId, messageId, reaction);
            });
        });
    });
    
    // التمرير للأسفل إذا كنا في الأسفل
    if (isAtBottom) {
        scrollToBottom(elements.chatMessages);
    } else {
        // إظهار زر التمرير للأسفل مع عدد الرسائل الجديدة
        newMessagesCount++;
        elements.newMessagesCount.textContent = newMessagesCount;
        elements.scrollDownBtn.style.display = 'flex';
    }
}

// ============================================
// مراقبة التمرير
// ============================================

elements.chatMessages.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = elements.chatMessages;
    isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (isAtBottom) {
        elements.scrollDownBtn.style.display = 'none';
        newMessagesCount = 0;
    }
});

// زر التمرير للأسفل
elements.scrollDownBtn.addEventListener('click', () => {
    scrollToBottom(elements.chatMessages);
    elements.scrollDownBtn.style.display = 'none';
    newMessagesCount = 0;
});

// ============================================
// إرسال رسالة
// ============================================

async function sendMessage() {
    const text = elements.messageInput.value.trim();
    if (!text || !currentContact || !selectedChatId) return;
    
    // فحص الكلمات المحظورة
    const check = adminManager.checkMessageForBannedWords(text);
    if (check.hasBannedWord) {
        alert(`⚠️ الرسالة تحتوي على كلمة محظورة: "${check.word}"`);
        // تسجيل مخالفة
        const user = authManager.getCurrentUser();
        if (user) {
            await adminManager.addViolation(user.uid, 'كلمة محظورة: ' + check.word);
        }
        return;
    }
    
    const result = await chatManager.sendMessage(selectedChatId, text);
    if (result.success) {
        elements.messageInput.value = '';
        elements.messageInput.focus();
        // إخفاء شريط الرد
        elements.replyBar.style.display = 'none';
        chatManager.clearReplyTo();
    } else if (result.blocked) {
        alert('⚠️ هذا المستخدم محظور ولا يمكنك إرسال رسائل له');
    } else {
        alert('فشل إرسال الرسالة: ' + (result.error || 'خطأ غير معروف'));
    }
}

// ============================================
// خيارات الرسالة (الضغط المطول)
// ============================================

function showMessageOptions(messageId) {
    if (!messageId) return;
    selectedMessageId = messageId;
    
    // إظهار القائمة
    elements.messageOptions.style.display = 'block';
    
    // تحديد موقع القائمة
    const msgEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (msgEl) {
        const rect = msgEl.getBoundingClientRect();
        const menu = elements.optionsMenu;
        menu.style.position = 'fixed';
        menu.style.top = Math.min(rect.top - 10, window.innerHeight - menu.offsetHeight - 20) + 'px';
        menu.style.left = Math.min(rect.left + rect.width / 2 - menu.offsetWidth / 2, window.innerWidth - menu.offsetWidth - 20) + 'px';
        menu.style.maxWidth = '220px';
    }
}

// إغلاق خيارات الرسالة
function closeMessageOptions() {
    elements.messageOptions.style.display = 'none';
    selectedMessageId = null;
}

elements.optionsOverlay.addEventListener('click', closeMessageOptions);

// خيارات الرسالة
document.querySelectorAll('.option-item').forEach(item => {
    item.addEventListener('click', async () => {
        const action = item.dataset.action;
        const messageId = selectedMessageId;
        if (!messageId || !selectedChatId) return;
        
        closeMessageOptions();
        
        switch (action) {
            case 'reply':
                // الرد على الرسالة
                const msgEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
                if (msgEl) {
                    const text = msgEl.querySelector('.message-text')?.textContent || '';
                    const sender = currentContact?.name || 'مستخدم';
                    chatManager.setReplyTo({ text, sender, id: messageId });
                    elements.replyText.textContent = truncateText(text, 50);
                    elements.replyBar.style.display = 'flex';
                    elements.messageInput.focus();
                }
                break;
                
            case 'react':
                // إظهار تفاعلات
                const popup = elements.reactionsPopup;
                const rect = item.getBoundingClientRect();
                popup.style.display = 'flex';
                popup.style.position = 'fixed';
                popup.style.top = (rect.top - 60) + 'px';
                popup.style.left = (rect.left - 80) + 'px';
                setTimeout(() => {
                    document.addEventListener('click', () => popup.style.display = 'none', { once: true });
                }, 100);
                break;
                
            case 'copy':
                // نسخ النص
                const msgText = document.querySelector(`.message[data-message-id="${messageId}"] .message-text`)?.textContent;
                if (msgText) {
                    await copyToClipboard(msgText);
                    alert('تم نسخ النص');
                }
                break;
                
            case 'edit':
                // تعديل الرسالة (للمرسل فقط)
                const currentUser = authManager.getCurrentUser();
                const msgData = await getMessageData(selectedChatId, messageId);
                if (msgData && msgData.sender === currentUser?.uid) {
                    const newText = prompt('تعديل الرسالة:', msgData.text);
                    if (newText && newText.trim()) {
                        await chatManager.editMessage(selectedChatId, messageId, newText.trim());
                    }
                } else {
                    alert('لا يمكنك تعديل هذه الرسالة');
                }
                break;
                
            case 'report':
                // إبلاغ عن رسالة
                if (confirm('هل تريد الإبلاغ عن هذه الرسالة؟')) {
                    await chatManager.reportMessage(selectedChatId, messageId, 'مخالفة');
                    alert('تم الإبلاغ عن الرسالة');
                }
                break;
                
            case 'delete':
                // حذف الرسالة (للمسؤول فقط)
                if (isAdmin) {
                    if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
                        await chatManager.deleteMessage(selectedChatId, messageId);
                    }
                } else {
                    alert('فقط المسؤول يمكنه حذف الرسائل');
                }
                break;
        }
    });
});

// الحصول على بيانات رسالة
async function getMessageData(chatId, messageId) {
    // هذه دالة مساعدة، يمكن تنفيذها باستخدام Firebase
    // لكننا سنستخدم البيانات المحلية
    const msgEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (msgEl) {
        const text = msgEl.querySelector('.message-text')?.textContent || '';
        const isSent = msgEl.classList.contains('sent');
        return {
            text: text,
            sender: isSent ? authManager.getCurrentUser()?.uid : currentContact?.uid
        };
    }
    return null;
}

// ============================================
// تفاعلات (Reactions)
// ============================================

document.querySelectorAll('.reaction-item').forEach(item => {
    item.addEventListener('click', async () => {
        const reaction = item.dataset.reaction;
        if (selectedMessageId && selectedChatId) {
            await chatManager.addReaction(selectedChatId, selectedMessageId, reaction);
            elements.reactionsPopup.style.display = 'none';
        }
    });
});

// ============================================
// إلغاء الرد
// ============================================

elements.cancelReply.addEventListener('click', () => {
    elements.replyBar.style.display = 'none';
    chatManager.clearReplyTo();
});

// ============================================
// الإيموجي
// ============================================

elements.emojiBtn.addEventListener('click', () => {
    const picker = elements.emojiPicker;
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    
    // تحديد موقع اللوحة
    const rect = elements.emojiBtn.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
    picker.style.left = Math.min(rect.left - 100, window.innerWidth - 220) + 'px';
});

// إدراج الإيموجي
document.querySelectorAll('.emoji-item').forEach(item => {
    item.addEventListener('click', () => {
        const emoji = item.dataset.emoji;
        const input = elements.messageInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
        elements.emojiPicker.style.display = 'none';
    });
});

// ============================================
// حذف الدردشة (للمسؤول فقط)
// ============================================

elements.clearChatBtn.addEventListener('click', async () => {
    if (!isAdmin) {
        alert('فقط المسؤول يمكنه حذف الدردشة');
        return;
    }
    if (selectedChatId && confirm('هل أنت متأكد من حذف جميع رسائل هذه الدردشة؟')) {
        await chatManager.clearChat(selectedChatId);
        alert('تم حذف الدردشة');
    }
});

// ============================================
// بحث في الرسائل
// ============================================

elements.searchMessagesBtn.addEventListener('click', () => {
    if (!selectedChatId || !currentContact) {
        alert('افتح محادثة أولاً');
        return;
    }
    
    const searchText = prompt('أدخل نص البحث:');
    if (searchText && searchText.trim()) {
        // البحث محلياً في الرسائل
        const messages = document.querySelectorAll('.message');
        const results = [];
        messages.forEach(msg => {
            const text = msg.querySelector('.message-text')?.textContent || '';
            if (text.toLowerCase().includes(searchText.toLowerCase())) {
                results.push(text);
            }
        });
        
        // عرض النتائج
        const body = elements.searchResultsBody;
        if (results.length === 0) {
            body.innerHTML = '<p class="search-empty">لا توجد نتائج</p>';
        } else {
            body.innerHTML = results.map((text, i) => `
                <div class="search-result" style="padding:8px 12px;border-bottom:1px solid var(--border-color);cursor:pointer;" 
                     onclick="scrollToMessage(${i})">
                    <div style="font-weight:500;">${text}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">الرسالة ${i + 1}</div>
                </div>
            `).join('');
        }
        elements.searchResultsModal.style.display = 'flex';
    }
});

// التمرير للرسالة (مساعدة)
window.scrollToMessage = function(index) {
    const messages = document.querySelectorAll('.message');
    if (messages[index]) {
        messages[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        messages[index].style.background = 'var(--primary-light)';
        setTimeout(() => {
            messages[index].style.background = '';
        }, 2000);
    }
    closeSearchResults();
};

function closeSearchResults() {
    elements.searchResultsModal.style.display = 'none';
}
window.closeSearchResults = closeSearchResults;

// ============================================
// نافذة الملف الشخصي
// ============================================

function openProfile() {
    const user = authManager.getCurrentUser();
    if (!user) return;
    
    elements.profileModal.style.display = 'flex';
    elements.profileName.value = elements.userName.textContent.replace('👑 ', '');
    elements.profilePreviewImg.src = elements.profileImg.src || 'assets/images/default-avatar.png';
    
    // تحديث ألوان الخيارات
    elements.colorOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.color === userColor);
    });
}
window.openProfile = openProfile;

function closeProfile() {
    elements.profileModal.style.display = 'none';
}
window.closeProfile = closeProfile;

// اختيار اللون
elements.colorOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        elements.colorOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        userColor = opt.dataset.color;
        applyUserColor(userColor);
    });
});

// رفع الصورة
elements.avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            const base64 = await imageToBase64(file);
            elements.profilePreviewImg.src = base64;
        } catch (error) {
            alert('فشل تحميل الصورة');
        }
    }
});

// حفظ الملف الشخصي
elements.saveProfileBtn.addEventListener('click', async () => {
    const user = authManager.getCurrentUser();
    if (!user) return;
    
    const name = elements.profileName.value.trim();
    if (!name) {
        alert('الرجاء إدخال اسم');
        return;
    }
    
    const data = {
        name: name,
        color: userColor
    };
    
    // إذا تم رفع صورة جديدة
    if (elements.profilePreviewImg.src !== elements.profileImg.src) {
        data.photoURL = elements.profilePreviewImg.src;
    }
    
    const result = await authManager.updateProfileData(user.uid, data);
    if (result.success) {
        elements.userName.textContent = name + (isAdmin ? ' 👑' : '');
        if (data.photoURL) {
            elements.profileImg.src = data.photoURL;
        }
        localStorage.setItem('userColor', userColor);
        closeProfile();
        alert('تم حفظ التغييرات');
    } else {
        alert('فشل حفظ التغييرات: ' + result.error);
    }
});

// ============================================
// عارض الصور
// ============================================

function openImageViewer(src) {
    elements.viewerImage.src = src;
    elements.imageViewer.style.display = 'flex';
}
window.openImageViewer = openImageViewer;

function closeImageViewer() {
    elements.imageViewer.style.display = 'none';
}
window.closeImageViewer = closeImageViewer;

// ============================================
// أحداث إضافية
// ============================================

// زر الإرسال
elements.sendBtn.addEventListener('click', sendMessage);

// Enter للإرسال (Shift+Enter لسطر جديد)
elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Escape لإلغاء الرد أو التعديل
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (elements.replyBar.style.display !== 'none') {
            elements.replyBar.style.display = 'none';
            chatManager.clearReplyTo();
        }
        closeMessageOptions();
        closeProfile();
        closeSearchResults();
        closeImageViewer();
        elements.emojiPicker.style.display = 'none';
    }
});

// النقر خارج الإيموجي لإغلاقه
document.addEventListener('click', (e) => {
    if (!elements.emojiPicker.contains(e.target) && e.target !== elements.emojiBtn) {
        elements.emojiPicker.style.display = 'none';
    }
});

// ============================================
// رسائل النظام
// ============================================

// إرسال رسالة ترحيب عند أول دخول
// يمكن تنفيذها عبر Firebase

// ============================================
// تهيئة نهائية
// ============================================

console.log('🚀 نيزك - نظام مراسلة فوري');
console.log('👑 المسؤول: slx23m | كلمة: 1442');
console.log('📱 تم التحميل بنجاح ✓');
console.log('✨ جميع الميزات جاهزة للاستخدام');

// تصدير بعض الدوال للاستخدام العام
window.sendMessage = sendMessage;
window.openChat = openChat;
window.renderContacts = renderContacts;

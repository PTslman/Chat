export class UIManager {
    constructor(app) {
        this.app = app;
    }

    // ===== شاشة التحميل =====
    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-screen').style.display = 'none';
    }

    // ===== شاشة تسجيل الدخول =====
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('chat-app').style.display = 'none';
        document.getElementById('password-group').style.display = 'none';
        document.getElementById('password').value = '';
    }

    // ===== شاشة إعداد الملف الشخصي =====
    showProfileSetup() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('profile-setup').style.display = 'flex';
        document.getElementById('chat-app').style.display = 'none';
        document.getElementById('display-name').value = this.app.currentUser?.username || '';
    }

    // ===== واجهة الدردشة =====
    showChat() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('chat-app').style.display = 'flex';
        this.updateUserUI();
        this.hideLoading();
    }

    // ===== تحديث واجهة المستخدم =====
    updateUserUI() {
        if (!this.app.currentUser) return;
        
        document.getElementById('user-name').textContent = this.app.currentUser.username;
        
        if (this.app.currentUser.avatar) {
            document.getElementById('user-avatar').src = this.app.currentUser.avatar;
        }
        
        const adminBtn = document.getElementById('admin-panel-btn');
        if (this.app.isAdmin) {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }
        
        if (this.app.currentUser.color) {
            document.documentElement.style.setProperty('--primary', this.app.currentUser.color);
        }
    }

    // ===== تنبيه =====
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ===== الثيم =====
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.querySelector('#theme-toggle .material-symbols-outlined');
        const icons = {
            'dark': 'dark_mode',
            'light': 'light_mode',
            'purple': 'palette',
            'forest': 'park',
            'pink': 'favorite',
            'ocean': 'waves'
        };
        if (icon) icon.textContent = icons[theme] || 'dark_mode';
        localStorage.setItem('theme', theme);
    }

    toggleTheme() {
        const themes = ['dark', 'light', 'purple', 'forest', 'pink', 'ocean'];
        const currentIndex = themes.indexOf(this.app.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.app.currentTheme = themes[nextIndex];
        this.applyTheme(this.app.currentTheme);
    }

    // ===== التمرير =====
    scrollToBottom() {
        const container = document.getElementById('chat-main');
        container.scrollTop = container.scrollHeight;
        this.app.isAtBottom = true;
        document.getElementById('scroll-bottom-btn').style.display = 'none';
    }

    checkScrollPosition() {
        const container = document.getElementById('chat-main');
        const threshold = 100;
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        this.app.isAtBottom = atBottom;
        
        const btn = document.getElementById('scroll-bottom-btn');
        if (!atBottom && this.app.unreadCount > 0) {
            btn.style.display = 'flex';
            document.getElementById('new-messages-badge').textContent = this.app.unreadCount;
        } else {
            btn.style.display = 'none';
        }
    }

    // ===== الإيموجي =====
    toggleEmojiPanel() {
        const panel = document.getElementById('emoji-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    insertEmoji(emoji) {
        const input = document.getElementById('message-input');
        const start = input.selectionStart;
        const text = input.value;
        input.value = text.substring(0, start) + emoji + text.substring(start);
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
        document.getElementById('emoji-panel').style.display = 'none';
        this.autoResizeInput();
    }

    // ===== تغيير حجم الإدخال =====
    autoResizeInput() {
        const input = document.getElementById('message-input');
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    }

    // ===== اختيار لون =====
    selectColor(color) {
        this.app.currentColor = color;
        document.querySelectorAll('.color-item').forEach(el => {
            el.classList.toggle('active', el.dataset.color === color);
        });
        localStorage.setItem('color', color);
    }

    // ===== لوحة المسؤول =====
    openAdminPanel() {
        if (!this.app.isAdmin) return;
        document.getElementById('admin-panel').style.display = 'block';
        this.app.adminManager.loadAllData();
    }

    closeAdminPanel() {
        document.getElementById('admin-panel').style.display = 'none';
    }

    switchAdminTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
        document.getElementById(`${tabId}-tab`)?.classList.add('active');
    }

    // ===== عارض الصور =====
    openImageViewer(imageUrl) {
        document.getElementById('image-viewer').style.display = 'flex';
        document.getElementById('viewer-image').src = imageUrl;
    }

    closeImageViewer() {
        document.getElementById('image-viewer').style.display = 'none';
    }

    // ===== خيارات الرسالة =====
    showMessageOptions(messageId) {
        const message = this.app.messages?.find(m => m.id === messageId);
        if (!message) return;
        
        this.app.selectedMessageId = messageId;
        const menu = document.getElementById('message-options');
        menu.style.display = 'block';
        
        const adminBtns = menu.querySelectorAll('.admin-only');
        if (this.app.isAdmin) {
            adminBtns.forEach(btn => btn.style.display = 'flex');
        } else {
            adminBtns.forEach(btn => btn.style.display = 'none');
        }
        
        const editBtn = document.getElementById('edit-option');
        if (editBtn) {
            editBtn.style.display = message.senderId === this.app.currentUser.id ? 'flex' : 'none';
        }
    }

    closeMessageOptions() {
        document.getElementById('message-options').style.display = 'none';
        document.getElementById('reactions-popup').style.display = 'none';
        this.app.selectedMessageId = null;
    }

    // ===== تفاعلات الرسالة =====
    showReactionsPopup() {
        const popup = document.getElementById('reactions-popup');
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    }

    // ===== إلغاء الرد =====
    cancelReply() {
        this.app.replyTo = null;
        document.getElementById('reply-bar').style.display = 'none';
    }
          }

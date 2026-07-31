// ============================================================
// 🌓 THEME SYSTEM - نيزك v3.5.0
// ============================================================

window.currentTheme = 'dark';

// ============================================================
// APPLY THEME
// ============================================================
window.applyTheme = function(theme) {
    window.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    var themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        if (theme === 'light') {
            themeIcon.textContent = 'light_mode';
        } else {
            themeIcon.textContent = 'dark_mode';
        }
    }

    document.querySelectorAll('.theme-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    try {
        localStorage.setItem('chat_theme', theme);
    } catch (e) {}

    // Save to Firestore if admin
    if (window.isAdmin && window.isAdminVerified && window.db) {
        window.db.collection('settings').doc('theme').set({ theme: theme }).catch(function() {});
    }
};

// ============================================================
// TOGGLE THEME
// ============================================================
window.toggleTheme = function() {
    if (window.currentTheme === 'dark') {
        window.applyTheme('light');
    } else if (window.currentTheme === 'light') {
        window.applyTheme('dark');
    } else {
        window.applyTheme('dark');
    }
};

// ============================================================
// LOAD SAVED THEME
// ============================================================
window.loadSavedTheme = function() {
    try {
        var saved = localStorage.getItem('chat_theme');
        if (saved) {
            window.applyTheme(saved);
            return;
        }
    } catch (e) {}

    if (window.db) {
        window.db.collection('settings').doc('theme').get()
            .then(function(doc) {
                if (doc.exists && doc.data().theme) {
                    window.applyTheme(doc.data().theme);
                } else {
                    window.applyTheme('dark');
                }
            })
            .catch(function() {
                window.applyTheme('dark');
            });
    } else {
        window.applyTheme('dark');
    }
};

console.log('✅ تم تحميل theme.js');}

// ============================================================
// TOGGLE THEME
// ============================================================
function toggleTheme() {
    if (currentTheme === 'dark') {
        applyTheme('light');
    } else if (currentTheme === 'light') {
        applyTheme('dark');
    } else {
        applyTheme('dark');
    }
}

// ============================================================
// LOAD SAVED THEME
// ============================================================
function loadSavedTheme() {
    try {
        var saved = localStorage.getItem('chat_theme');
        if (saved) {
            applyTheme(saved);
            return;
        }
    } catch (e) {}

    if (db) {
        db.collection('settings').doc('theme').get()
            .then(function(doc) {
                if (doc.exists && doc.data().theme) {
                    applyTheme(doc.data().theme);
                } else {
                    applyTheme('dark');
                }
            })
            .catch(function() {
                applyTheme('dark');
            });
    } else {
        applyTheme('dark');
    }
}
// ============================================================
// جعل الدوال عامة
// ============================================================
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.loadSavedTheme = loadSavedTheme;
window.currentTheme = currentTheme;

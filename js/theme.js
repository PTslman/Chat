// ============================================================
// 🌓 THEME SYSTEM - نيزك v3.5.0
// ============================================================

let currentTheme = 'dark';

// ============================================================
// APPLY THEME
// ============================================================
function applyTheme(theme) {
    currentTheme = theme;
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
    if (typeof isAdmin !== 'undefined' && isAdmin && typeof isAdminVerified !== 'undefined' && isAdminVerified) {
        if (db) {
            db.collection('settings').doc('theme').set({ theme: theme }).catch(function() {});
        }
    }
}

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

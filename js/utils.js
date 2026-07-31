// ============================================
// دوال مساعدة - نيزك
// ============================================

// ============================================
// 1. تنسيق الوقت
// ============================================

export function formatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    
    // أقل من دقيقة
    if (diff < 60000) {
        return 'الآن';
    }
    
    // أقل من ساعة
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} دقيقة`;
    }
    
    // اليوم
    if (diff < 86400000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    }
    
    // هذا الأسبوع
    if (diff < 604800000) {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return days[date.getDay()];
    }
    
    // تاريخ كامل
    return date.toLocaleDateString('ar', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// ============================================
// 2. اختصار النص
// ============================================

export function truncateText(text, maxLength = 30) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ============================================
// 3. التحقق من البريد الإلكتروني
// ============================================

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ============================================
// 4. التحقق من قوة كلمة المرور
// ============================================

export function isStrongPassword(password) {
    // 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
}

// ============================================
// 5. إنشاء معرف فريد
// ============================================

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ============================================
// 6. تأخير (لـ async/await)
// ============================================

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 7. الحصول على الحروف الأولى من الاسم
// ============================================

export function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ============================================
// 8. توليد لون عشوائي
// ============================================

export function randomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
        '#FFEAA7', '#DDA0DD', '#F0A500', '#6C5B7B'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ============================================
// 9. التمرير للأسفل
// ============================================

export function scrollToBottom(element) {
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

// ============================================
// 10. منع تكرار النقر (Debounce)
// ============================================

export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// 11. تحديد عدد مرات التنفيذ (Throttle)
// ============================================

export function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// 12. نسخ النص للحافظة
// ============================================

export function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    
    // طريقة بديلة
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
}

// ============================================
// 13. الحصول على حجم الملف بصيغة مقروءة
// ============================================

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// 14. التحقق من وجود عنصر في DOM
// ============================================

export function elementExists(selector) {
    return document.querySelector(selector) !== null;
}

// ============================================
// 15. تصدير افتراضي للمجموعة
// ============================================

export default {
    formatTime,
    truncateText,
    isValidEmail,
    isStrongPassword,
    generateId,
    delay,
    getInitials,
    randomColor,
    scrollToBottom,
    debounce,
    throttle,
    copyToClipboard,
    formatFileSize,
    elementExists
};

// ============================================
// دوال مساعدة - نيزك
// ============================================

// ============================================
// تنسيق الوقت
// ============================================

export function formatTime(date) {
    if (!date) return '';
    if (typeof date === 'string') date = new Date(date);
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return 'الآن';
    }
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} دقيقة`;
    }
    if (diff < 86400000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return days[date.getDay()];
    }
    return date.toLocaleDateString('ar', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// ============================================
// اختصار النص
// ============================================

export function truncateText(text, maxLength = 30) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ============================================
// التحقق من البريد الإلكتروني
// ============================================

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ============================================
// الحصول على الحروف الأولى
// ============================================

export function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ============================================
// توليد لون عشوائي
// ============================================

export function randomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
        '#FFEAA7', '#DDA0DD', '#F0A500', '#6C5B7B'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ============================================
// التمرير للأسفل
// ============================================

export function scrollToBottom(element) {
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

// ============================================
// منع تكرار النقر
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
// تحديد عدد مرات التنفيذ
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
// نسخ للحافظة
// ============================================

export function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
}

// ============================================
// تحويل صورة إلى Base64
// ============================================

export function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsDataURL(file);
    });
}

// ============================================
// تصدير افتراضي
// ============================================

export default {
    formatTime,
    truncateText,
    isValidEmail,
    getInitials,
    randomColor,
    scrollToBottom,
    debounce,
    throttle,
    copyToClipboard,
    imageToBase64
};

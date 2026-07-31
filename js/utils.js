export class Utils {
    constructor(app) {
        this.app = app;
    }

    showToast(message, type = 'info') {
        // إزالة أي توست سابق
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;
        
        // أنماط التوست
        const styles = {
            success: {
                background: '#25D366',
                color: '#fff'
            },
            error: {
                background: '#FF4444',
                color: '#fff'
            },
            info: {
                background: '#34B7F1',
                color: '#fff'
            },
            warning: {
                background: '#FFA500',
                color: '#fff'
            }
        };
        
        const style = styles[type] || styles.info;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${style.background};
            color: ${style.color};
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease;
            max-width: 90%;
            text-align: center;
        `;
        
        document.body.appendChild(toast);
        
        // إضافة أنيميشن
        if (!document.getElementById('toast-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'toast-styles';
            styleEl.textContent = `
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styleEl);
        }
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 200;
                    const MAX_HEIGHT = 200;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    debounce(func, wait) {
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} يوم${days > 1 ? 'ان' : ''}`;
        if (hours > 0) return `${hours} ساعة${hours > 1 ? 'ات' : ''}`;
        if (minutes > 0) return `${minutes} دقيقة${minutes > 1 ? 'ق' : ''}`;
        return 'الآن';
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    isOnline() {
        return navigator.onLine;
    }

    copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve) => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            resolve();
        });
    }

    detectLanguage(text) {
        // كشف اللغة البسيط
        const arabic = /[\u0600-\u06FF]/;
        const english = /[a-zA-Z]/;
        
        if (arabic.test(text) && !english.test(text)) return 'ar';
        if (english.test(text) && !arabic.test(text)) return 'en';
        return 'mixed';
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    validateUsername(username) {
        return /^[a-zA-Z0-9_\u0600-\u06FF]{3,20}$/.test(username);
    }

    sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    getRandomColor() {
        const colors = [
            '#25D366', '#FF6B6B', '#4ECDC4', '#FFE66D',
            '#A8E6CF', '#FF8A5C', '#6C5B7B', '#F8B500',
            '#3498DB', '#E74C3C', '#2ECC71', '#F39C12'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await this.sleep(delay * (i + 1));
                }
            }
        }
        throw lastError;
    }
                  }

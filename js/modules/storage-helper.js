// ============================================
// مساعد التخزين - نيزك
// ============================================

import { storage } from '../js/firebase-config.js';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ============================================
// فئة مساعد التخزين
// ============================================

export class StorageHelper {
    constructor() {
        this.storageRef = storage;
        this.cache = new Map();
    }

    // رفع صورة الملف الشخصي
    async uploadAvatar(userId, file) {
        try {
            // التحقق من نوع الملف
            if (!file.type.startsWith('image/')) {
                return { success: false, error: 'الرجاء رفع صورة فقط' };
            }

            // التحقق من الحجم (حد أقصى 5 ميجابايت)
            if (file.size > 5 * 1024 * 1024) {
                return { success: false, error: 'حجم الصورة كبير جداً (حد أقصى 5 ميجابايت)' };
            }

            const avatarRef = ref(this.storageRef, `avatars/${userId}/profile.jpg`);
            
            // رفع الملف
            const snapshot = await uploadBytes(avatarRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            // تخزين في الكاش
            this.cache.set(`avatar_${userId}`, downloadURL);
            
            return { success: true, url: downloadURL };
        } catch (error) {
            console.error('خطأ في رفع الصورة:', error);
            return { success: false, error: error.message };
        }
    }

    // رفع ملف
    async uploadFile(userId, file, folder = 'files') {
        try {
            // التحقق من الحجم (حد أقصى 20 ميجابايت)
            if (file.size > 20 * 1024 * 1024) {
                return { success: false, error: 'حجم الملف كبير جداً (حد أقصى 20 ميجابايت)' };
            }

            const fileName = `${Date.now()}_${file.name}`;
            const fileRef = ref(this.storageRef, `${folder}/${userId}/${fileName}`);
            
            // رفع الملف
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            return {
                success: true,
                url: downloadURL,
                fileName: fileName,
                fileSize: file.size,
                fileType: file.type
            };
        } catch (error) {
            console.error('خطأ في رفع الملف:', error);
            return { success: false, error: error.message };
        }
    }

    // حذف ملف
    async deleteFile(path) {
        try {
            const fileRef = ref(this.storageRef, path);
            await deleteObject(fileRef);
            
            // حذف من الكاش
            this.cache.delete(path);
            
            return { success: true };
        } catch (error) {
            console.error('خطأ في حذف الملف:', error);
            return { success: false, error: error.message };
        }
    }

    // الحصول على URL للصورة
    async getAvatarUrl(userId) {
        // التحقق من الكاش
        const cacheKey = `avatar_${userId}`;
        if (this.cache.has(cacheKey)) {
            return { success: true, url: this.cache.get(cacheKey) };
        }

        try {
            const avatarRef = ref(this.storageRef, `avatars/${userId}/profile.jpg`);
            const url = await getDownloadURL(avatarRef);
            
            // تخزين في الكاش
            this.cache.set(cacheKey, url);
            
            return { success: true, url: url };
        } catch (error) {
            // الصورة غير موجودة، استخدام الصورة الافتراضية
            return { success: false, error: 'الصورة غير موجودة' };
        }
    }

    // جلب جميع ملفات المستخدم
    async getUserFiles(userId, folder = 'files') {
        try {
            const folderRef = ref(this.storageRef, `${folder}/${userId}`);
            const listResult = await listAll(folderRef);
            
            const files = await Promise.all(listResult.items.map(async (item) => {
                const url = await getDownloadURL(item);
                return {
                    name: item.name,
                    url: url,
                    fullPath: item.fullPath
                };
            }));
            
            return { success: true, files };
        } catch (error) {
            console.error('خطأ في جلب الملفات:', error);
            return { success: false, error: error.message, files: [] };
        }
    }

    // تنظيف الكاش
    clearCache() {
        this.cache.clear();
    }

    // حذف جميع ملفات المستخدم
    async deleteAllUserFiles(userId) {
        try {
            // جلب جميع الملفات
            const result = await this.getUserFiles(userId);
            if (!result.success) return result;

            // حذف كل ملف
            const deletePromises = result.files.map(file => 
                this.deleteFile(file.fullPath)
            );
            
            await Promise.all(deletePromises);
            return { success: true };
        } catch (error) {
            console.error('خطأ في حذف جميع الملفات:', error);
            return { success: false, error: error.message };
        }
    }
}

// تصدير نسخة واحدة
export const storageHelper = new StorageHelper();

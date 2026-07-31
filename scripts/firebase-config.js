import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    onChildAdded, 
    set, 
    remove, 
    update, 
    get, 
    child, 
    query, 
    orderByChild, 
    limitToLast,
    onValue,
    onChildRemoved,
    onChildChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAmEzziPwReETciyHcqUsThKmmwonH9FK0",
    authDomain: "nezak-b7284.firebaseapp.com",
    projectId: "nezak-b7284",
    storageBucket: "nezak-b7284.firebasestorage.app",
    messagingSenderId: "242982946613",
    appId: "1:242982946613:web:b77d5f65b0204bff042e7c",
    measurementId: "G-66MHWVRSQY"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// تصدير جميع الدوال المطلوبة
export { 
    database, 
    ref, 
    push, 
    onChildAdded, 
    set, 
    remove, 
    update, 
    get, 
    child, 
    query, 
    orderByChild, 
    limitToLast,
    onValue,
    onChildRemoved,
    onChildChanged
};

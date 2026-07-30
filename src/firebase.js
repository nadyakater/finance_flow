import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 1.GÜN - React projesinin Firebase bağlantı ayarları oluşturuldu.
const firebaseConfig = {
  apiKey: "AIzaSyBzvKeoGpXdiN0hF-PsHXbyUMVaFvFHhcY",
  authDomain: "finance-flow-dc017.firebaseapp.com",
  projectId: "finance-flow-dc017",
  storageBucket: "finance-flow-dc017.firebasestorage.app",
  messagingSenderId: "949092259370",
  appId: "1:949092259370:web:184ac1804c36ef70fa9553",
};

// Firebase uygulaması başlatıldı.
const app = initializeApp(firebaseConfig);

// Giriş işlemleri için Authentication bağlantısı oluşturuldu.
export const auth = getAuth(app);

// Kullanıcı verileri için Firestore bağlantısı oluşturuldu.
export const db = getFirestore(app);
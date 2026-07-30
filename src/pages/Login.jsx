// src/pages/Login.jsx

import { useState } from "react";

import { signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 1.GÜN - E-posta ve şifre ile Firebase giriş işlemi oluşturuldu.
  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      alert("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    try {
      setIsLoggingIn(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password,
      );

      const user = userCredential.user;
      const userReference = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userReference);

      // 1.GÜN - Giriş yapan kullanıcı Firestore users koleksiyonuna kaydedildi.
      if (!userSnapshot.exists()) {
        await setDoc(userReference, {
          id: user.uid,
          ownerId: user.uid,
          email: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userReference, {
          email: user.email,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Giriş hatası:", error);

      if (error.code === "auth/invalid-credential") {
        alert("E-posta veya şifre hatalı.");
      } else if (error.code === "auth/too-many-requests") {
        alert("Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.");
      } else {
        alert("Giriş yapılırken bir hata oluştu.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="page-container">
      <div className="login-card">
        <h1 className="page-title">FinanceFlow</h1>

        <p className="page-description">Hesabınıza giriş yapın</p>

        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="email">
            E-posta
          </label>

          <input
            id="email"
            className="form-input"
            type="email"
            placeholder="E-posta adresinizi girin"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="form-label" htmlFor="password">
            Şifre
          </label>

          <input
            id="password"
            className="form-input"
            type="password"
            placeholder="Şifrenizi girin"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button className="login-button" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

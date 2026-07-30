// src/App.js

import { useEffect, useState } from "react";

import { onAuthStateChanged, signOut } from "firebase/auth";

import "./App.css";

import { auth } from "./firebase";

import Login from "./pages/Login";
import Anasayfa from "./pages/Anasayfa";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1.GÜN - Firebase oturumu kontrol edilerek giriş durumu takip edildi.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1.GÜN - Firebase üzerinden güvenli çıkış işlemi oluşturuldu.
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Çıkış hatası:", error);
      alert("Çıkış yapılırken bir hata oluştu.");
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <p className="page-description">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {currentUser ? (
        <Anasayfa
          email={currentUser.email}
          onLogout={handleLogout}
        />
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
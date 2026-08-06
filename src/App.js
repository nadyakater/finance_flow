import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import "./App.css";

import { startAuthSubscription } from "./features/auth/application/authSubscription";

import {
  selectAuthInitialized,
  selectCurrentUser,
} from "./features/auth/presentation/authSelectors";

import Admin from "./pages/Admin";
import Anasayfa from "./pages/Anasayfa";
import Login from "./pages/Login";

function App() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const isInitialized = useSelector(
    selectAuthInitialized,
  );

  const [currentPage, setCurrentPage] = useState("home");

  // 1.GÜN - Uygulama açıldığında Firebase oturum kontrolü başlatıldı.
  useEffect(() => {
    const unsubscribe = dispatch(
      startAuthSubscription(),
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [dispatch]);

  // 10.GÜN - Kullanıcı çıkış yaptığında ekranın ana sayfa durumuna dönmesi sağlandı.
  useEffect(() => {
    if (!currentUser) {
      setCurrentPage("home");
    }
  }, [currentUser]);

  if (!isInitialized) {
    return (
      <div className="page-container">
        <p className="page-description">
          Yükleniyor...
        </p>
      </div>
    );
  }

  const renderAuthenticatedPage = () => {
    if (currentPage === "admin") {
      return (
        <Admin
          onNavigateHome={() =>
            setCurrentPage("home")
          }
        />
      );
    }

    return (
      <Anasayfa
        onNavigateAdmin={() =>
          setCurrentPage("admin")
        }
      />
    );
  };

  return (
    <div className="App">
      {currentUser
        ? renderAuthenticatedPage()
        : <Login />}
    </div>
  );
}

export default App;
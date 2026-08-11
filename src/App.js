import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import "./App.css";

import { startAuthSubscription } from "./features/auth/application/authSubscription";

import {
  selectAuthInitialized,
  selectCurrentUser,
} from "./features/auth/presentation/authSelectors";

import Dashboard from "./features/dashboard/Dashboard";

import Admin from "./pages/Admin";
import Anasayfa from "./pages/Anasayfa";
import Login from "./pages/Login";

import {
  logoutUser,
} from "./features/auth/application/authThunks";

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

  // =====================================================
  // 12.GÜN - 3.19
  //
  // Kullanıcı oturum açtıktan sonra Dashboard sayfasının
  // uygulama içerisinde görüntülenebilmesi sağlandı.
  // =====================================================

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
    // =====================================================
    // 12.GÜN - 3.19
    //
    // currentPage değeri dashboard olduğunda Dashboard
    // componentinin gösterilmesi sağlandı.
    // =====================================================

    if (currentPage === "dashboard") {
      return (
        <Dashboard
          onNavigateHome={() =>
            setCurrentPage("home")
          }
        />
      );
    }

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

        // =====================================================
        // 12.GÜN - 3.19
        //
        // Dashboard sayfasına geçiş yapılabilmesi için
        // Anasayfa componentine navigation fonksiyonu gönderildi.
        // =====================================================

        onNavigateDashboard={() =>
          setCurrentPage("dashboard")
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
import { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";

import "./App.css";

import { startAuthSubscription } from "./features/auth/application/authSubscription";

import {
  selectAuthInitialized,
  selectCurrentUser,
} from "./features/auth/presentation/authSelectors";

import Anasayfa from "./pages/Anasayfa";
import Login from "./pages/Login";

function App() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);
  const isInitialized = useSelector(
    selectAuthInitialized,
  );

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

  if (!isInitialized) {
    return (
      <div className="page-container">
        <p className="page-description">
          Yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="App">
      {currentUser ? <Anasayfa /> : <Login />}
    </div>
  );
}

export default App;
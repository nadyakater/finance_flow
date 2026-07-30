import { useDispatch, useSelector } from "react-redux";

import { logoutUser } from "../features/auth/application/authThunks";

import {
  selectAuthStatus,
  selectCurrentUser,
} from "../features/auth/presentation/authSelectors";

function Anasayfa() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);
  const authStatus = useSelector(selectAuthStatus);

  const isLoggingOut = authStatus === "loading";

  // 1.GÜN - Çıkış butonu Redux thunk ile Firebase çıkış işlemine bağlandı.
  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  return (
    <div className="page-container">
      <div className="welcome-card">
        <h1 className="welcome-title">Hoş Geldiniz</h1>

        <p className="page-description">
          FinanceFlow ana sayfasına giriş yapıldı.
        </p>

        <p className="user-email">{currentUser?.email}</p>

        <button
          className="logout-button"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Çıkış Yapılıyor..." : "Çıkış Yap"}
        </button>
      </div>
    </div>
  );
}

export default Anasayfa;

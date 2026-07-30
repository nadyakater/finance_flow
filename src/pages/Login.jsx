import { useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { loginUser } from "../features/auth/application/authThunks";

import {
  selectAuthError,
  selectAuthStatus,
} from "../features/auth/presentation/authSelectors";

import { clearAuthError } from "../features/auth/presentation/authSlice";

function Login() {
  const dispatch = useDispatch();

  const authStatus = useSelector(selectAuthStatus);
  const authError = useSelector(selectAuthError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLoggingIn = authStatus === "loading";

  // 1.GÜN - Giriş formu Redux thunk ile Firebase giriş işlemine bağlandı.
  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      alert("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    await dispatch(
      loginUser({
        email: cleanEmail,
        password,
      }),
    );
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);

    if (authError) {
      dispatch(clearAuthError());
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);

    if (authError) {
      dispatch(clearAuthError());
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
            onChange={handleEmailChange}
            autoComplete="email"
            disabled={isLoggingIn}
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
            onChange={handlePasswordChange}
            autoComplete="current-password"
            disabled={isLoggingIn}
          />

          {authError && <p className="form-error">{authError}</p>}

          <button className="login-button" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

import { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 1.GÜN - E-posta ve şifre alanlarından oluşan giriş formu oluşturuldu.
  // deneme yorum satırı
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email || !password) {
      alert("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    onLogin();
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

          <button className="login-button" type="submit">
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

// src/pages/Anasayfa.jsx

function Anasayfa({ email, onLogout }) {
  // 1.GÜN - Giriş yapan kullanıcının e-posta bilgisi ana sayfada gösterildi.
  return (
    <div className="page-container">
      <div className="welcome-card">
        <h1 className="welcome-title">Hoş Geldiniz</h1>

        <p className="page-description">
          FinanceFlow ana sayfasına giriş yapıldı.
        </p>

        <p className="user-email">{email}</p>

        <button className="logout-button" type="button" onClick={onLogout}>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}

export default Anasayfa;

function Anasayfa({ onLogout }) {
  // 1.GÜN - Giriş işleminden sonra gösterilecek ana sayfa oluşturuldu.

  return (
    <div className="page-container">
      <div className="welcome-card">
        <h1 className="welcome-title">Hoş Geldiniz</h1>

        {/* Anasayfa yorum satırı */}
        <p className="page-description">
          FinanceFlow ana sayfasına giriş yapıldı :).
        </p>

        <button className="logout-button" onClick={onLogout}>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}

export default Anasayfa;
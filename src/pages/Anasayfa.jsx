function Anasayfa() {
  // 1.GÜN - Giriş işleminden sonra gösterilecek ana sayfa oluşturuldu.
  return (
    <div className="page-container">
      <div className="welcome-card">
        <h1 className="welcome-title">Hoş Geldiniz</h1>
//anasayfa yorum satırı
        <p className="page-description">
          FinanceFlow ana sayfasına giriş yapıldı :).
        </p>
      </div>
    </div>
  );
}

export default Anasayfa;

// =====================================================
// 6.GÜN
// Finans özet kartlarının görünüm katmanı.
// Toplamlar transactionSelectors üzerinden gelir.
// =====================================================

function FinanceSummary({
  totalIncomeMinor,
  netExpenseMinor,
  totalRefundMinor,
  netBalanceMinor,
  formatAmount,
}) {
  return (
    <section className="category-management-section">
      {/* 10.GÜN - Finans özeti başlığındaki gün ifadesi kaldırıldı. */}
      <h2 className="section-title">Finans Özeti</h2>

      <div className="category-form-grid">
        <div className="category-action-panel">
          <p className="selected-category-text">Toplam Gelir</p>
          <strong>{formatAmount(totalIncomeMinor)} ₺</strong>
        </div>

        <div className="category-action-panel">
          <p className="selected-category-text">İade Sonrası Gider</p>
          <strong>{formatAmount(netExpenseMinor)} ₺</strong>
        </div>

        <div className="category-action-panel">
          <p className="selected-category-text">Toplam İade</p>
          <strong>{formatAmount(totalRefundMinor)} ₺</strong>
        </div>

        <div className="category-action-panel">
          <p className="selected-category-text">Net Bakiye</p>
          <strong>{formatAmount(netBalanceMinor)} ₺</strong>
        </div>
      </div>
    </section>
  );
}

export default FinanceSummary;

import { useSelector } from "react-redux";

import {
  selectActiveReportingPeriodSummary,
} from "../../../reporting/presentation/reportingSelectors";


// =====================================================
// 6.GÜN
// Finans özet kartlarının görünüm katmanı.
// Toplamlar transactionSelectors üzerinden gelir.
// =====================================================


// =====================================================
// DÜZENLEME
// Finans özetine kredi kartlarının güncel ve gelecek
// taksit yükünü gösteren toplam borç kartı eklendi.
// =====================================================


// =====================================================
// 11.GÜN
// Finans özetinin hangi finansal döneme ait olduğunu
// kullanıcıya göstermek için aktif raporlama dönemi
// bilgisi Redux üzerinden alınır.
// =====================================================


function formatReportingDate(dateValue) {
  // =====================================================
  // 11.GÜN
  // Tarih bilgisi henüz oluşmamışsa kullanıcıya
  // geçersiz tarih göstermek yerine "-" gösterilir.
  // =====================================================

  if (!dateValue) {
    return "-";
  }

  return new Date(
    `${dateValue}T00:00:00`,
  ).toLocaleDateString(
    "tr-TR",
  );
}


function FinanceSummary({
  totalIncomeMinor,
  netExpenseMinor,
  totalRefundMinor,
  netBalanceMinor,
  totalDebtMinor,
  formatAmount,
}) {
  // =====================================================
  // 11.GÜN
  // Aktif finansal dönemin adı ile başlangıç ve
  // bitiş tarihleri Redux üzerinden alınır.
  // =====================================================

  const activeReportingPeriod =
    useSelector(
      selectActiveReportingPeriodSummary,
    );

  const hasReportingPeriod =
    Boolean(
      activeReportingPeriod.startDate &&
      activeReportingPeriod.endDate,
    );

  return (
    <section>
      {/* 10.GÜN - Finans özeti başlığındaki gün ifadesi kaldırıldı. */}

      <h2 className="section-title">
        Finans Özeti
      </h2>


      {/* =====================================================
          11.GÜN
          Finans özetinin hangi tarih aralığına göre
          hesaplandığı kullanıcıya gösterilir.
          ===================================================== */}

      <div className="category-action-panel">
        <p className="selected-category-text">
          Aktif Finansal Dönem
        </p>

        <strong>
          {activeReportingPeriod.title}
        </strong>

        {hasReportingPeriod ? (
          <p className="page-description">
            {formatReportingDate(
              activeReportingPeriod.startDate,
            )}
            {" - "}
            {formatReportingDate(
              activeReportingPeriod.endDate,
            )}
          </p>
        ) : (
          <p className="empty-message">
            Aktif finansal dönem henüz hesaplanamadı.
          </p>
        )}

        {/* =====================================================
            11.GÜN
            Dönem seçimi kayıtların gerçek işlem tarihlerini
            değiştirmez. Yalnızca raporlama hesabını etkiler.
            ===================================================== */}

        <p className="page-description">
          Dönem seçimi finansal kayıtların işlem
          tarihlerini değiştirmez.
        </p>
      </div>


      <div className="category-form-grid">
        {/* =====================================================
            11.GÜN
            Toplam gelir aktif finansal döneme göre hesaplanır.
            ===================================================== */}

        <div className="category-action-panel">
          <p className="selected-category-text">
            Toplam Gelir
          </p>

          <strong>
            {formatAmount(
              totalIncomeMinor,
            )}{" "}
            ₺
          </strong>
        </div>


        {/* =====================================================
            11.GÜN
            İade sonrası gider aktif finansal döneme göre
            hesaplanır.
            ===================================================== */}

        <div className="category-action-panel">
          <p className="selected-category-text">
            İade Sonrası Gider
          </p>

          <strong>
            {formatAmount(
              netExpenseMinor,
            )}{" "}
            ₺
          </strong>
        </div>


        {/* =====================================================
            11.GÜN
            Toplam iade aktif finansal döneme göre hesaplanır.
            ===================================================== */}

        <div className="category-action-panel">
          <p className="selected-category-text">
            Toplam İade
          </p>

          <strong>
            {formatAmount(
              totalRefundMinor,
            )}{" "}
            ₺
          </strong>
        </div>


        {/* =====================================================
            11.GÜN
            Net bakiye aktif dönem gelir ve giderlerinden
            hesaplanır.
            ===================================================== */}

        <div className="category-action-panel">
          <p className="selected-category-text">
            Net Bakiye
          </p>

          <strong>
            {formatAmount(
              netBalanceMinor,
            )}{" "}
            ₺
          </strong>
        </div>


        {/* =====================================================
            DÜZENLEME
            Güncel ve gelecek kredi kartı taksitleri toplam
            borç olarak gösterilmeye devam eder.
            ===================================================== */}

        <div className="category-action-panel">
          <p className="selected-category-text">
            Toplam Borç
          </p>

          <strong>
            {formatAmount(
              totalDebtMinor,
            )}{" "}
            ₺
          </strong>
        </div>
      </div>
    </section>
  );
}

export default FinanceSummary;
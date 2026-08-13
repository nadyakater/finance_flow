import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { calculateDashboard } from "../application/dashboardThunks";

import { clearDashboardFilters, setDashboardFilter } from "./dashboardSlice";

import {
  selectDashboardDrillDownTransactions,
  selectDashboardError,
  selectDashboardFilters,
  selectDashboardStatus,
  selectFilteredDashboardTransactions,
  selectNetCashFlow,
  selectSavingsRate,
  selectSelectedChartTransactionType,
  selectTotalExpense,
  selectTotalIncome,
  selectTotalRefunds,
} from "./dashboardSelectors";

import { selectActiveCategories } from "../../categories/presentation/categorySelectors";

import {
  selectBranches,
  selectBrands,
  selectMerchants,
  selectProducts,
} from "../../catalog/presentation/catalogSelectors";

import { selectActiveCreditCards } from "../../creditCards/presentation/creditCardSelectors";

import { selectActiveReportingPeriodSummary } from "../../reporting/presentation/reportingSelectors";

import IncomeExpenseChart from "./components/IncomeExpenseChart";
import CategoryExpenseChart from "./components/CategoryExpenseChart";
import ProductPriceChart from "./components/ProductPriceChart";

// =====================================================
// 12.GÜN - 3.19
// Dashboard ve analizler ekranı.
// =====================================================

export default function Dashboard({ onNavigateHome, onLogout }) {
  const dispatch = useDispatch();

  const [filtersOpen, setFiltersOpen] = useState(false);

  // 12.GÜN - 3.20 - Dashboard filtrelerine uygun işlemler Redux selector üzerinden alınır.
  const filteredTransactions = useSelector(selectFilteredDashboardTransactions);

  // 12.GÜN - 3.20 - Grafikte seçilen işlem türü ve ilgili kayıtlar drill-down alanı için alınır.
  const selectedChartTransactionType = useSelector(
    selectSelectedChartTransactionType,
  );

  const drillDownTransactions = useSelector(
    selectDashboardDrillDownTransactions,
  );

  // =====================================================
  // 12.GÜN - 3.19
  // Dashboard finansal değerleri alınır.
  // =====================================================

  const totalIncome = useSelector(selectTotalIncome);

  const totalExpense = useSelector(selectTotalExpense);

  const totalRefunds = useSelector(selectTotalRefunds);

  const netCashFlow = useSelector(selectNetCashFlow);

  const savingsRate = useSelector(selectSavingsRate);

  const dashboardStatus = useSelector(selectDashboardStatus);

  const dashboardError = useSelector(selectDashboardError);

  // 12.GÜN - 3.20 - Dashboard filtreleri ve filtre seçenekleri Redux içerisinden alınır.
  const filters = useSelector(selectDashboardFilters);

  const activeCategories = useSelector(selectActiveCategories);

  const merchants = useSelector(selectMerchants);

  const branches = useSelector(selectBranches);

  const brands = useSelector(selectBrands);

  const products = useSelector(selectProducts);

  const activeCreditCards = useSelector(selectActiveCreditCards);

  const activeReportingPeriodSummary = useSelector(
    selectActiveReportingPeriodSummary,
  );

  // 12.GÜN - 3.20 - Firma seçildiğinde yalnızca ilgili firmanın şubeleri gösterilir.
  const filteredBranches = useMemo(() => {
    if (!filters.merchantId) {
      return branches;
    }

    return branches.filter(
      (branch) => branch.merchantId === filters.merchantId,
    );
  }, [branches, filters.merchantId]);

  // 12.GÜN - 3.20 - Marka seçildiğinde yalnızca ilgili markanın ürünleri gösterilir.
  const filteredProducts = useMemo(() => {
    if (!filters.brandId) {
      return products;
    }

    return products.filter((product) => product.brandId === filters.brandId);
  }, [filters.brandId, products]);

  // 12.GÜN - 3.20 - Filtrelenen işlemler değiştiğinde Dashboard finansal değerleri yeniden hesaplanır.
  useEffect(() => {
    dispatch(calculateDashboard(filteredTransactions));
  }, [dispatch, filteredTransactions]);

  // =====================================================
  // 12.GÜN - 3.19
  // Para değerleri TL formatına çevrilir.
  // =====================================================

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(Number(value || 0));
  };

  // 12.GÜN - 3.20 - Kuruş cinsindeki işlem tutarları TL biçiminde gösterilir.
  const formatMinorCurrency = (value) => {
    return formatCurrency(Number(value || 0) / 100);
  };

  // 12.GÜN - 3.20 - Drill-down işlem tarihi Türkçe tarih biçiminde gösterilir.
  const formatTransactionDate = (transaction) => {
    const dateValue = transaction.transactionDate || transaction.createdAtUtc;

    if (!dateValue) {
      return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString("tr-TR");
  };

  // 12.GÜN - 3.20 - İşlem kategorisi kullanıcıya kategori yolu ile gösterilir.
  const getTransactionCategoryLabel = (transaction) => {
    if (transaction.categoryPath) {
      return transaction.categoryPath;
    }

    if (transaction.category) {
      return transaction.category;
    }

    const lines = Array.isArray(transaction.lines) ? transaction.lines : [];

    if (lines.length === 0) {
      return "-";
    }

    const categoryLabels = [
      ...new Set(
        lines
          .map((line) => line.categoryPath || line.category || "")
          .filter(Boolean),
      ),
    ];

    return categoryLabels.join(", ") || "-";
  };

  // 12.GÜN - 3.20 - Kullanıcının değiştirdiği Dashboard filtresi Redux içerisinde güncellenir.
  const handleFilterChange = (name, value) => {
    dispatch(
      setDashboardFilter({
        name,
        value,
      }),
    );
  };

  // 12.GÜN - 3.20 - Firma değiştiğinde önceki şube seçimi temizlenir.
  const handleMerchantChange = (event) => {
    handleFilterChange("merchantId", event.target.value);

    handleFilterChange("branchId", "");
  };

  // 12.GÜN - 3.20 - Marka değiştiğinde önceki ürün seçimi temizlenir.
  const handleBrandChange = (event) => {
    handleFilterChange("brandId", event.target.value);

    handleFilterChange("productId", "");
  };

  // 12.GÜN - 3.20 - Aktif finansal dönem ile özel tarih aralığı arasında seçim yapılır.
  const handlePeriodModeChange = (event) => {
    const useActiveReportingPeriod = event.target.value === "active";

    handleFilterChange("useActiveReportingPeriod", useActiveReportingPeriod);

    if (useActiveReportingPeriod) {
      handleFilterChange("startDate", "");

      handleFilterChange("endDate", "");
    }
  };

  return (
    <div className="page-container dashboard-page-container analytics-page app-shell">
      <main className="welcome-card transaction-card main-workspace analytics-workspace">
        <header className="dashboard-header app-topbar">
          <div className="dashboard-header-content">
            <span className="app-eyebrow">FinanceFlow · Analiz</span>
            <h1 className="welcome-title">Finansal Dashboard</h1>

            <p className="page-description">
              Finansal özet ve analizlerinizi buradan takip edebilirsiniz.
            </p>
          </div>

          <div className="dashboard-header-actions">
            {onNavigateHome && (
              <button
                className="admin-button"
                type="button"
                onClick={onNavigateHome}
              >
                ← Anasayfaya Dön
              </button>
            )}

            {onLogout && (
              <button
                className="logout-button dashboard-logout-button"
                type="button"
                onClick={onLogout}
              >
                Çıkış Yap
              </button>
            )}
          </div>
        </header>

        {/* 12.GÜN - 3.20 - Dashboard analizlerinde kullanılacak filtre alanları oluşturuldu. */}
        <section className="dashboard-filter-panel">
          <div className="filter-heading-row dashboard-filter-heading">
            <div>
              <span className="workspace-kicker">Görünümü Özelleştir</span>
              <h2 className="section-title">Dashboard Filtreleri</h2>
              <p className="selected-category-text">
                {filteredTransactions.length} kayıt şu an analize dahil ediliyor.
              </p>
            </div>
            <div className="dashboard-filter-actions">
              <button className="filter-clear-button" type="button" onClick={() => dispatch(clearDashboardFilters())}>
                Temizle
              </button>
              <button className="dashboard-filter-toggle" type="button" onClick={() => setFiltersOpen((open) => !open)}>
                {filtersOpen ? "Filtreleri Gizle" : "Filtreleri Göster"}
              </button>
            </div>
          </div>

          {filtersOpen && <div className="dashboard-filter-body">
          <div className="category-form-grid dashboard-filter-grid">
            <div>
              <label className="form-label" htmlFor="dashboardPeriodMode">
                Tarih Dönemi
              </label>

              <select
                id="dashboardPeriodMode"
                className="form-input"
                value={filters.useActiveReportingPeriod ? "active" : "custom"}
                onChange={handlePeriodModeChange}
              >
                <option value="active">Aktif Finansal Dönem</option>

                <option value="custom">Özel Tarih Aralığı</option>
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardStartDate">
                Başlangıç Tarihi
              </label>

              <input
                id="dashboardStartDate"
                className="form-input"
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  handleFilterChange("startDate", event.target.value)
                }
                disabled={filters.useActiveReportingPeriod}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardEndDate">
                Bitiş Tarihi
              </label>

              <input
                id="dashboardEndDate"
                className="form-input"
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  handleFilterChange("endDate", event.target.value)
                }
                disabled={filters.useActiveReportingPeriod}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardCreditCard">
                Kredi Kartı
              </label>

              <select
                id="dashboardCreditCard"
                className="form-input"
                value={filters.creditCardId}
                onChange={(event) =>
                  handleFilterChange("creditCardId", event.target.value)
                }
              >
                <option value="">Tüm Kartlar</option>

                {activeCreditCards.map((creditCard) => (
                  <option key={creditCard.id} value={creditCard.id}>
                    {creditCard.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardCategory">
                Kategori
              </label>

              <select
                id="dashboardCategory"
                className="form-input"
                value={filters.categoryId}
                onChange={(event) =>
                  handleFilterChange("categoryId", event.target.value)
                }
              >
                <option value="">Tüm Kategoriler</option>

                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {Array.isArray(category.pathNames)
                      ? category.pathNames.join(" > ")
                      : category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardPaymentMethod">
                Ödeme Yöntemi
              </label>

              <select
                id="dashboardPaymentMethod"
                className="form-input"
                value={filters.paymentMethod}
                onChange={(event) =>
                  handleFilterChange("paymentMethod", event.target.value)
                }
              >
                <option value="">Tüm Ödeme Yöntemleri</option>

                <option value="Nakit">Nakit</option>

                <option value="Banka Hesabı">Banka Hesabı</option>

                <option value="Banka Kartı">Banka Kartı</option>

                <option value="Kredi Kartı">Kredi Kartı</option>

                <option value="Dijital Cüzdan">Dijital Cüzdan</option>

                <option value="Havale / EFT">Havale / EFT</option>

                <option value="Diğer">Diğer</option>
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardMerchant">
                Firma
              </label>

              <select
                id="dashboardMerchant"
                className="form-input"
                value={filters.merchantId}
                onChange={handleMerchantChange}
              >
                <option value="">Tüm Firmalar</option>

                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardBranch">
                Şube
              </label>

              <select
                id="dashboardBranch"
                className="form-input"
                value={filters.branchId}
                onChange={(event) =>
                  handleFilterChange("branchId", event.target.value)
                }
              >
                <option value="">Tüm Şubeler</option>

                {filteredBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardBrand">
                Marka
              </label>

              <select
                id="dashboardBrand"
                className="form-input"
                value={filters.brandId}
                onChange={handleBrandChange}
              >
                <option value="">Tüm Markalar</option>

                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="dashboardProduct">
                Ürün
              </label>

              <select
                id="dashboardProduct"
                className="form-input"
                value={filters.productId}
                onChange={(event) =>
                  handleFilterChange("productId", event.target.value)
                }
              >
                <option value="">Tüm Ürünler</option>

                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filters.useActiveReportingPeriod && (
            <p className="selected-category-text">
              Kullanılan aktif dönem:{" "}
              <strong>{activeReportingPeriodSummary.title}</strong>
              {activeReportingPeriodSummary.startDate &&
                activeReportingPeriodSummary.endDate && (
                  <>
                    {" "}
                    ({activeReportingPeriodSummary.startDate} -{" "}
                    {activeReportingPeriodSummary.endDate})
                  </>
                )}
            </p>
          )}

          <p className="selected-category-text dashboard-filter-result">
            Filtreye uyan kayıt sayısı: <strong>{filteredTransactions.length}</strong>
          </p>
          </div>}
        </section>

        {dashboardStatus === "loading" && (
          <div className="dashboard-info-message">
            Dashboard hesaplanıyor...
          </div>
        )}

        {dashboardError && (
          <div className="error-message-panel">{dashboardError}</div>
        )}

        {/* 12.GÜN - 3.19 - Finansal özet kartları gösterildi. */}
        <div className="dashboard-content-heading">
          <div><span className="workspace-kicker">Genel Durum</span><h2>Finansal Özet</h2></div>
          <p>Seçili döneme ait temel finansal göstergeler.</p>
        </div>
        <div className="dashboard-summary-grid">
          <div className="dashboard-summary-card">
            <div className="dashboard-card-title">Toplam Gelir</div>

            <div className="dashboard-card-value">
              {formatCurrency(totalIncome)}
            </div>

            <div className="dashboard-card-description">
              Toplam gelir tutarı
            </div>
          </div>

          <div className="dashboard-summary-card">
            <div className="dashboard-card-title">Toplam Gider</div>

            <div className="dashboard-card-value">
              {formatCurrency(totalExpense)}
            </div>

            <div className="dashboard-card-description">
              Toplam harcama tutarı
            </div>
          </div>

          <div className="dashboard-summary-card">
            <div className="dashboard-card-title">Toplam İade</div>

            <div className="dashboard-card-value">
              {formatCurrency(totalRefunds)}
            </div>

            <div className="dashboard-card-description">
              Gerçekleşen iade tutarı
            </div>
          </div>

          <div className="dashboard-summary-card">
            <div className="dashboard-card-title">Net Nakit Akışı</div>

            <div className="dashboard-card-value">
              {formatCurrency(netCashFlow)}
            </div>

            <div className="dashboard-card-description">
              Gelir ve gider arasındaki fark
            </div>
          </div>

          <div className="dashboard-summary-card">
            <div className="dashboard-card-title">Tasarruf Oranı</div>

            <div className="dashboard-card-value">
              {Number(savingsRate || 0).toFixed(2)}%
            </div>

            <div className="dashboard-card-description">
              Gelire göre tasarruf oranı
            </div>
          </div>
        </div>

        <div className="dashboard-content-heading dashboard-charts-heading">
          <div><span className="workspace-kicker">Grafikler</span><h2>Harcama ve Fiyat Analizi</h2></div>
          <p>Gelir-gider dengesi, kategori dağılımı ve ürün fiyat geçmişini karşılaştırın.</p>
        </div>
        <div className="dashboard-chart-grid">
          <div className="dashboard-chart-grid-item"><IncomeExpenseChart /></div>
          <div className="dashboard-chart-grid-item"><CategoryExpenseChart /></div>
          <div className="dashboard-chart-grid-item dashboard-chart-grid-item-wide"><ProductPriceChart /></div>
        </div>

        {/* 12.GÜN - 3.20 - Grafikte seçilen gelir veya gider kayıtları drill-down olarak gösterildi. */}
        {selectedChartTransactionType && (
          <section className="category-management-section">
            <h2 className="section-title">
              {selectedChartTransactionType} İşlemleri
            </h2>

            <p className="selected-category-text">
              Grafikte seçilen <strong>{selectedChartTransactionType}</strong>{" "}
              türüne ve mevcut filtrelere uyan kayıtlar aşağıda
              gösterilmektedir.
            </p>

            {drillDownTransactions.length === 0 ? (
              <p className="empty-message">
                Bu seçime uygun işlem kaydı bulunamadı.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="transaction-table">
                  <thead>
                    <tr>
                      <th>İşlem Türü</th>

                      <th>Kategori</th>

                      <th>Tutar</th>

                      <th>Ödeme Yöntemi</th>

                      <th>Firma / Şube</th>

                      <th>Tarih</th>
                    </tr>
                  </thead>

                  <tbody>
                    {drillDownTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.transactionType}</td>

                        <td>{getTransactionCategoryLabel(transaction)}</td>

                        <td>{formatMinorCurrency(transaction.amountMinor)}</td>

                        <td>{transaction.paymentMethod || "-"}</td>

                        <td>
                          {transaction.merchantName || "-"}

                          {transaction.branchName && (
                            <div className="table-secondary-text">
                              {transaction.branchName}
                            </div>
                          )}
                        </td>

                        <td>{formatTransactionDate(transaction)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 12.GÜN - 3.19 - Finansal analiz açıklama alanı gösterildi. */}
        <div className="dashboard-analysis-card">
          <h2 className="dashboard-section-title">Finansal Analiz</h2>

          <p className="page-description">
            Gelir, gider, iade, net nakit akışı ve tasarruf oranı bilgileri
            yukarıdaki finansal özet kartlarında gösterilmektedir.
          </p>
        </div>
      </main>
    </div>
  );
}

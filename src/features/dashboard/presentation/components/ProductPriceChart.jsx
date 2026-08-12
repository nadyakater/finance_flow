import { useMemo, useState } from "react";

import { useSelector } from "react-redux";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { selectDashboardFilters } from "../dashboardSelectors";

import { selectProductPurchaseHistory } from "../../../transactions/presentation/transactionSelectors";

// 12.GÜN - 3.20 - Seçilen ürünün paket ve normalize birim fiyat geçmişi grafik üzerinde gösterildi.
function ProductPriceChart() {
  const filters = useSelector(selectDashboardFilters);

  const [priceMode, setPriceMode] = useState("package");

  const purchaseHistory = useSelector((state) =>
    selectProductPurchaseHistory(state, filters.productId),
  );

  // 12.GÜN - 3.20 - Ürün satın alma geçmişi grafik için eski tarihten yeni tarihe sıralandı.
  const chartData = useMemo(() => {
    return [...purchaseHistory]
      .sort((firstPurchase, secondPurchase) => {
        const firstDate = new Date(firstPurchase.transactionDate).getTime();

        const secondDate = new Date(secondPurchase.transactionDate).getTime();

        return firstDate - secondDate;
      })
      .map((purchase) => ({
        transactionId: purchase.transactionId,

        date: purchase.transactionDate,

        merchantName: purchase.merchantName || "-",

        branchName: purchase.branchName || "-",

        packagePrice: Number(purchase.netAmountMinor ?? 0) / 100,

        normalizedUnitPrice:
          Number(purchase.normalizedUnitPriceMinor ?? 0) / 100,

        normalizedUnit: purchase.normalizedUnit || "",
      }));
  }, [purchaseHistory]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(Number(value ?? 0));

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("tr-TR");
  };

  const selectedDataKey =
    priceMode === "package" ? "packagePrice" : "normalizedUnitPrice";

  const selectedPriceTitle =
    priceMode === "package" ? "Paket Fiyatı" : "Normalize Birim Fiyat";

  if (!filters.productId) {
    return (
      <section className="dashboard-analysis-card">
        <h2 className="dashboard-section-title">Ürün Fiyat Geçmişi</h2>

        <p className="empty-message">
          Ürün fiyat grafiğini görmek için Dashboard filtrelerinden bir ürün
          seçiniz.
        </p>
      </section>
    );
  }

  if (chartData.length === 0) {
    return (
      <section className="dashboard-analysis-card">
        <h2 className="dashboard-section-title">Ürün Fiyat Geçmişi</h2>

        <p className="empty-message">
          Seçilen ürüne ait satın alma geçmişi bulunmuyor.
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard-analysis-card">
      <div className="filter-heading-row">
        <div>
          <h2 className="dashboard-section-title">Ürün Fiyat Geçmişi</h2>

          <p className="selected-category-text">
            Seçilen ürünün geçmiş alışveriş fiyatlarını inceleyebilirsiniz.
          </p>
        </div>

        <div className="product-price-mode-buttons">
          <button
            className={
              priceMode === "package"
                ? "secondary-button product-price-mode-button-selected"
                : "secondary-button"
            }
            type="button"
            onClick={() => setPriceMode("package")}
          >
            Paket Fiyatı
          </button>

          <button
            className={
              priceMode === "normalized"
                ? "secondary-button product-price-mode-button-selected"
                : "secondary-button"
            }
            type="button"
            onClick={() => setPriceMode("normalized")}
          >
            Normalize Birim Fiyat
          </button>
        </div>
      </div>

      <div
        className="dashboard-chart-wrapper"
        role="img"
        aria-label={`Seçilen ürünün ${selectedPriceTitle} geçmişini gösteren çizgi grafik`}
      >
        <ResponsiveContainer width="100%" height={340}>
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" tickFormatter={formatDate} />

            <YAxis />

            <Tooltip
              labelFormatter={formatDate}
              formatter={(value) => [formatCurrency(value), selectedPriceTitle]}
            />

            <Line
              type="monotone"
              dataKey={selectedDataKey}
              name={selectedPriceTitle}
              stroke="#e91e63"
              strokeWidth={3}
              dot={{
                r: 5,
              }}
              activeDot={{
                r: 7,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 12.GÜN - 3.20 - Ürün fiyat grafiğinin verileri erişilebilir metinsel özet olarak da gösterildi. */}
      <div className="dashboard-chart-summary">
        {chartData.map((purchase) => (
          <div
            key={`${purchase.transactionId}-${purchase.date}`}
            className="dashboard-chart-summary-item"
          >
            <span>{formatDate(purchase.date)}</span>

            <strong>{formatCurrency(purchase[selectedDataKey])}</strong>

            <small>
              {purchase.merchantName}

              {purchase.branchName !== "-" && ` / ${purchase.branchName}`}

              {priceMode === "normalized" &&
                purchase.normalizedUnit &&
                ` - ${purchase.normalizedUnit}`}
            </small>
          </div>
        ))}
      </div>

      <p className="dashboard-chart-help-text">
        Paket fiyatı ürünün alışverişteki toplam fiyatını, normalize birim fiyat
        ise ürünlerin ortak birim üzerinden karşılaştırılabilmesini gösterir.
      </p>
    </section>
  );
}

export default ProductPriceChart;

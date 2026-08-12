import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useDispatch, useSelector } from "react-redux";

import {
  clearSelectedChartTransactionType,
  setSelectedChartTransactionType,
} from "../dashboardSlice";

import {
  selectFilteredDashboardTransactions,
  selectSelectedChartTransactionType,
} from "../dashboardSelectors";

// 12.GÜN - 3.20 - Filtrelenen gelir ve gider kayıtları grafik ve drill-down için görselleştirildi.
function IncomeExpenseChart() {
  const dispatch = useDispatch();

  const filteredTransactions = useSelector(selectFilteredDashboardTransactions);

  const selectedTransactionType = useSelector(
    selectSelectedChartTransactionType,
  );

  // 12.GÜN - 3.20 - Grafik için filtrelenmiş gelir ve net gider toplamları hazırlandı.
  const chartData = [
    {
      name: "Gelir",

      amount: filteredTransactions
        .filter((transaction) => transaction.transactionType === "Gelir")
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amountMinor ?? 0) / 100,
          0,
        ),
    },

    {
      name: "Gider",

      amount: filteredTransactions
        .filter((transaction) => transaction.transactionType === "Gider")
        .reduce((total, transaction) => {
          const amountMinor = Number(transaction.amountMinor ?? 0);

          const refundedMinor = Number(transaction.refundedMinor ?? 0);

          const netExpenseMinor = Math.max(amountMinor - refundedMinor, 0);

          return total + netExpenseMinor / 100;
        }, 0),
    },
  ];

  const formatCurrency = (value) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(Number(value ?? 0));

  // 12.GÜN - 3.20 - Grafik çubuğuna tıklanınca ilgili işlem türü Redux içerisine kaydedilir.
  const handleBarClick = (data) => {
    const transactionType = data?.payload?.name ?? data?.name ?? "";

    if (!transactionType) {
      return;
    }

    dispatch(setSelectedChartTransactionType(transactionType));
  };

  return (
    <section className="dashboard-analysis-card">
      <div className="filter-heading-row">
        <div>
          <h2 className="dashboard-section-title">Gelir ve Gider Grafiği</h2>

          <p className="selected-category-text">
            Filtrelere uygun gelir ve gider toplamlarını karşılaştırabilirsiniz.
          </p>
        </div>

        {selectedTransactionType && (
          <button
            className="filter-clear-button"
            type="button"
            onClick={() => dispatch(clearSelectedChartTransactionType())}
          >
            Grafik Seçimini Temizle
          </button>
        )}
      </div>

      <div
        className="dashboard-chart-wrapper"
        role="img"
        aria-label="Filtrelenmiş gelir ve gider toplamlarını gösteren sütun grafik"
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              left: 20,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="name" />

            <YAxis />

            <Tooltip formatter={(value) => formatCurrency(value)} />

            <Bar
              dataKey="amount"
              name="Tutar"
              fill="#e91e63"
              radius={[8, 8, 0, 0]}
              onClick={handleBarClick}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 12.GÜN - 3.20 - Grafik verileri erişilebilir metinsel özet olarak da gösterildi. */}
      <div className="dashboard-chart-summary">
        {chartData.map((item) => (
          <button
            key={item.name}
            className={
              selectedTransactionType === item.name
                ? "dashboard-chart-summary-item dashboard-chart-summary-item-selected"
                : "dashboard-chart-summary-item"
            }
            type="button"
            aria-label={`${item.name} işlemlerini göster`}
            onClick={() => dispatch(setSelectedChartTransactionType(item.name))}
          >
            <span>{item.name}</span>

            <strong>{formatCurrency(item.amount)}</strong>
          </button>
        ))}
      </div>

      <p className="dashboard-chart-help-text">
        Grafik çubuğuna veya aşağıdaki özet alanına tıklayarak ilgili işlem
        kayıtlarını görüntüleyebilirsiniz.
      </p>
    </section>
  );
}

export default IncomeExpenseChart;

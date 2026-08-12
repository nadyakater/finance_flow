import { useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  clearSelectedChartTransactionType,
  setDashboardFilter,
  setSelectedChartTransactionType,
} from "../dashboardSlice";

import {
  selectDashboardFilters,
  selectFilteredDashboardTransactions,
} from "../dashboardSelectors";

const MAX_VISIBLE_CATEGORY_COUNT = 5;

const CHART_COLORS = [
  "#e91e63",
  "#d81b60",
  "#ad1457",
  "#f06292",
  "#f48fb1",
  "#f8bbd0",
];

// 12.GÜN - 3.20 - Gider kayıtları kategori bazında gruplanarak ilk kategoriler ve Diğer dilimi için grafik verisi hazırlandı.
function CategoryExpenseChart() {
  const dispatch = useDispatch();

  const filteredTransactions = useSelector(selectFilteredDashboardTransactions);

  const filters = useSelector(selectDashboardFilters);

  const categoryData = useMemo(() => {
    const categoryTotals = new Map();

    filteredTransactions
      .filter((transaction) => transaction.transactionType === "Gider")
      .forEach((transaction) => {
        const lines = Array.isArray(transaction.lines) ? transaction.lines : [];

        if (lines.length > 0) {
          lines.forEach((line) => {
            const categoryId = line.categoryId ?? "";

            const categoryName =
              line.categoryPath || line.category || "Kategorisiz";

            const lineAmountMinor = Number(
              line.netAmountMinor ?? line.amountMinor ?? 0,
            );

            if (lineAmountMinor <= 0) {
              return;
            }

            const currentCategory = categoryTotals.get(
              categoryId || categoryName,
            ) ?? {
              categoryId,
              name: categoryName,
              amountMinor: 0,
            };

            currentCategory.amountMinor += lineAmountMinor;

            categoryTotals.set(categoryId || categoryName, currentCategory);
          });

          return;
        }

        const categoryId = transaction.categoryId ?? "";

        const categoryName =
          transaction.categoryPath || transaction.category || "Kategorisiz";

        const amountMinor = Math.max(
          Number(transaction.amountMinor ?? 0) -
            Number(transaction.refundedMinor ?? 0),
          0,
        );

        if (amountMinor <= 0) {
          return;
        }

        const currentCategory = categoryTotals.get(
          categoryId || categoryName,
        ) ?? {
          categoryId,
          name: categoryName,
          amountMinor: 0,
        };

        currentCategory.amountMinor += amountMinor;

        categoryTotals.set(categoryId || categoryName, currentCategory);
      });

    const sortedCategories = Array.from(categoryTotals.values()).sort(
      (firstCategory, secondCategory) =>
        secondCategory.amountMinor - firstCategory.amountMinor,
    );

    const visibleCategories = sortedCategories.slice(
      0,
      MAX_VISIBLE_CATEGORY_COUNT,
    );

    const remainingCategories = sortedCategories.slice(
      MAX_VISIBLE_CATEGORY_COUNT,
    );

    if (remainingCategories.length === 0) {
      return visibleCategories;
    }

    const otherAmountMinor = remainingCategories.reduce(
      (total, category) => total + category.amountMinor,
      0,
    );

    return [
      ...visibleCategories,

      {
        categoryId: "",
        name: "Diğer",
        amountMinor: otherAmountMinor,
        isOther: true,
      },
    ];
  }, [filteredTransactions]);

  const formatCurrency = (amountMinor) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(Number(amountMinor ?? 0) / 100);

  // 12.GÜN - 3.20 - Kategori dilimine tıklandığında ilgili gider kayıtlarına drill-down yapılması sağlandı.
  const handleCategoryClick = (data) => {
    const selectedCategory = data?.payload ?? data;

    if (
      !selectedCategory ||
      selectedCategory.isOther ||
      !selectedCategory.categoryId
    ) {
      return;
    }

    dispatch(
      setDashboardFilter({
        name: "categoryId",
        value: selectedCategory.categoryId,
      }),
    );

    dispatch(setSelectedChartTransactionType("Gider"));
  };

  // 12.GÜN - 3.20 - Kullanıcının yalnızca kategori seçimini temizleyerek kategori grafiğine geri dönebilmesi sağlandı.
  const handleClearCategorySelection = () => {
    dispatch(
      setDashboardFilter({
        name: "categoryId",
        value: "",
      }),
    );

    dispatch(clearSelectedChartTransactionType());
  };

  if (categoryData.length === 0) {
    return (
      <section className="dashboard-analysis-card">
        <div className="filter-heading-row">
          <h2 className="dashboard-section-title">Kategori Harcama Dağılımı</h2>

          {filters.categoryId && (
            <button
              className="filter-clear-button"
              type="button"
              onClick={handleClearCategorySelection}
            >
              ← Kategorilere Dön
            </button>
          )}
        </div>

        <p className="empty-message">Grafik için gider kaydı bulunmuyor.</p>
      </section>
    );
  }

  return (
    <section className="dashboard-analysis-card">
      <div className="filter-heading-row">
        <div>
          <h2 className="dashboard-section-title">Kategori Harcama Dağılımı</h2>

          <p className="selected-category-text">
            Filtrelere uygun giderlerin kategori dağılımını inceleyebilirsiniz.
          </p>
        </div>

        {filters.categoryId && (
          <button
            className="filter-clear-button"
            type="button"
            onClick={handleClearCategorySelection}
          >
            ← Kategorilere Dön
          </button>
        )}
      </div>

      <div
        className="dashboard-chart-wrapper"
        role="img"
        aria-label="Kategori bazlı gider dağılımını gösteren halka grafik"
      >
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="amountMinor"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={125}
              paddingAngle={2}
              onClick={handleCategoryClick}
            >
              {categoryData.map((category, index) => (
                <Cell
                  key={`${category.name}-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  cursor={category.isOther ? "default" : "pointer"}
                />
              ))}
            </Pie>

            <Tooltip formatter={(value) => formatCurrency(value)} />

            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 12.GÜN - 3.20 - Kategori grafik değerleri erişilebilir metinsel özet olarak da gösterildi. */}
      <div className="dashboard-chart-summary">
        {categoryData.map((category) => (
          <button
            key={category.name}
            className="dashboard-chart-summary-item"
            type="button"
            disabled={category.isOther || !category.categoryId}
            onClick={() => handleCategoryClick(category)}
          >
            <span>{category.name}</span>

            <strong>{formatCurrency(category.amountMinor)}</strong>
          </button>
        ))}
      </div>

      <p className="dashboard-chart-help-text">
        En yüksek harcamaya sahip ilk 5 kategori ayrı gösterilir. Kalan
        kategoriler Diğer altında birleştirilir. Bir kategoriye tıklayarak
        ilgili gider kayıtlarına ulaşabilirsiniz.
      </p>
    </section>
  );
}

export default CategoryExpenseChart;

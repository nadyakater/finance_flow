import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { calculateDashboard } from "./dashboardThunks";

import {
  selectTotalIncome,
  selectTotalExpense,
  selectTotalRefunds,
  selectNetCashFlow,
  selectSavingsRate,
  selectDashboardStatus,
  selectDashboardError,
} from "./dashboardSelectors";

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard ve analizler ekranı.
//
// Mevcut transactions Redux state'i kullanılarak
// finansal özet değerleri hesaplanır.
// =====================================================

export default function Dashboard() {
  const dispatch = useDispatch();

  // =====================================================
  // 12.GÜN - 3.19
  //
  // Mevcut transaction kayıtları Redux store içerisinden
  // alınır.
  // =====================================================

  const transactions = useSelector(
    (state) => state.transactions.items,
  );

  // =====================================================
  // 12.GÜN - 3.19
  //
  // Dashboard finansal özet değerleri Redux store'dan
  // alınır.
  // =====================================================

  const totalIncome = useSelector(
    selectTotalIncome,
  );

  const totalExpense = useSelector(
    selectTotalExpense,
  );

  const totalRefunds = useSelector(
    selectTotalRefunds,
  );

  const netCashFlow = useSelector(
    selectNetCashFlow,
  );

  const savingsRate = useSelector(
    selectSavingsRate,
  );

  const dashboardStatus = useSelector(
    selectDashboardStatus,
  );

  const dashboardError = useSelector(
    selectDashboardError,
  );

  // =====================================================
  // 12.GÜN - 3.19
  //
  // Transaction kayıtları değiştiğinde Dashboard
  // hesaplamaları yeniden yapılır.
  // =====================================================

  useEffect(() => {
    dispatch(
      calculateDashboard(transactions),
    );
  }, [dispatch, transactions]);

  // =====================================================
  // 12.GÜN - 3.19
  //
  // Para değerlerini Türk Lirası formatında gösterir.
  // =====================================================

  const formatCurrency = (value) => {
    return new Intl.NumberFormat(
      "tr-TR",
      {
        style: "currency",
        currency: "TRY",
      },
    ).format(Number(value || 0));
  };

  // =====================================================
  // 12.GÜN - 3.19
  //
  // Dashboard ekranı.
  // =====================================================

  return (
    <div
      style={{
        padding: "24px",
      }}
    >
      <h1>Dashboard</h1>

      <p>
        Finansal özet ve analizler
      </p>

      {dashboardStatus === "loading" && (
        <p>
          Dashboard hesaplanıyor...
        </p>
      )}

      {dashboardError && (
        <p>
          {dashboardError}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5, 1fr)",
          gap: "16px",
          marginTop: "24px",
        }}
      >
        {/* =====================================================
            12.GÜN - 3.19
            Toplam gelir
            ===================================================== */}

        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            backgroundColor: "#fff",
          }}
        >
          <h3>
            Total Income
          </h3>

          <p>
            {formatCurrency(
              totalIncome,
            )}
          </p>
        </div>

        {/* =====================================================
            12.GÜN - 3.19
            Toplam gider
            ===================================================== */}

        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            backgroundColor: "#fff",
          }}
        >
          <h3>
            Total Expense
          </h3>

          <p>
            {formatCurrency(
              totalExpense,
            )}
          </p>
        </div>

        {/* =====================================================
            12.GÜN - 3.19
            Toplam iade
            ===================================================== */}

        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            backgroundColor: "#fff",
          }}
        >
          <h3>
            Total Refunds
          </h3>

          <p>
            {formatCurrency(
              totalRefunds,
            )}
          </p>
        </div>

        {/* =====================================================
            12.GÜN - 3.19
            Net nakit akışı
            ===================================================== */}

        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            backgroundColor: "#fff",
          }}
        >
          <h3>
            Net Cash Flow
          </h3>

          <p>
            {formatCurrency(
              netCashFlow,
            )}
          </p>
        </div>

        {/* =====================================================
            12.GÜN - 3.19
            Tasarruf oranı
            ===================================================== */}

        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            backgroundColor: "#fff",
          }}
        >
          <h3>
            Savings Rate
          </h3>

          <p>
            {Number(
              savingsRate || 0,
            ).toFixed(2)}
            %
          </p>
        </div>
      </div>
    </div>
  );
}
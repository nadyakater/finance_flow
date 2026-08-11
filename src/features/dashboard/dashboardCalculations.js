// =====================================================
// 12.GÜN - 3.19
//
// Dashboard ve analizler için finansal hesaplamalar.
//
// Hesaplanan değerler:
// - TotalIncome
// - TotalExpense
// - TotalRefunds
// - NetCashFlow
// - SavingsRate
//
// İade işlemleri ayrıca hesaplanır ve gider toplamından
// düşülerek net gider tutarı oluşturulur.
// =====================================================

// =====================================================
// 12.GÜN - 3.19
//
// Toplam gelir tutarını hesaplar.
//
// Sadece transactionType değeri "Gelir" olan
// işlemler hesaplamaya dahil edilir.
// =====================================================

export function calculateTotalIncome(
  transactions,
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.transactionType ===
        "Gelir",
    )
    .reduce(
      (total, transaction) =>
        total +
        Number(transaction.amount || 0),
      0,
    );
}

// =====================================================
// 12.GÜN - 3.19
//
// Toplam iade tutarını hesaplar.
//
// "İade" olarak kaydedilen işlemler ayrıca
// hesaplanır.
// =====================================================

export function calculateTotalRefunds(
  transactions,
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.transactionType ===
        "İade",
    )
    .reduce(
      (total, transaction) =>
        total +
        Number(transaction.amount || 0),
      0,
    );
}

// =====================================================
// 12.GÜN - 3.19
//
// Toplam gider tutarını hesaplar.
//
// Gider kayıtlarının tutarından, o gider üzerinde
// gerçekleşmiş iade miktarı düşülür.
//
// Örnek:
// Gider = 1000 TL
// İade = 200 TL
// Net gider = 800 TL
// =====================================================

export function calculateTotalExpense(
  transactions,
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.transactionType ===
        "Gider",
    )
    .reduce(
      (total, transaction) => {
        const expenseAmount =
          Number(
            transaction.amount || 0,
          );

        const refundedAmount =
          Number(
            transaction.refundedMinor || 0,
          ) / 100;

        const netExpense =
          Math.max(
            expenseAmount -
              refundedAmount,
            0,
          );

        return total + netExpense;
      },
      0,
    );
}

// =====================================================
// 12.GÜN - 3.19
//
// Net nakit akışını hesaplar.
//
// NetCashFlow = TotalIncome - TotalExpense
// =====================================================

export function calculateNetCashFlow(
  totalIncome,
  totalExpense,
) {
  return (
    Number(totalIncome || 0) -
    Number(totalExpense || 0)
  );
}

// =====================================================
// 12.GÜN - 3.19
//
// Tasarruf oranını hesaplar.
//
// TotalIncome 0 ise sıfıra bölme yapılmaz
// ve sonuç 0 olarak döndürülür.
// =====================================================

export function calculateSavingsRate(
  totalIncome,
  netCashFlow,
) {
  if (
    Number(totalIncome || 0) ===
    0
  ) {
    return 0;
  }

  return (
    (Number(netCashFlow || 0) /
      Number(totalIncome)) *
    100
  );
}

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard'da kullanılacak bütün finansal değerleri
// tek seferde hesaplar.
// =====================================================

export function calculateDashboardTotals(
  transactions,
) {
  const totalIncome =
    calculateTotalIncome(
      transactions,
    );

  const totalRefunds =
    calculateTotalRefunds(
      transactions,
    );

  const totalExpense =
    calculateTotalExpense(
      transactions,
    );

  const netCashFlow =
    calculateNetCashFlow(
      totalIncome,
      totalExpense,
    );

  const savingsRate =
    calculateSavingsRate(
      totalIncome,
      netCashFlow,
    );

  return {
    totalIncome,
    totalExpense,
    totalRefunds,
    netCashFlow,
    savingsRate,
  };
}
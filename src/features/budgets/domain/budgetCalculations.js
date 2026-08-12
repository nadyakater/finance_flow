// =====================================================
// 11.GÜN - Bütçe ve hedef hesaplamaları
//
// Kullanıcının kategori bütçesi, kullanılan bütçe,
// kalan bütçe, kullanım yüzdesi ve tasarruf
// hedefi hesaplamaları bu dosyada yapılır.
//
// Firebase veya kullanıcı arayüzü işlemi içermez.
// =====================================================

// =====================================================
// 11.GÜN
// Bütçe tutarının geçerli olup olmadığını kontrol eder.
//
// Bütçe sıfırdan büyük olmalıdır.
// =====================================================

export function validateBudgetAmountMinor(budgetAmountMinor) {
  const numericAmount = Number(budgetAmountMinor);

  if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
    throw new Error("BUDGET_AMOUNT_INVALID");
  }

  return numericAmount;
}

// =====================================================
// 11.GÜN
// Kullanılan bütçe tutarını hesaplar.
//
// Refund gider kullanımını azaltır.
//
// Örneğin:
// Gider: 5.000 TL
// Refund: 500 TL
// Kullanılan bütçe: 4.500 TL
// =====================================================

export function calculateBudgetSpentMinor({ expenseMinor, refundMinor }) {
  const expense = Number(expenseMinor ?? 0);
  const refund = Number(refundMinor ?? 0);

  return Math.max(expense - refund, 0);
}

// =====================================================
// 11.GÜN
// Bütçede kalan tutarı hesaplar.
//
// remaining = budget - spent
//
// Bütçe aşılmışsa kalan değer negatif olabilir.
// =====================================================

export function calculateRemainingBudgetMinor({ budgetMinor, spentMinor }) {
  return Number(budgetMinor ?? 0) - Number(spentMinor ?? 0);
}

// =====================================================
// 11.GÜN
// Bütçe kullanım yüzdesini hesaplar.
//
// spent / budget * 100
// =====================================================

export function calculateBudgetUsagePercent({ budgetMinor, spentMinor }) {
  const budget = Number(budgetMinor ?? 0);
  const spent = Number(spentMinor ?? 0);

  if (budget <= 0) {
    return null;
  }

  return Number(((spent / budget) * 100).toFixed(2));
}

// =====================================================
// 11.GÜN
// Kullanıcının bütçeyi aşıp aşmadığını kontrol eder.
// =====================================================

export function calculateBudgetExceeded({ budgetMinor, spentMinor }) {
  return Number(spentMinor ?? 0) > Number(budgetMinor ?? 0);
}

/* 13. gün düzenleme - Rollover devir hesaplama fonksiyonu (calculateRolloverMinor) kaldırıldı. */

// =====================================================
// 11.GÜN
// Kullanıcının o dönemde kullanabileceği gerçek bütçe limitini verir.
// =====================================================

export function calculateEffectiveBudgetMinor({ baseBudgetMinor }) {
  return Number(baseBudgetMinor ?? 0);
}

// =====================================================
// 11.GÜN - Tasarruf oranı
//
// Tasarruf oranı: Net Nakit / Toplam Gelir * 100
// =====================================================

export function calculateSavingsRate({ totalIncomeMinor, netCashFlowMinor }) {
  const income = Number(totalIncomeMinor ?? 0);
  const netCashFlow = Number(netCashFlowMinor ?? 0);

  if (income <= 0) {
    return null;
  }

  return Number(((netCashFlow / income) * 100).toFixed(2));
}

// =====================================================
// 11.GÜN
// Tasarruf hedefine kalan tutarı hesaplar.
// =====================================================

export function calculateSavingsTargetRemainingMinor({
  targetMinor,
  netCashFlowMinor,
}) {
  return Math.max(Number(targetMinor ?? 0) - Number(netCashFlowMinor ?? 0), 0);
}

// =====================================================
// 11.GÜN
// Tasarruf hedefi ilerleme yüzdesini hesaplar.
// =====================================================

export function calculateSavingsTargetProgressPercent({
  targetMinor,
  netCashFlowMinor,
}) {
  const target = Number(targetMinor ?? 0);

  if (target <= 0) {
    return null;
  }

  return Number(((Number(netCashFlowMinor ?? 0) / target) * 100).toFixed(2));
}

// =====================================================
// 11.GÜN
// Tasarruf hedefi gelir yüzdesi olarak tanımlandıysa
// hedef tutarını hesaplar.
// =====================================================

export function calculateSavingsTargetFromIncomePercent({
  totalIncomeMinor,
  targetPercent,
}) {
  const income = Number(totalIncomeMinor ?? 0);
  const percent = Number(targetPercent ?? 0);

  if (income <= 0 || percent <= 0) {
    return 0;
  }

  return Math.round(income * (percent / 100));
}

// =====================================================
// 11.GÜN
// Tasarruf hedefi türünün geçerli olup olmadığını kontrol eder.
// =====================================================

export function validateSavingsTargetType(targetType) {
  const allowedTypes = ["amount", "incomePercent"];

  if (!allowedTypes.includes(targetType)) {
    throw new Error("SAVINGS_TARGET_TYPE_INVALID");
  }

  return targetType;
}

// =====================================================
// 11.GÜN
// Gelir yüzdesi hedefinin aralığını kontrol eder.
// =====================================================

export function validateSavingsTargetPercent(targetPercent) {
  const numericPercent = Number(targetPercent);

  if (
    !Number.isFinite(numericPercent) ||
    numericPercent <= 0 ||
    numericPercent > 100
  ) {
    throw new Error("SAVINGS_TARGET_PERCENT_INVALID");
  }

  return numericPercent;
}

// =====================================================
// 11.GÜN
// Bütçe kullanımına ait tüm temel bilgileri tek seferde
// hesaplayan yardımcı fonksiyon.
// =====================================================

export function calculateBudgetSummary({
  budgetMinor,
  expenseMinor,
  refundMinor,
}) {
  const effectiveBudgetMinor = calculateEffectiveBudgetMinor({
    baseBudgetMinor: budgetMinor,
  });

  const spentMinor = calculateBudgetSpentMinor({
    expenseMinor,
    refundMinor,
  });

  const remainingMinor = calculateRemainingBudgetMinor({
    budgetMinor: effectiveBudgetMinor,
    spentMinor,
  });

  const usagePercent = calculateBudgetUsagePercent({
    budgetMinor: effectiveBudgetMinor,
    spentMinor,
  });

  const exceeded = calculateBudgetExceeded({
    budgetMinor: effectiveBudgetMinor,
    spentMinor,
  });

  return {
    baseBudgetMinor: Number(budgetMinor ?? 0),
    effectiveBudgetMinor,
    spentMinor,
    remainingMinor,
    usagePercent,
    exceeded,
  };
}
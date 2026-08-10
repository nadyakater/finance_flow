// =====================================================
// 11.GÜN
// Kredi kartı taksit ve ekstre dönemi hesaplamaları
// Firebase ve React bileşenlerinden ayrılarak bu dosyada toplandı.
//
// Böylece kullanıcı yalnızca taksit sayısını seçerken,
// dönem ve kuruş hesapları uygulama tarafından otomatik yapılır.
// =====================================================

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function getMonthLastDay(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function createSafeDateValue(year, monthIndex, requestedDay) {
  const lastDay = getMonthLastDay(year, monthIndex);

  const safeDay = Math.min(requestedDay, lastDay);

  return `${year}-${padDatePart(monthIndex + 1)}-${padDatePart(safeDay)}`;
}

function parseTransactionDate(transactionDate) {
  const dateParts = String(transactionDate ?? "")
    .split("-")
    .map(Number);

  if (
    dateParts.length !== 3 ||
    !Number.isInteger(dateParts[0]) ||
    !Number.isInteger(dateParts[1]) ||
    !Number.isInteger(dateParts[2])
  ) {
    throw new Error("TRANSACTION_DATE_REQUIRED");
  }

  const [year, month, day] = dateParts;

  return {
    year,
    monthIndex: month - 1,
    day,
  };
}

// 11.GÜN - Kartın kesim günü ayda bulunmuyorsa ayın son günü kullanılarak geçerli ekstre tarihi oluşturulur.
export function calculateFirstStatementDate(
  transactionDate,
  statementDay,
) {
  const numericStatementDay = Number(statementDay);

  if (
    !Number.isInteger(numericStatementDay) ||
    numericStatementDay < 1 ||
    numericStatementDay > 31
  ) {
    throw new Error("TRANSACTION_STATEMENT_DAY_INVALID");
  }

  const parsedDate = parseTransactionDate(transactionDate);

  const currentMonthLastDay = getMonthLastDay(
    parsedDate.year,
    parsedDate.monthIndex,
  );

  const currentMonthStatementDay = Math.min(
    numericStatementDay,
    currentMonthLastDay,
  );

  if (parsedDate.day <= currentMonthStatementDay) {
    return createSafeDateValue(
      parsedDate.year,
      parsedDate.monthIndex,
      numericStatementDay,
    );
  }

  const nextMonthDate = new Date(
    parsedDate.year,
    parsedDate.monthIndex + 1,
    1,
  );

  return createSafeDateValue(
    nextMonthDate.getFullYear(),
    nextMonthDate.getMonth(),
    numericStatementDay,
  );
}

function addMonthsToStatementDate(
  statementDate,
  monthCount,
  statementDay,
) {
  const parsedDate = parseTransactionDate(statementDate);

  const targetMonthDate = new Date(
    parsedDate.year,
    parsedDate.monthIndex + monthCount,
    1,
  );

  return createSafeDateValue(
    targetMonthDate.getFullYear(),
    targetMonthDate.getMonth(),
    statementDay,
  );
}

// 11.GÜN - Taksit tutarlarının toplamının alışveriş tutarına tam eşit kalması için kalan kuruş farkı son taksite eklenir.
export function allocateInstallmentAmounts(
  totalAmountMinor,
  installmentCount,
) {
  const numericAmountMinor = Number(totalAmountMinor);

  const numericInstallmentCount = Number(installmentCount);

  if (
    !Number.isInteger(numericAmountMinor) ||
    numericAmountMinor <= 0
  ) {
    throw new Error("TRANSACTION_INVALID_AMOUNT");
  }

  if (
    !Number.isInteger(numericInstallmentCount) ||
    numericInstallmentCount < 2 ||
    numericInstallmentCount > 36
  ) {
    throw new Error("TRANSACTION_INSTALLMENT_COUNT_INVALID");
  }

  const baseInstallmentMinor = Math.floor(
    numericAmountMinor / numericInstallmentCount,
  );

  const remainderMinor =
    numericAmountMinor -
    baseInstallmentMinor * numericInstallmentCount;

  return Array.from(
    {
      length: numericInstallmentCount,
    },
    (_, index) => {
      const isLastInstallment =
        index === numericInstallmentCount - 1;

      return isLastInstallment
        ? baseInstallmentMinor + remainderMinor
        : baseInstallmentMinor;
    },
  );
}

// =====================================================
// 11.GÜN
// İlk ekstre tarihi bulunduktan sonra her taksit bir sonraki
// kart dönemine yerleştirilir.
//
// Kullanıcının ekstre dönemi veya taksit tutarlarını tek tek
// girmesine gerek kalmaz.
// =====================================================
export function createInstallmentSchedule({
  totalAmountMinor,
  installmentCount,
  transactionDate,
  statementDay,
}) {
  const installmentAmounts = allocateInstallmentAmounts(
    totalAmountMinor,
    installmentCount,
  );

  const firstStatementDate = calculateFirstStatementDate(
    transactionDate,
    statementDay,
  );

  return installmentAmounts.map(
    (amountMinor, index) => ({
      installmentNumber: index + 1,

      amountMinor,

      statementDate: addMonthsToStatementDate(
        firstStatementDate,
        index,
        statementDay,
      ),

      status: "planned",
    }),
  );
}
// =====================================================
// DÜZENLEME
// Kredi kartı işlemlerinin ait olduğu ekstre döneminin
// başlangıç ve bitiş tarihlerini hesaplayan yapı oluşturuldu.
//
// Posting tarihi bulunmayan işlemlerde işlem tarihi kullanılır
// ve ekstre bilgisi tahmini olarak işaretlenir.
// =====================================================

// =====================================================
// DÜZENLEME
// Ekstre kapanış tarihine göre son ödeme tarihi hesaplama
// ve manuel son ödeme tarihi desteği eklendi.
// =====================================================

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function getMonthLastDay(
  year,
  monthIndex,
) {
  return new Date(
    year,
    monthIndex + 1,
    0,
  ).getDate();
}

function createSafeDateValue(
  year,
  monthIndex,
  requestedDay,
) {
  const lastDay =
    getMonthLastDay(
      year,
      monthIndex,
    );

  const safeDay =
    Math.min(
      requestedDay,
      lastDay,
    );

  return `${year}-${padDatePart(
    monthIndex + 1,
  )}-${padDatePart(
    safeDay,
  )}`;
}

function parseDateValue(
  dateValue,
) {
  if (
    typeof dateValue !== "string" ||
    !dateValue
  ) {
    throw new Error(
      "STATEMENT_DATE_REQUIRED",
    );
  }

  const [
    year,
    month,
    day,
  ] = dateValue
    .split("-")
    .map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error(
      "STATEMENT_DATE_INVALID",
    );
  }

  const parsedDate =
    new Date(
      year,
      month - 1,
      day,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    throw new Error(
      "STATEMENT_DATE_INVALID",
    );
  }

  return parsedDate;
}

function formatDateValue(
  date,
) {
  return `${date.getFullYear()}-${padDatePart(
    date.getMonth() + 1,
  )}-${padDatePart(
    date.getDate(),
  )}`;
}

function addDays(
  dateValue,
  dayCount,
) {
  const date =
    parseDateValue(
      dateValue,
    );

  date.setDate(
    date.getDate() +
      dayCount,
  );

  return formatDateValue(
    date,
  );
}

function getClosingDateForMonth(
  year,
  monthIndex,
  statementDay,
) {
  return createSafeDateValue(
    year,
    monthIndex,
    statementDay,
  );
}

function getPreviousClosingDate(
  cycleEnd,
  statementDay,
) {
  const cycleEndDate =
    parseDateValue(
      cycleEnd,
    );

  return getClosingDateForMonth(
    cycleEndDate.getFullYear(),
    cycleEndDate.getMonth() - 1,
    statementDay,
  );
}

function getNextClosingDate(
  date,
  statementDay,
) {
  return getClosingDateForMonth(
    date.getFullYear(),
    date.getMonth() + 1,
    statementDay,
  );
}

function validateStatementDay(
  statementDay,
) {
  const numericStatementDay =
    Number(
      statementDay,
    );

  if (
    !Number.isInteger(
      numericStatementDay,
    ) ||
    numericStatementDay < 1 ||
    numericStatementDay > 31
  ) {
    throw new Error(
      "STATEMENT_DAY_INVALID",
    );
  }

  return numericStatementDay;
}

function validateDueDay(
  dueDay,
) {
  const numericDueDay =
    Number(
      dueDay,
    );

  if (
    !Number.isInteger(
      numericDueDay,
    ) ||
    numericDueDay < 1 ||
    numericDueDay > 31
  ) {
    throw new Error(
      "STATEMENT_DUE_DAY_INVALID",
    );
  }

  return numericDueDay;
}

// =====================================================
// DÜZENLEME
// Ekstre kapanış tarihinden sonraki ay içinde son ödeme
// tarihi güvenli gün hesabıyla oluşturulur.
// =====================================================

export function calculateDueDate({
  cycleEnd,
  dueDay,
  manualDueDate = "",
}) {
  if (manualDueDate) {
    const manualDate =
      parseDateValue(
        manualDueDate,
      );

    const cycleEndDate =
      parseDateValue(
        cycleEnd,
      );

    if (
      manualDate.getTime() <=
      cycleEndDate.getTime()
    ) {
      throw new Error(
        "STATEMENT_MANUAL_DUE_DATE_INVALID",
      );
    }

    return {
      dueDate:
        manualDueDate,

      isManualDueDate:
        true,
    };
  }

  const validDueDay =
    validateDueDay(
      dueDay,
    );

  const cycleEndDate =
    parseDateValue(
      cycleEnd,
    );

  const dueDate =
    createSafeDateValue(
      cycleEndDate.getFullYear(),
      cycleEndDate.getMonth() + 1,
      validDueDay,
    );

  return {
    dueDate,

    isManualDueDate:
      false,
  };
}

// =====================================================
// DÜZENLEME
// İşlemin hangi ekstre dönemine ait olduğu posting tarihi
// varsa posting tarihine, yoksa işlem tarihine göre belirlenir.
//
// Kesim gününde yapılan işlem varsayılan olarak mevcut ekstre
// dönemine dahil edilir.
// =====================================================

export function calculateStatementPeriod({
  transactionDate,
  postingDate = "",
  statementDay,
  dueDay = 10,
  manualDueDate = "",
  inclusionRule =
    "include-closing-day",
  referenceDate = "",
}) {
  const validStatementDay =
    validateStatementDay(
      statementDay,
    );

  const effectiveDateValue =
    postingDate ||
    transactionDate;

  const effectiveDate =
    parseDateValue(
      effectiveDateValue,
    );

  const currentMonthClosingDate =
    getClosingDateForMonth(
      effectiveDate.getFullYear(),
      effectiveDate.getMonth(),
      validStatementDay,
    );

  const effectiveDateTimestamp =
    parseDateValue(
      effectiveDateValue,
    ).getTime();

  const currentClosingTimestamp =
    parseDateValue(
      currentMonthClosingDate,
    ).getTime();

  const belongsToCurrentStatement =
    inclusionRule ===
    "move-closing-day-to-next"
      ? effectiveDateTimestamp <
        currentClosingTimestamp
      : effectiveDateTimestamp <=
        currentClosingTimestamp;

  const cycleEnd =
    belongsToCurrentStatement
      ? currentMonthClosingDate
      : getNextClosingDate(
          effectiveDate,
          validStatementDay,
        );

  const previousClosingDate =
    getPreviousClosingDate(
      cycleEnd,
      validStatementDay,
    );

  const cycleStart =
    addDays(
      previousClosingDate,
      1,
    );

  const todayValue =
    referenceDate ||
    formatDateValue(
      new Date(),
    );

  const status =
    parseDateValue(
      todayValue,
    ).getTime() >
    parseDateValue(
      cycleEnd,
    ).getTime()
      ? "closed"
      : "projected";

  const dueDateResult =
    calculateDueDate({
      cycleEnd,

      dueDay,

      manualDueDate,
    });

  return {
    transactionDate,

    postingDate:
      postingDate || "",

    effectiveDate:
      effectiveDateValue,

    estimated:
      !postingDate,

    statementDay:
      validStatementDay,

    dueDay:
      Number(
        dueDay,
      ),

    inclusionRule,

    cycleStart,

    cycleEnd,

    dueDate:
      dueDateResult.dueDate,

    isManualDueDate:
      dueDateResult.isManualDueDate,

    status,
  };
}

// =====================================================
// DÜZENLEME
// Ekstre döneminin yalnızca başlangıç, bitiş ve son ödeme
// bilgilerine ihtiyaç duyulan yerlerde yardımcı yapı kullanılır.
// =====================================================

export function calculateStatementCycle({
  date,
  statementDay,
  dueDay = 10,
  manualDueDate = "",
  inclusionRule =
    "include-closing-day",
}) {
  const result =
    calculateStatementPeriod({
      transactionDate:
        date,

      postingDate: "",

      statementDay,

      dueDay,

      manualDueDate,

      inclusionRule,
    });

  return {
    cycleStart:
      result.cycleStart,

    cycleEnd:
      result.cycleEnd,

    dueDate:
      result.dueDate,

    isManualDueDate:
      result.isManualDueDate,
  };
}
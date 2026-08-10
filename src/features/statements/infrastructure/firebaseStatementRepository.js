import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  db,
} from "../../../firebase";

function convertTimestampToIsoString(
  timestampValue,
) {
  if (!timestampValue) {
    return "";
  }

  if (
    typeof timestampValue.toDate ===
    "function"
  ) {
    return timestampValue
      .toDate()
      .toISOString();
  }

  if (
    typeof timestampValue ===
    "string"
  ) {
    return timestampValue;
  }

  return "";
}

function getCurrentStatementStatus(
  cycleEnd,
  savedStatus,
) {
  if (!cycleEnd) {
    return savedStatus || "projected";
  }

  const currentDate =
    new Date();

  const todayValue =
    `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      currentDate.getDate(),
    ).padStart(2, "0")}`;

  return todayValue > cycleEnd
    ? "closed"
    : "projected";
}

// =====================================================
// 11.GÜN
// Firestore'daki ekstre dönemi belgeleri uygulamanın
// kullanabileceği sade veri yapısına dönüştürülür.
// =====================================================

function mapStatementPeriodDocument(
  statementDocument,
) {
  const data =
    statementDocument.data();

  const statementAmountMinor =
    Number.isInteger(
      data.statementAmountMinor,
    )
      ? data.statementAmountMinor
      : 0;

  const paidAmountMinor =
    Number.isInteger(
      data.paidAmountMinor,
    )
      ? data.paidAmountMinor
      : 0;

  return {
    id:
      statementDocument.id,

    ownerId:
      data.ownerId ?? "",

    creditCardId:
      data.creditCardId ?? "",

    creditCardName:
      data.creditCardName ?? "",

    cycleStart:
      data.cycleStart ?? "",

    cycleEnd:
      data.cycleEnd ?? "",

    closingDate:
      data.closingDate ??
      data.cycleEnd ??
      "",

    dueDate:
      data.dueDate ?? "",

    isManualDueDate:
      Boolean(
        data.isManualDueDate,
      ),

    status:
      getCurrentStatementStatus(
        data.cycleEnd ?? "",
        data.status,
      ),

    statementAmountMinor,

    oneTimePurchasesMinor:
      Number.isInteger(
        data.oneTimePurchasesMinor,
      )
        ? data.oneTimePurchasesMinor
        : 0,

    dueInstallmentsMinor:
      Number.isInteger(
        data.dueInstallmentsMinor,
      )
        ? data.dueInstallmentsMinor
        : 0,

    feesMinor:
      Number.isInteger(
        data.feesMinor,
      )
        ? data.feesMinor
        : 0,

    interestMinor:
      Number.isInteger(
        data.interestMinor,
      )
        ? data.interestMinor
        : 0,

    refundsMinor:
      Number.isInteger(
        data.refundsMinor,
      )
        ? data.refundsMinor
        : 0,

    statementCreditsMinor:
      Number.isInteger(
        data.statementCreditsMinor,
      )
        ? data.statementCreditsMinor
        : 0,

    paidAmountMinor,

    unpaidAmountMinor:
      Math.max(
        statementAmountMinor -
          paidAmountMinor,
        0,
      ),

    estimated:
      Boolean(
        data.estimated,
      ),

    createdAtUtc:
      convertTimestampToIsoString(
        data.createdAtUtc,
      ),

    updatedAtUtc:
      convertTimestampToIsoString(
        data.updatedAtUtc,
      ),

    createdBy:
      data.createdBy ?? "",

    updatedBy:
      data.updatedBy ?? "",

    isDeleted:
      Boolean(
        data.isDeleted,
      ),

    version:
      Number(
        data.version ?? 1,
      ),
  };
}

// =====================================================
// 11.GÜN
// Kullanıcının kredi kartı ekstre dönemleri Firestore
// üzerinden en yeni ekstre önce gelecek şekilde okunur.
// =====================================================

export async function getStatementPeriods(
  userId,
) {
  if (!userId) {
    throw new Error(
      "STATEMENT_USER_REQUIRED",
    );
  }

  const statementPeriodsQuery =
    query(
      collection(
        db,
        "users",
        userId,
        "statementPeriods",
      ),
      orderBy(
        "cycleEnd",
        "desc",
      ),
    );

  const statementPeriodsSnapshot =
    await getDocs(
      statementPeriodsQuery,
    );

  return statementPeriodsSnapshot.docs
    .map(
      mapStatementPeriodDocument,
    )
    .filter(
      (
        statementPeriod,
      ) =>
        !statementPeriod.isDeleted,
    );
}

// =====================================================
// 11.GÜN
// Ekstre ödemesi yeni bir gider transaction oluşturmadan
// doğrudan ilgili ekstrenin ödenen tutarını artırır.
// =====================================================

export async function payStatementPeriod(
  userId,
  statementPeriodId,
  amount,
) {
  if (
    !userId ||
    !statementPeriodId
  ) {
    throw new Error(
      "STATEMENT_PAYMENT_REQUIRED",
    );
  }

  const normalizedAmount =
    typeof amount === "string"
      ? amount.replace(",", ".")
      : amount;

  const amountMinor =
    Math.round(
      Number(normalizedAmount) *
        100,
    );

  if (
    !Number.isInteger(
      amountMinor,
    ) ||
    amountMinor <= 0
  ) {
    throw new Error(
      "STATEMENT_PAYMENT_AMOUNT_INVALID",
    );
  }

  const statementReference =
    doc(
      db,
      "users",
      userId,
      "statementPeriods",
      statementPeriodId,
    );

  await runTransaction(
    db,
    async (
      firestoreTransaction,
    ) => {
      const statementSnapshot =
        await firestoreTransaction.get(
          statementReference,
        );

      if (
        !statementSnapshot.exists()
      ) {
        throw new Error(
          "STATEMENT_NOT_FOUND",
        );
      }

      const statementData =
        statementSnapshot.data();

      const statementAmountMinor =
        Number(
          statementData.statementAmountMinor ??
            0,
        );

      const currentPaidAmountMinor =
        Number(
          statementData.paidAmountMinor ??
            0,
        );

      const remainingAmountMinor =
        Math.max(
          statementAmountMinor -
            currentPaidAmountMinor,
          0,
        );

      if (
        amountMinor >
        remainingAmountMinor
      ) {
        throw new Error(
          "STATEMENT_PAYMENT_EXCEEDS_REMAINING",
        );
      }

      firestoreTransaction.update(
        statementReference,
        {
          paidAmountMinor:
            currentPaidAmountMinor +
            amountMinor,

          updatedBy:
            userId,

          updatedAtUtc:
            serverTimestamp(),

          version:
            Number(
              statementData.version ??
                1,
            ) + 1,
        },
      );
    },
  );

  const updatedSnapshot =
    await getDoc(
      statementReference,
    );

  return mapStatementPeriodDocument(
    updatedSnapshot,
  );
}

// =====================================================
// 11.GÜN
// Kullanıcının gerçek banka ekstresindeki son ödeme tarihi
// farklıysa manuel olarak değiştirebilmesi sağlandı.
// =====================================================

export async function updateStatementDueDate(
  userId,
  statementPeriodId,
  dueDate,
) {
  if (
    !userId ||
    !statementPeriodId ||
    !dueDate
  ) {
    throw new Error(
      "STATEMENT_DUE_DATE_REQUIRED",
    );
  }

  const statementReference =
    doc(
      db,
      "users",
      userId,
      "statementPeriods",
      statementPeriodId,
    );

  const statementSnapshot =
    await getDoc(
      statementReference,
    );

  if (
    !statementSnapshot.exists()
  ) {
    throw new Error(
      "STATEMENT_NOT_FOUND",
    );
  }

  const statementData =
    statementSnapshot.data();

  if (
    statementData.cycleEnd &&
    dueDate <=
      statementData.cycleEnd
  ) {
    throw new Error(
      "STATEMENT_MANUAL_DUE_DATE_INVALID",
    );
  }

  await updateDoc(
    statementReference,
    {
      dueDate,

      isManualDueDate:
        true,

      updatedBy:
        userId,

      updatedAtUtc:
        serverTimestamp(),

      version:
        Number(
          statementData.version ??
            1,
        ) + 1,
    },
  );

  const updatedSnapshot =
    await getDoc(
      statementReference,
    );

  return mapStatementPeriodDocument(
    updatedSnapshot,
  );
}
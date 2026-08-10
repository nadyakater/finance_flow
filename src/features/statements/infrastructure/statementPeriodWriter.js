import {
  doc,
  serverTimestamp,
} from "firebase/firestore";

import {
  db,
} from "../../../firebase";

function calculateStatementAmount(
  values,
) {
  return Math.max(
    Number(
      values.oneTimePurchasesMinor ?? 0,
    ) +
      Number(
        values.dueInstallmentsMinor ?? 0,
      ) +
      Number(
        values.feesMinor ?? 0,
      ) +
      Number(
        values.interestMinor ?? 0,
      ) -
      Number(
        values.refundsMinor ?? 0,
      ) -
      Number(
        values.statementCreditsMinor ?? 0,
      ),
    0,
  );
}

// 11.GÜN - Her kart ve ekstre kapanış tarihi için tek bir belge kimliği oluşturuldu.
export function createStatementPeriodId(
  creditCardId,
  cycleEnd,
) {
  return `${creditCardId}_${cycleEnd}`;
}

// =====================================================
// 11.GÜN
// Yeni kredi kartı harcamasının ait olduğu ekstre dönemi
// mevcutsa güncellenir, yoksa yeni ekstre kaydı hazırlanır.
// =====================================================

export async function prepareStatementPeriodWrite({
  firestoreTransaction,
  userId,
  creditCardId,
  creditCardName,
  statementPeriod,
  oneTimePurchasesMinor = 0,
  dueInstallmentsMinor = 0,
}) {
  const statementPeriodId =
    createStatementPeriodId(
      creditCardId,
      statementPeriod.cycleEnd,
    );

  const statementReference =
    doc(
      db,
      "users",
      userId,
      "statementPeriods",
      statementPeriodId,
    );

  const statementSnapshot =
    await firestoreTransaction.get(
      statementReference,
    );

  const existingData =
    statementSnapshot.exists()
      ? statementSnapshot.data()
      : {};

  const totals = {
    oneTimePurchasesMinor:
      Number(
        existingData.oneTimePurchasesMinor ??
          0,
      ) +
      Number(
        oneTimePurchasesMinor,
      ),

    dueInstallmentsMinor:
      Number(
        existingData.dueInstallmentsMinor ??
          0,
      ) +
      Number(
        dueInstallmentsMinor,
      ),

    feesMinor:
      Number(
        existingData.feesMinor ?? 0,
      ),

    interestMinor:
      Number(
        existingData.interestMinor ?? 0,
      ),

    refundsMinor:
      Number(
        existingData.refundsMinor ?? 0,
      ),

    statementCreditsMinor:
      Number(
        existingData.statementCreditsMinor ??
          0,
      ),
  };

  const statementAmountMinor =
    calculateStatementAmount(
      totals,
    );

  const finalData = {
    ownerId:
      userId,

    creditCardId,

    creditCardName,

    cycleStart:
      statementPeriod.cycleStart,

    cycleEnd:
      statementPeriod.cycleEnd,

    closingDate:
      statementPeriod.cycleEnd,

    dueDate:
      existingData.isManualDueDate
        ? existingData.dueDate
        : statementPeriod.dueDate,

    isManualDueDate:
      Boolean(
        existingData.isManualDueDate,
      ),

    status:
      statementPeriod.status,

    ...totals,

    statementAmountMinor,

    paidAmountMinor:
      Number(
        existingData.paidAmountMinor ??
          0,
      ),

    estimated:
      Boolean(
        existingData.estimated,
      ) ||
      Boolean(
        statementPeriod.estimated,
      ),

    createdBy:
      existingData.createdBy ??
      userId,

    updatedBy:
      userId,

    isDeleted:
      false,

    version:
      statementSnapshot.exists()
        ? Number(
            existingData.version ?? 1,
          ) + 1
        : 1,

    createdAtUtc:
      statementSnapshot.exists()
        ? existingData.createdAtUtc
        : serverTimestamp(),

    updatedAtUtc:
      serverTimestamp(),
  };

  return {
    statementReference,

    finalData,
  };
}

// =====================================================
// 11.GÜN
// Kredi kartı iadesinin ilgili ekstre toplamından
// düşülebilmesi için ekstre iade tutarı güncellenir.
// =====================================================

export async function prepareStatementRefundWrite({
  firestoreTransaction,
  userId,
  creditCardId,
  cycleEnd,
  refundAmountMinor,
}) {
  if (
    !creditCardId ||
    !cycleEnd
  ) {
    return null;
  }

  const statementPeriodId =
    createStatementPeriodId(
      creditCardId,
      cycleEnd,
    );

  const statementReference =
    doc(
      db,
      "users",
      userId,
      "statementPeriods",
      statementPeriodId,
    );

  const statementSnapshot =
    await firestoreTransaction.get(
      statementReference,
    );

  if (
    !statementSnapshot.exists()
  ) {
    return null;
  }

  const existingData =
    statementSnapshot.data();

  const totals = {
    oneTimePurchasesMinor:
      Number(
        existingData.oneTimePurchasesMinor ??
          0,
      ),

    dueInstallmentsMinor:
      Number(
        existingData.dueInstallmentsMinor ??
          0,
      ),

    feesMinor:
      Number(
        existingData.feesMinor ?? 0,
      ),

    interestMinor:
      Number(
        existingData.interestMinor ?? 0,
      ),

    refundsMinor:
      Number(
        existingData.refundsMinor ?? 0,
      ) +
      Number(
        refundAmountMinor,
      ),

    statementCreditsMinor:
      Number(
        existingData.statementCreditsMinor ??
          0,
      ),
  };

  return {
    statementReference,

    finalData: {
      ...existingData,

      ...totals,

      statementAmountMinor:
        calculateStatementAmount(
          totals,
        ),

      updatedBy:
        userId,

      updatedAtUtc:
        serverTimestamp(),

      version:
        Number(
          existingData.version ?? 1,
        ) + 1,
    },
  };
}

// 11.GÜN - Hazırlanan ekstre belgesi ana Firestore transaction işlemi içinde atomik olarak yazılır.
export function writeStatementPeriod({
  firestoreTransaction,
  statementReference,
  finalData,
}) {
  firestoreTransaction.set(
    statementReference,
    finalData,
  );
}
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../../../firebase";

function convertTimestampToIsoString(timestampValue) {
  if (!timestampValue) {
    return "";
  }

  if (typeof timestampValue.toDate === "function") {
    return timestampValue.toDate().toISOString();
  }

  if (typeof timestampValue === "string") {
    return timestampValue;
  }

  return "";
}

function mapInstallmentEntry(installment) {
  return {
    installmentNumber: Number(
      installment.installmentNumber ?? 0,
    ),

    amountMinor: Number.isInteger(
      installment.amountMinor,
    )
      ? installment.amountMinor
      : 0,

    statementDate:
      installment.statementDate ?? "",

    status:
      installment.status ?? "planned",
  };
}

function mapInstallmentPlanDocument(
  installmentPlanDocument,
) {
  const data =
    installmentPlanDocument.data();

  return {
    id: installmentPlanDocument.id,

    ownerId:
      data.ownerId ?? "",

    sourceTransactionId:
      data.sourceTransactionId ?? "",

    creditCardId:
      data.creditCardId ?? "",

    creditCardName:
      data.creditCardName ?? "",

    totalAmountMinor:
      Number.isInteger(
        data.totalAmountMinor,
      )
        ? data.totalAmountMinor
        : 0,

    installmentCount:
      Number(
        data.installmentCount ?? 0,
      ),

    firstStatementDate:
      data.firstStatementDate ?? "",

    transactionDate:
      data.transactionDate ?? "",

    installments:
      Array.isArray(data.installments)
        ? data.installments.map(
            mapInstallmentEntry,
          )
        : [],

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
      Boolean(data.isDeleted),

    version:
      Number(data.version ?? 1),
  };
}

// =====================================================
// 11.GÜN
// Kullanıcının Firestore altında bulunan taksit planları
// okunarak Redux katmanına gönderilecek veri hazırlanır.
//
// Taksitler kartlara ve ekstre aylarına göre daha sonra
// selector içerisinde gruplanacaktır.
// =====================================================
export async function getInstallmentPlans(
  userId,
) {
  if (!userId) {
    throw new Error(
      "INSTALLMENT_USER_REQUIRED",
    );
  }

  const installmentPlansQuery =
    query(
      collection(
        db,
        "users",
        userId,
        "installmentPlans",
      ),
      orderBy(
        "createdAtUtc",
        "desc",
      ),
    );

  const installmentPlansSnapshot =
    await getDocs(
      installmentPlansQuery,
    );

  return installmentPlansSnapshot.docs
    .map(
      mapInstallmentPlanDocument,
    )
    .filter(
      (installmentPlan) =>
        !installmentPlan.isDeleted,
    );
}
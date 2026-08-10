import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";

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

function convertLimitToMinor(limit) {
  const normalizedLimit =
    typeof limit === "string"
      ? limit.replace(",", ".")
      : limit;

  const numericLimit =
    Number(normalizedLimit);

  if (
    !Number.isFinite(numericLimit) ||
    numericLimit <= 0
  ) {
    throw new Error(
      "CREDIT_CARD_LIMIT_INVALID",
    );
  }

  return Math.round(
    numericLimit * 100,
  );
}

function validateDay(
  day,
  errorCode,
) {
  const numericDay =
    Number(day);

  if (
    !Number.isInteger(numericDay) ||
    numericDay < 1 ||
    numericDay > 31
  ) {
    throw new Error(errorCode);
  }

  return numericDay;
}

function validateLastFourDigits(
  lastFourDigits,
) {
  const normalizedDigits =
    String(
      lastFourDigits ?? "",
    ).trim();

  if (!normalizedDigits) {
    return "";
  }

  if (
    !/^\d{4}$/.test(
      normalizedDigits,
    )
  ) {
    throw new Error(
      "CREDIT_CARD_LAST_FOUR_DIGITS_INVALID",
    );
  }

  return normalizedDigits;
}

function mapCreditCardDocument(
  creditCardDocument,
) {
  const data =
    creditCardDocument.data();

  return {
    id:
      creditCardDocument.id,

    ownerId:
      data.ownerId ?? "",

    name:
      data.name ?? "",

    issuer:
      data.issuer ?? "",

    lastFourDigits:
      data.lastFourDigits ?? "",

    limitMinor:
      Number.isInteger(
        data.limitMinor,
      )
        ? data.limitMinor
        : 0,

    statementDay:
      Number(
        data.statementDay ?? 31,
      ),

    // 11.GÜN - Kredi kartının varsayılan son ödeme günü Firestore kaydından okunur.
    dueDay:
      Number(
        data.dueDay ?? 10,
      ),

    linkedPaymentAccountId:
      data.linkedPaymentAccountId ?? "",

    isActive:
      data.isActive !== false,

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

function sortCreditCards(
  creditCards,
) {
  return creditCards.sort(
    (
      firstCreditCard,
      secondCreditCard,
    ) =>
      firstCreditCard.name.localeCompare(
        secondCreditCard.name,
        "tr",
      ),
  );
}

// 9.GÜN - Kullanıcının kredi kartı kayıtlarının Firestore üzerinden getirilmesi sağlandı.
export async function getCreditCards(
  userId,
) {
  if (!userId) {
    throw new Error(
      "CREDIT_CARD_USER_REQUIRED",
    );
  }

  const creditCardsSnapshot =
    await getDocs(
      collection(
        db,
        "users",
        userId,
        "creditCards",
      ),
    );

  const creditCards =
    creditCardsSnapshot.docs
      .map(
        mapCreditCardDocument,
      )
      .filter(
        (creditCard) =>
          !creditCard.isDeleted,
      );

  return sortCreditCards(
    creditCards,
  );
}

// 9.GÜN - Kredi kartı modelinin Firestore creditCards koleksiyonuna kaydedilmesi sağlandı.
export async function createCreditCard(
  userId,
  creditCard,
) {
  if (!userId) {
    throw new Error(
      "CREDIT_CARD_USER_REQUIRED",
    );
  }

  const name =
    creditCard.name?.trim();

  if (!name) {
    throw new Error(
      "CREDIT_CARD_NAME_REQUIRED",
    );
  }

  const issuer =
    creditCard.issuer?.trim();

  if (!issuer) {
    throw new Error(
      "CREDIT_CARD_ISSUER_REQUIRED",
    );
  }

  const lastFourDigits =
    validateLastFourDigits(
      creditCard.lastFourDigits,
    );

  const limitMinor =
    convertLimitToMinor(
      creditCard.limit,
    );

  const statementDay =
    validateDay(
      creditCard.statementDay ?? 31,
      "CREDIT_CARD_STATEMENT_DAY_INVALID",
    );

  // =====================================================
  // 11.GÜN
  // Kredi kartının son ödeme günü kullanıcıdan ayrıca
  // istenmeden varsayılan değer ile teknik olarak saklanır.
  //
  // Bu bilgi ekstre kapanışından sonraki son ödeme tarihinin
  // otomatik hesaplanmasında kullanılacaktır.
  // =====================================================
  const dueDay =
    validateDay(
      creditCard.dueDay ?? 10,
      "CREDIT_CARD_DUE_DAY_INVALID",
    );

  const creditCardReference =
    await addDoc(
      collection(
        db,
        "users",
        userId,
        "creditCards",
      ),
      {
        ownerId:
          userId,

        name,

        issuer,

        lastFourDigits,

        limitMinor,

        statementDay,

        dueDay,

        linkedPaymentAccountId:
          creditCard.linkedPaymentAccountId ??
          "",

        isActive:
          true,

        createdBy:
          userId,

        updatedBy:
          userId,

        isDeleted:
          false,

        version: 1,

        createdAtUtc:
          serverTimestamp(),

        updatedAtUtc:
          serverTimestamp(),
      },
    );

  const creditCardSnapshot =
    await getDoc(
      creditCardReference,
    );

  return mapCreditCardDocument(
    creditCardSnapshot,
  );
}

// 9.GÜN - Kapatılan kartların silinmeden geçmiş raporlarda korunması sağlandı.
export async function updateCreditCardActiveStatus(
  userId,
  creditCardId,
  isActive,
) {
  if (!userId) {
    throw new Error(
      "CREDIT_CARD_USER_REQUIRED",
    );
  }

  const creditCardReference =
    doc(
      db,
      "users",
      userId,
      "creditCards",
      creditCardId,
    );

  const creditCardSnapshot =
    await getDoc(
      creditCardReference,
    );

  if (
    !creditCardSnapshot.exists()
  ) {
    throw new Error(
      "CREDIT_CARD_NOT_FOUND",
    );
  }

  const currentCreditCard =
    creditCardSnapshot.data();

  await updateDoc(
    creditCardReference,
    {
      isActive:
        Boolean(isActive),

      updatedBy:
        userId,

      updatedAtUtc:
        serverTimestamp(),

      version:
        Number(
          currentCreditCard.version ??
            1,
        ) + 1,
    },
  );

  const updatedCreditCardSnapshot =
    await getDoc(
      creditCardReference,
    );

  return mapCreditCardDocument(
    updatedCreditCardSnapshot,
  );
}
import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../../firebase";

function convertAmountToMinor(amount) {
  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "TRANSACTION_INVALID_AMOUNT",
    );
  }

  return Math.round(
    numericAmount * 100,
  );
}

function mapTransactionDocument(
  transactionDocument,
) {
  const data =
    transactionDocument.data();

  const createdAt =
    data.createdAtUtc?.toDate();

  const amountMinor =
    Number.isInteger(data.amountMinor)
      ? data.amountMinor
      : Math.round(
          Number(data.amount ?? 0) *
            100,
        );

  return {
    id: transactionDocument.id,

    transactionType:
      data.transactionType ?? "",

    // 4.GÜN - Gelir gider kategori bilgisi eklendi.
    category:
      data.category ?? "",

    // 5.GÜN - Kategori kimliği ve kategori yolu işlem modeline eklendi.
    categoryId:
      data.categoryId ?? "",

    categoryPath:
      data.categoryPath ??
      data.category ??
      "",

    categoryPathIds:
      Array.isArray(
        data.categoryPathIds,
      )
        ? data.categoryPathIds
        : [],

    categoryType:
      data.categoryType ?? "",

    // 4.GÜN - Kullanıcının girdiği miktar bilgisi eklendi.
    amount: amountMinor / 100,

    // 5.GÜN - Para miktarı kuruş cinsinden tam sayı olarak saklandı.
    amountMinor,

    createdAtUtc: createdAt
      ? createdAt.toISOString()
      : "",
  };
}

// 3.GÜN - Gelir ve gider kayıtlarının Firestore'a eklenmesi sağlandı.
// 4.GÜN - Gelir gider kategori ve miktar kaydı eklendi.
// 5.GÜN - Kategori ağacı bilgileri ve kuruş bazlı miktar kaydı eklendi.
export async function createTransaction(
  userId,
  transaction,
) {
  const amountMinor =
    convertAmountToMinor(
      transaction.amount,
    );

  const transactionReference =
    await addDoc(
      collection(
        db,
        "users",
        userId,
        "transactions",
      ),
      {
        ownerId: userId,

        transactionType:
          transaction.transactionType,

        // 4.GÜN - Seçilen kategori Firebase'e kaydediliyor.
        category:
          transaction.category,

        // 5.GÜN - Seçilen kategorinin kimliği ve tam yolu Firebase'e kaydedildi.
        categoryId:
          transaction.categoryId,

        categoryPath:
          transaction.categoryPath,

        categoryPathIds:
          transaction.categoryPathIds,

        categoryType:
          transaction.categoryType,

        // 5.GÜN - Kullanıcı miktarı kuruş cinsinden Firebase'e kaydedildi.
        amountMinor,

        createdAtUtc:
          serverTimestamp(),
      },
    );

  const transactionSnapshot =
    await getDoc(
      transactionReference,
    );

  return mapTransactionDocument(
    transactionSnapshot,
  );
}

// 3.GÜN - Kullanıcının gelir ve gider kayıtları Firestore'dan getirildi.
export async function getTransactions(
  userId,
) {
  const transactionsQuery =
    query(
      collection(
        db,
        "users",
        userId,
        "transactions",
      ),
      orderBy(
        "createdAtUtc",
        "desc",
      ),
    );

  const transactionsSnapshot =
    await getDocs(
      transactionsQuery,
    );

  return transactionsSnapshot.docs.map(
    mapTransactionDocument,
  );
}
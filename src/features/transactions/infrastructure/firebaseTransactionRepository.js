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

function mapTransactionDocument(
  transactionDocument,
) {
  const data = transactionDocument.data();

  const createdAt =
    data.createdAtUtc?.toDate();

  return {
    id: transactionDocument.id,
    transactionType:
      data.transactionType ?? "",
    incomeType: data.incomeType ?? "",
    createdAtUtc: createdAt
      ? createdAt.toISOString()
      : "",
  };
}

// 3.GÜN - Gelir ve gider kayıtlarının Firestore'a eklenmesi sağlandı.
export async function createTransaction(
  userId,
  transaction,
) {
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
        incomeType:
          transaction.transactionType ===
          "Gelir"
            ? transaction.incomeType
            : "",
        createdAtUtc: serverTimestamp(),
      },
    );

  const transactionSnapshot =
    await getDoc(transactionReference);

  return mapTransactionDocument(
    transactionSnapshot,
  );
}

// 3.GÜN - Kullanıcının gelir ve gider kayıtları Firestore'dan getirildi.
export async function getTransactions(
  userId,
) {
  const transactionsQuery = query(
    collection(
      db,
      "users",
      userId,
      "transactions",
    ),
    orderBy("createdAtUtc", "desc"),
  );

  const transactionsSnapshot =
    await getDocs(transactionsQuery);

  return transactionsSnapshot.docs.map(
    mapTransactionDocument,
  );
}
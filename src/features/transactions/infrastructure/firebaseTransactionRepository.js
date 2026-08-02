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
  const data =
    transactionDocument.data();

  const createdAt =
    data.createdAtUtc?.toDate();

  return {
    id: transactionDocument.id,

    transactionType:
      data.transactionType ?? "",

    // 4.GÜN - Gelir gider kategori bilgisi eklendi.
    category:
      data.category ?? "",

    // 4.GÜN - Kullanıcının girdiği miktar bilgisi eklendi.
    amount:
      data.amount ?? 0,

    createdAtUtc: createdAt
      ? createdAt.toISOString()
      : "",
  };
}


// 3.GÜN - Gelir ve gider kayıtlarının Firestore'a eklenmesi sağlandı.
// 4.GÜN - Gelir gider kategori ve miktar kaydı eklendi.
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


        // 4.GÜN - Seçilen kategori Firebase'e kaydediliyor.
        category:
          transaction.category,


        // 4.GÜN - Kullanıcı miktarını Firebase'e kaydediyor.
        amount:
          Number(transaction.amount),


        createdAtUtc:
          serverTimestamp(),
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
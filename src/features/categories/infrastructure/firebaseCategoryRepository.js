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

// =====================================================
// 5.GÜN
// 3.7 - Sınırsız Kategori Ağacı
// Firestore kategori işlemleri oluşturuldu.
// =====================================================

// 5.GÜN - Firestore dokümanını Category nesnesine dönüştürür.
function mapCategoryDocument(
  categoryDocument,
) {
  const data =
    categoryDocument.data();

  const createdAt =
    data.createdAtUtc?.toDate();

  return {
    id: categoryDocument.id,

    name:
      data.name ?? "",

    // 5.GÜN - Alt kategori desteği için parentId tutuluyor.
    parentId:
      data.parentId ?? null,

    createdAtUtc: createdAt
      ? createdAt.toISOString()
      : "",
  };
}

// 5.GÜN - Yeni kategori Firestore'a kaydedilir.
export async function createCategory(
  userId,
  category,
) {
  const categoryReference =
    await addDoc(
      collection(
        db,
        "users",
        userId,
        "categories",
      ),
      {
        ownerId: userId,

        name:
          category.name,

        // 5.GÜN - Üst kategori bilgisi.
        parentId:
          category.parentId ?? null,

        createdAtUtc:
          serverTimestamp(),
      },
    );

  const categorySnapshot =
    await getDoc(
      categoryReference,
    );

  return mapCategoryDocument(
    categorySnapshot,
  );
}

// 5.GÜN - Kullanıcının kategorileri Firestore'dan getirilir.
export async function getCategories(
  userId,
) {
  const categoryQuery =
    query(
      collection(
        db,
        "users",
        userId,
        "categories",
      ),
      orderBy(
        "createdAtUtc",
        "asc",
      ),
    );

  const categorySnapshot =
    await getDocs(
      categoryQuery,
    );

  return categorySnapshot.docs.map(
    mapCategoryDocument,
  );
}
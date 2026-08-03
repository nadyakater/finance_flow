import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../firebase";

function normalizeCategoryName(name) {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function isParentTypeAllowed(
  categoryType,
  parentCategoryType,
) {
  if (categoryType === "both") {
    return parentCategoryType === "both";
  }

  return (
    parentCategoryType === "both" ||
    parentCategoryType === categoryType
  );
}

function sortCategories(categories) {
  return [...categories].sort(
    (firstCategory, secondCategory) =>
      firstCategory.pathNames
        .join(" > ")
        .localeCompare(
          secondCategory.pathNames.join(
            " > ",
          ),
          "tr",
        ),
  );
}

function mapCategoryDocument(
  categoryDocument,
) {
  const data =
    categoryDocument.data();

  const createdAt =
    data.createdAtUtc?.toDate();

  const updatedAt =
    data.updatedAtUtc?.toDate();

  return {
    id: categoryDocument.id,
    ownerId: data.ownerId ?? "",
    name: data.name ?? "",
    normalizedName:
      data.normalizedName ?? "",
    parentId: data.parentId ?? null,

    pathIds: Array.isArray(
      data.pathIds,
    )
      ? data.pathIds
      : [categoryDocument.id],

    pathNames: Array.isArray(
      data.pathNames,
    )
      ? data.pathNames
      : [data.name ?? ""],

    depth: Number(data.depth ?? 0),

    categoryType:
      data.categoryType ?? "expense",

    isSelectable:
      data.isSelectable !== false,

    isArchived:
      data.isArchived === true,

    createdAtUtc: createdAt
      ? createdAt.toISOString()
      : "",

    updatedAtUtc: updatedAt
      ? updatedAt.toISOString()
      : "",
  };
}

function getCategoryCollection(userId) {
  return collection(
    db,
    "users",
    userId,
    "categories",
  );
}

// 5.GÜN - Kullanıcının kategori ağacı Firestore üzerinden getirildi.
export async function getCategories(
  userId,
) {
  const categoriesSnapshot =
    await getDocs(
      getCategoryCollection(userId),
    );

  const categories =
    categoriesSnapshot.docs.map(
      mapCategoryDocument,
    );

  return sortCategories(categories);
}

// 5.GÜN - Ana kategori veya alt kategori kaydının oluşturulması sağlandı.
export async function createCategoryDocument(
  userId,
  category,
) {
  const categoryName =
    category.name.trim();

  if (!categoryName) {
    throw new Error(
      "CATEGORY_NAME_REQUIRED",
    );
  }

  const categories =
    await getCategories(userId);

  const parentCategory =
    category.parentId
      ? categories.find(
          (item) =>
            item.id === category.parentId,
        )
      : null;

  if (
    category.parentId &&
    !parentCategory
  ) {
    throw new Error(
      "CATEGORY_PARENT_NOT_FOUND",
    );
  }

  if (parentCategory?.isArchived) {
    throw new Error(
      "CATEGORY_PARENT_ARCHIVED",
    );
  }

  if (
    parentCategory &&
    !isParentTypeAllowed(
      category.categoryType,
      parentCategory.categoryType,
    )
  ) {
    throw new Error(
      "CATEGORY_TYPE_MISMATCH",
    );
  }

  const normalizedName =
    normalizeCategoryName(categoryName);

  const duplicateCategory =
    categories.find(
      (item) =>
        !item.isArchived &&
        item.parentId ===
          (category.parentId || null) &&
        item.normalizedName ===
          normalizedName,
    );

  if (duplicateCategory) {
    throw new Error(
      "CATEGORY_DUPLICATE",
    );
  }

  const categoryReference = doc(
    getCategoryCollection(userId),
  );

  const pathIds = parentCategory
    ? [
        ...parentCategory.pathIds,
        categoryReference.id,
      ]
    : [categoryReference.id];

  const pathNames = parentCategory
    ? [
        ...parentCategory.pathNames,
        categoryName,
      ]
    : [categoryName];

  await setDoc(categoryReference, {
    ownerId: userId,
    name: categoryName,
    normalizedName,
    parentId:
      category.parentId || null,
    pathIds,
    pathNames,
    depth: pathIds.length - 1,
    categoryType:
      category.categoryType,
    isSelectable: true,
    isArchived: false,
    createdAtUtc: serverTimestamp(),
    updatedAtUtc: serverTimestamp(),
  });

  const categorySnapshot =
    await getDoc(categoryReference);

  return mapCategoryDocument(
    categorySnapshot,
  );
}

// 5.GÜN - Kategori ve bütün alt kategorilerinin yolu güvenli toplu işlemle güncellendi.
export async function moveCategoryDocument(
  userId,
  categoryId,
  newParentId,
) {
  const categories =
    await getCategories(userId);

  const selectedCategory =
    categories.find(
      (item) => item.id === categoryId,
    );

  if (!selectedCategory) {
    throw new Error(
      "CATEGORY_NOT_FOUND",
    );
  }

  const newParentCategory =
    newParentId
      ? categories.find(
          (item) =>
            item.id === newParentId,
        )
      : null;

  if (
    newParentId &&
    !newParentCategory
  ) {
    throw new Error(
      "CATEGORY_PARENT_NOT_FOUND",
    );
  }

  if (newParentCategory?.isArchived) {
    throw new Error(
      "CATEGORY_PARENT_ARCHIVED",
    );
  }

  if (
    newParentCategory?.pathIds.includes(
      categoryId,
    )
  ) {
    throw new Error(
      "CATEGORY_INVALID_PARENT",
    );
  }

  if (
    newParentCategory &&
    !isParentTypeAllowed(
      selectedCategory.categoryType,
      newParentCategory.categoryType,
    )
  ) {
    throw new Error(
      "CATEGORY_TYPE_MISMATCH",
    );
  }

  const duplicateCategory =
    categories.find(
      (item) =>
        item.id !== categoryId &&
        !item.isArchived &&
        item.parentId ===
          (newParentId || null) &&
        item.normalizedName ===
          selectedCategory.normalizedName,
    );

  if (duplicateCategory) {
    throw new Error(
      "CATEGORY_DUPLICATE",
    );
  }

  const affectedCategories =
    categories.filter((item) =>
      item.pathIds.includes(categoryId),
    );

  if (affectedCategories.length > 450) {
    throw new Error(
      "CATEGORY_TREE_TOO_LARGE",
    );
  }

  const newParentPathIds =
    newParentCategory?.pathIds ?? [];

  const newParentPathNames =
    newParentCategory?.pathNames ?? [];

  const batch = writeBatch(db);

  affectedCategories.forEach(
    (categoryItem) => {
      const categoryIndex =
        categoryItem.pathIds.indexOf(
          categoryId,
        );

      const relativePathIds =
        categoryItem.pathIds.slice(
          categoryIndex,
        );

      const relativePathNames =
        categoryItem.pathNames.slice(
          categoryIndex,
        );

      const updatedPathIds = [
        ...newParentPathIds,
        ...relativePathIds,
      ];

      const updatedPathNames = [
        ...newParentPathNames,
        ...relativePathNames,
      ];

      const categoryReference = doc(
        db,
        "users",
        userId,
        "categories",
        categoryItem.id,
      );

      batch.update(categoryReference, {
        parentId:
          categoryItem.id === categoryId
            ? newParentId || null
            : categoryItem.parentId,

        pathIds: updatedPathIds,
        pathNames: updatedPathNames,

        depth:
          updatedPathIds.length - 1,

        updatedAtUtc:
          serverTimestamp(),
      });
    },
  );

  await batch.commit();

  return getCategories(userId);
}

// 5.GÜN - Seçilen kategori ve alt kategorileri silmeden arşivlendi.
export async function archiveCategoryDocument(
  userId,
  categoryId,
) {
  const categories =
    await getCategories(userId);

  const selectedCategory =
    categories.find(
      (item) => item.id === categoryId,
    );

  if (!selectedCategory) {
    throw new Error(
      "CATEGORY_NOT_FOUND",
    );
  }

  const affectedCategories =
    categories.filter((item) =>
      item.pathIds.includes(categoryId),
    );

  if (affectedCategories.length > 450) {
    throw new Error(
      "CATEGORY_TREE_TOO_LARGE",
    );
  }

  const batch = writeBatch(db);

  affectedCategories.forEach(
    (categoryItem) => {
      const categoryReference = doc(
        db,
        "users",
        userId,
        "categories",
        categoryItem.id,
      );

      batch.update(categoryReference, {
        isArchived: true,

        updatedAtUtc:
          serverTimestamp(),
      });
    },
  );

  await batch.commit();

  return affectedCategories.map(
    (item) => item.id,
  );
}

// 5.GÜN - Arşivlenen kategori üst ve alt kategorileriyle birlikte yeniden aktif hale getirildi.
export async function restoreCategoryDocument(
  userId,
  categoryId,
) {
  const categories =
    await getCategories(userId);

  const selectedCategory =
    categories.find(
      (item) => item.id === categoryId,
    );

  if (!selectedCategory) {
    throw new Error(
      "CATEGORY_NOT_FOUND",
    );
  }

  const descendantCategories =
    categories.filter((item) =>
      item.pathIds.includes(categoryId),
    );

  const ancestorCategories =
    categories.filter((item) =>
      selectedCategory.pathIds.includes(
        item.id,
      ),
    );

  const affectedCategoryMap =
    new Map();

  [
    ...ancestorCategories,
    ...descendantCategories,
  ].forEach((categoryItem) => {
    affectedCategoryMap.set(
      categoryItem.id,
      categoryItem,
    );
  });

  const affectedCategories = [
    ...affectedCategoryMap.values(),
  ];

  if (affectedCategories.length > 450) {
    throw new Error(
      "CATEGORY_TREE_TOO_LARGE",
    );
  }

  const batch = writeBatch(db);

  affectedCategories.forEach(
    (categoryItem) => {
      const categoryReference = doc(
        db,
        "users",
        userId,
        "categories",
        categoryItem.id,
      );

      batch.update(categoryReference, {
        isArchived: false,

        updatedAtUtc:
          serverTimestamp(),
      });
    },
  );

  await batch.commit();

  return affectedCategories.map(
    (item) => item.id,
  );
}
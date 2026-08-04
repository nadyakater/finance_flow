import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../../firebase";

function normalizeText(value) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function validateName(name) {
  if (!name?.trim()) {
    throw new Error(
      "CATALOG_NAME_REQUIRED",
    );
  }
}

function mapCatalogDocument(
  catalogDocument,
) {
  const data =
    catalogDocument.data();

  const createdAt =
    data.createdAtUtc?.toDate();

  return {
    id: catalogDocument.id,

    ...data,

    createdAtUtc: createdAt
      ? createdAt.toISOString()
      : "",
  };
}

async function getCollectionItems(
  userId,
  collectionName,
) {
  const snapshot = await getDocs(
    collection(
      db,
      "users",
      userId,
      collectionName,
    ),
  );

  return snapshot.docs
    .map(mapCatalogDocument)
    .sort((firstItem, secondItem) =>
      firstItem.name.localeCompare(
        secondItem.name,
        "tr",
      ),
    );
}

async function createCatalogDocument(
  userId,
  collectionName,
  documentData,
) {
  const documentReference =
    await addDoc(
      collection(
        db,
        "users",
        userId,
        collectionName,
      ),
      {
        ownerId: userId,

        ...documentData,

        createdAtUtc:
          serverTimestamp(),
      },
    );

  const documentSnapshot =
    await getDoc(
      documentReference,
    );

  return mapCatalogDocument(
    documentSnapshot,
  );
}

// 6.GÜN - Firma, şube, marka ve ürün kayıtlarının birlikte getirilmesi sağlandı.
export async function getCatalogData(
  userId,
) {
  const [
    merchants,
    branches,
    brands,
    products,
  ] = await Promise.all([
    getCollectionItems(
      userId,
      "merchants",
    ),

    getCollectionItems(
      userId,
      "branches",
    ),

    getCollectionItems(
      userId,
      "brands",
    ),

    getCollectionItems(
      userId,
      "products",
    ),
  ]);

  return {
    merchants,
    branches,
    brands,
    products,
  };
}

// 6.GÜN - Gider kayıtlarında kullanılacak firma kaydının oluşturulması sağlandı.
export async function createMerchant(
  userId,
  merchant,
) {
  validateName(merchant.name);

  const name = merchant.name.trim();

  return createCatalogDocument(
    userId,
    "merchants",
    {
      name,

      normalizedName:
        normalizeText(name),
    },
  );
}

// 6.GÜN - Seçilen firmaya bağlı şube kaydının oluşturulması sağlandı.
export async function createBranch(
  userId,
  branch,
) {
  validateName(branch.name);

  if (!branch.merchantId) {
    throw new Error(
      "CATALOG_MERCHANT_REQUIRED",
    );
  }

  const name = branch.name.trim();

  return createCatalogDocument(
    userId,
    "branches",
    {
      merchantId:
        branch.merchantId,

      merchantName:
        branch.merchantName?.trim() ??
        "",

      name,

      normalizedName:
        normalizeText(name),

      address:
        branch.address?.trim() ??
        "",
    },
  );
}

// 6.GÜN - Gider satırlarında kullanılacak marka kaydının oluşturulması sağlandı.
export async function createBrand(
  userId,
  brand,
) {
  validateName(brand.name);

  const name = brand.name.trim();

  return createCatalogDocument(
    userId,
    "brands",
    {
      name,

      normalizedName:
        normalizeText(name),
    },
  );
}

// 6.GÜN - Gider satırlarında tekrar kullanılabilecek ürün kaydının oluşturulması sağlandı.
export async function createProduct(
  userId,
  product,
) {
  validateName(product.name);

  const name = product.name.trim();

  const aliases = Array.isArray(
    product.aliases,
  )
    ? product.aliases
        .map((alias) => alias.trim())
        .filter(Boolean)
    : [];

  return createCatalogDocument(
    userId,
    "products",
    {
      name,

      normalizedName:
        normalizeText(name),

      aliases,

      normalizedAliases:
        aliases.map(normalizeText),

      brandId:
        product.brandId ?? "",

      brandName:
        product.brandName?.trim() ??
        "",
    },
  );
}
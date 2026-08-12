// 12.GÜN - 3.21 - Global aramada Türkçe karakter ve büyük küçük harf farklılıklarının eşleşebilmesi için metin normalizasyonu oluşturuldu.
export function normalizeSearchText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .trim();
}

// 12.GÜN - 3.21 - İşlem satırındaki ürünün katalogdaki alternatif adları bulunarak arama metnine dahil edildi.
function getProductAliases(
  line,
  products,
) {
  if (!line?.productId) {
    return [];
  }

  const product = products.find(
    (item) =>
      item.id === line.productId,
  );

  return Array.isArray(
    product?.aliases,
  )
    ? product.aliases
    : [];
}

// 12.GÜN - 3.21 - Bir işlem ve gider satırının global arama sorgusuyla eşleşip eşleşmediği hesaplandı.
function matchesSearchQuery({
  transaction,
  line,
  products,
  normalizedQuery,
}) {
  const aliases =
    getProductAliases(
      line,
      products,
    );

  const searchableValues = [
    transaction.description,

    transaction.merchantName,

    transaction.branchName,

    transaction.category,

    transaction.categoryPath,

    line?.note,

    line?.productName,

    line?.brandName,

    line?.category,

    line?.categoryPath,

    ...aliases,
  ];

  return searchableValues.some(
    (value) =>
      normalizeSearchText(
        value,
      ).includes(
        normalizedQuery,
      ),
  );
}

function getTransactionDateValue(
  transaction,
) {
  const dateValue =
    transaction.transactionDate ||
    transaction.createdAtUtc;

  const timestamp = new Date(
    dateValue,
  ).getTime();

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : 0;
}

// 12.GÜN - 3.21 - Global arama sonuçları transaction ve gider satırı bilgileriyle tarih sırasına göre hazırlandı.
export function searchTransactions({
  transactions,
  products,
  query,
}) {
  const normalizedQuery =
    normalizeSearchText(
      query,
    );

  if (!normalizedQuery) {
    return [];
  }

  const results = [];

  transactions.forEach(
    (transaction) => {
      const lines =
        Array.isArray(
          transaction.lines,
        )
          ? transaction.lines
          : [];

      if (lines.length === 0) {
        if (
          matchesSearchQuery({
            transaction,

            line: null,

            products,

            normalizedQuery,
          })
        ) {
          results.push({
            id:
              transaction.id,

            transactionId:
              transaction.id,

            transactionType:
              transaction.transactionType,

            transactionDate:
              transaction.transactionDate ||
              transaction.createdAtUtc,

            description:
              transaction.description ||
              "",

            categoryPath:
              transaction.categoryPath ||
              transaction.category ||
              "-",

            productName:
              "-",

            brandName:
              "-",

            merchantName:
              transaction.merchantName ||
              "-",

            branchName:
              transaction.branchName ||
              "-",

            amountMinor:
              Number(
                transaction.amountMinor ??
                  0,
              ),
          });
        }

        return;
      }

      lines.forEach(
        (
          line,
          lineIndex,
        ) => {
          if (
            !matchesSearchQuery({
              transaction,

              line,

              products,

              normalizedQuery,
            })
          ) {
            return;
          }

          results.push({
            id: `${transaction.id}-${line.id ?? lineIndex}`,

            transactionId:
              transaction.id,

            transactionType:
              transaction.transactionType,

            transactionDate:
              transaction.transactionDate ||
              transaction.createdAtUtc,

            description:
              transaction.description ||
              line.note ||
              "",

            categoryPath:
              line.categoryPath ||
              line.category ||
              transaction.categoryPath ||
              transaction.category ||
              "-",

            productName:
              line.productName ||
              "-",

            brandName:
              line.brandName ||
              "-",

            merchantName:
              transaction.merchantName ||
              "-",

            branchName:
              transaction.branchName ||
              "-",

            amountMinor:
              Number(
                line.netAmountMinor ??
                  line.amountMinor ??
                  transaction.amountMinor ??
                  0,
              ),
          });
        },
      );
    },
  );

  return results.sort(
    (
      firstResult,
      secondResult,
    ) =>
      getTransactionDateValue(
        secondResult,
      ) -
      getTransactionDateValue(
        firstResult,
      ),
  );
}
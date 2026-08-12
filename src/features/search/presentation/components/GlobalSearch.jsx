import { useMemo, useState } from "react";

import { useSelector } from "react-redux";

import { selectProducts } from "../../../catalog/presentation/catalogSelectors";

import { selectTransactions } from "../../../transactions/presentation/transactionSelectors";

import { searchTransactions } from "../../domain/searchCalculations";

// 12.GÜN - 3.21 - Finansal işlemler için açıklama, ürün, marka, firma, şube ve kategori üzerinden global arama ekranı oluşturuldu.
function GlobalSearch({ formatAmount, formatTransactionDate }) {
  const transactions = useSelector(selectTransactions);

  const products = useSelector(selectProducts);

  const [searchQuery, setSearchQuery] = useState("");

  // 12.GÜN - 3.21 - Kullanıcının arama metnine uygun sonuçlar yalnızca sorgu değiştiğinde yeniden hesaplandı.
  const searchResults = useMemo(
    () =>
      searchTransactions({
        transactions,

        products,

        query: searchQuery,
      }),
    [products, searchQuery, transactions],
  );

  const hasSearchQuery = searchQuery.trim().length > 0;

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <section className="category-management-section">
      <div className="filter-heading-row">
        <div>
          <h2 className="section-title">Global Arama</h2>

          <p className="selected-category-text">
            Açıklama, ürün, alternatif ürün adı, marka, firma, şube veya
            kategori yolu üzerinden arama yapabilirsiniz.
          </p>
        </div>

        {hasSearchQuery && (
          <button
            className="filter-clear-button"
            type="button"
            onClick={handleClearSearch}
          >
            Aramayı Temizle
          </button>
        )}
      </div>

      <div className="global-search-input-row">
        <input
          className="form-input"
          type="search"
          placeholder="Örnek: maden suyu, market, Adidas..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      {!hasSearchQuery && (
        <p className="empty-message">
          Arama yapmak için yukarıdaki alana bir kelime yazınız.
        </p>
      )}

      {hasSearchQuery && searchResults.length === 0 && (
        <p className="empty-message">Aramanıza uygun kayıt bulunamadı.</p>
      )}

      {hasSearchQuery && searchResults.length > 0 && (
        <>
          <p className="selected-category-text">
            Bulunan sonuç sayısı: <strong>{searchResults.length}</strong>
          </p>

          <div className="table-wrapper">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>İşlem</th>

                  <th>Ürün</th>

                  <th>Marka</th>

                  <th>Kategori</th>

                  <th>Firma / Şube</th>

                  <th>Açıklama</th>

                  <th>Tutar</th>

                  <th>Tarih</th>
                </tr>
              </thead>

              <tbody>
                {searchResults.map((result) => (
                  <tr key={result.id}>
                    <td>{result.transactionType}</td>

                    <td>{result.productName}</td>

                    <td>{result.brandName}</td>

                    <td>{result.categoryPath}</td>

                    <td>
                      {result.merchantName}

                      {result.branchName !== "-" && (
                        <div className="table-secondary-text">
                          {result.branchName}
                        </div>
                      )}
                    </td>

                    <td>{result.description || "-"}</td>

                    <td>{formatAmount(result.amountMinor)} ₺</td>

                    <td>
                      {formatTransactionDate(
                        result.transactionDate,
                        result.transactionDate,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default GlobalSearch;

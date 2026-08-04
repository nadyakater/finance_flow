import { useState } from "react";
import { useSelector } from "react-redux";

import {
  selectProductPriceAnalysis,
  selectProductPurchaseHistory,
} from "../transactionSelectors";

import { selectProducts } from "../../../catalog/presentation/catalogSelectors";

// =====================================================
// 6.GÜN
// Ürün fiyat geçmişi ve analiz presentation bileşeni.
//
// PDF mimarisine göre:
// - Ürün seçimi yalnızca bu ekranı ilgilendiren geçici state'tir.
// - Analiz verileri memoized selectorlardan alınır.
// - Firebase'e doğrudan erişilmez.
// =====================================================

function ProductAnalysis({
  formatDate,
  formatAmount,
}) {
  const [selectedAnalysisProductId, setSelectedAnalysisProductId] =
    useState("");

  const products = useSelector(selectProducts);

  const productPurchaseHistory = useSelector((state) =>
    selectProductPurchaseHistory(state, selectedAnalysisProductId),
  );

  const productPriceAnalysis = useSelector((state) =>
    selectProductPriceAnalysis(state, selectedAnalysisProductId),
  );

  return (
    <section className="category-management-section">
      <h2 className="section-title">Ürün Fiyat Geçmişi ve Analizi</h2>

      <label className="form-label" htmlFor="analysisProduct">
        Ürün
      </label>

      <select
        id="analysisProduct"
        className="form-input"
        value={selectedAnalysisProductId}
        onChange={(event) =>
          setSelectedAnalysisProductId(event.target.value)
        }
      >
        <option value="">Ürün seçiniz</option>

        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>

      {selectedAnalysisProductId && productPurchaseHistory.length === 0 ? (
        <p className="empty-message">
          Bu ürün için henüz alışveriş kaydı bulunmuyor.
        </p>
      ) : (
        <>
          {productPriceAnalysis.map((analysis) => (
            <div
              className="category-action-panel"
              key={analysis.normalizedUnit}
            >
              <p className="selected-category-text">
                Birim: <strong>{analysis.normalizedUnit}</strong>
              </p>

              <p>En düşük: {formatAmount(analysis.minPriceMinor)} ₺</p>
              <p>En yüksek: {formatAmount(analysis.maxPriceMinor)} ₺</p>
              <p>Ortalama: {formatAmount(analysis.averagePriceMinor)} ₺</p>
              <p>Medyan: {formatAmount(analysis.medianPriceMinor)} ₺</p>
              <p>Son fiyat: {formatAmount(analysis.lastPriceMinor)} ₺</p>

              <p>
                Önceki alıma göre değişim:{" "}
                {analysis.priceChangePercent === null
                  ? "Veri yok"
                  : `%${analysis.priceChangePercent}`}
              </p>
            </div>
          ))}

          {productPurchaseHistory.length > 0 && (
            <div className="table-wrapper">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Firma / Şube</th>
                    <th>Miktar</th>
                    <th>Toplam</th>
                    <th>Normalize Fiyat</th>
                  </tr>
                </thead>

                <tbody>
                  {productPurchaseHistory.map((purchase) => (
                    <tr
                      key={`${purchase.transactionId}-${purchase.productId}-${purchase.transactionDate}`}
                    >
                      <td>{formatDate(purchase.transactionDate)}</td>

                      <td>
                        {purchase.merchantName || "-"} /{" "}
                        {purchase.branchName || "-"}
                      </td>

                      <td>
                        {purchase.normalizedQuantity}{" "}
                        {purchase.normalizedUnit}
                      </td>

                      <td>{formatAmount(purchase.netAmountMinor)} ₺</td>

                      <td>
                        {formatAmount(
                          purchase.normalizedUnitPriceMinor,
                        )}{" "}
                        ₺/{purchase.normalizedUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ProductAnalysis;
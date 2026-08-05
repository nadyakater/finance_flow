import {
  useMemo,
  useState,
} from "react";

import {
  useSelector,
} from "react-redux";

import {
  selectFuelPriceAnalysis,
  selectFuelPurchaseHistory,
} from "../transactionSelectors";

const FUEL_LABELS = {
  gasoline: "Benzin",
  diesel: "Motorin",
  lpg: "LPG",
  other: "Diğer",
};

// =====================================================
// 8.GÜN
// Yakıt alışverişlerinin geçmişini ve istasyon bazlı
// litre fiyatı analizlerini gösterir.
//
// Benzin, motorin, LPG ve diğer yakıt türleri birbirine
// karıştırılmadan ayrı ayrı hesaplanır.
// =====================================================

function FuelAnalysis({
  formatDate,
  formatAmount,
}) {
  const [
    selectedFuelType,
    setSelectedFuelType,
  ] = useState("all");

  const fuelPurchaseHistory =
    useSelector(
      selectFuelPurchaseHistory,
    );

  const fuelPriceAnalysis =
    useSelector(
      selectFuelPriceAnalysis,
    );

  const filteredHistory =
    useMemo(
      () => {
        if (
          selectedFuelType ===
          "all"
        ) {
          return fuelPurchaseHistory;
        }

        return fuelPurchaseHistory.filter(
          (purchase) =>
            purchase.fuelType ===
            selectedFuelType,
        );
      },
      [
        fuelPurchaseHistory,
        selectedFuelType,
      ],
    );

  const filteredAnalyses =
    useMemo(
      () => {
        if (
          selectedFuelType ===
          "all"
        ) {
          return fuelPriceAnalysis;
        }

        return fuelPriceAnalysis.filter(
          (analysis) =>
            analysis.fuelType ===
            selectedFuelType,
        );
      },
      [
        fuelPriceAnalysis,
        selectedFuelType,
      ],
    );

  return (
    <section className="category-management-section fuel-analysis-section">
      <h2 className="section-title">
        Yakıt ve İstasyon Fiyat Analizi
      </h2>

      <p className="empty-message">
        Yakıt alışverişleri litre fiyatı,
        istasyon, şube ve yakıt türüne göre
        analiz edilir. Benzin, motorin ve LPG
        fiyatları birbirine karıştırılmaz.
      </p>

      <div className="fuel-analysis-filter">
        <label
          className="form-label"
          htmlFor="fuelAnalysisType"
        >
          Yakıt Türü
        </label>

        <select
          id="fuelAnalysisType"
          className="form-input"
          value={selectedFuelType}
          onChange={(event) =>
            setSelectedFuelType(
              event.target.value,
            )
          }
        >
          <option value="all">
            Tüm yakıt türleri
          </option>

          <option value="gasoline">
            Benzin
          </option>

          <option value="diesel">
            Motorin
          </option>

          <option value="lpg">
            LPG
          </option>

          <option value="other">
            Diğer
          </option>
        </select>
      </div>

      {filteredAnalyses.length ===
      0 ? (
        <p className="empty-message">
          Seçilen yakıt türüne ait
          alışveriş kaydı bulunmuyor.
        </p>
      ) : (
        <div className="fuel-analysis-grid">
          {filteredAnalyses.map(
            (analysis) => (
              <div
                className="category-action-panel fuel-analysis-card"
                key={
                  analysis.fuelType
                }
              >
                <h3 className="archive-title">
                  {FUEL_LABELS[
                    analysis.fuelType
                  ] ?? "Diğer"}
                </h3>

                <p>
                  Alım sayısı:{" "}
                  <strong>
                    {
                      analysis.purchaseCount
                    }
                  </strong>
                </p>

                <p>
                  En düşük litre fiyatı:{" "}
                  <strong>
                    {formatAmount(
                      analysis.minPriceMinor,
                    )}{" "}
                    ₺/L
                  </strong>
                </p>

                <p>
                  En yüksek litre fiyatı:{" "}
                  <strong>
                    {formatAmount(
                      analysis.maxPriceMinor,
                    )}{" "}
                    ₺/L
                  </strong>
                </p>

                <p>
                  Ortalama litre fiyatı:{" "}
                  <strong>
                    {formatAmount(
                      analysis.averagePriceMinor,
                    )}{" "}
                    ₺/L
                  </strong>
                </p>

                <p>
                  Son litre fiyatı:{" "}
                  <strong>
                    {formatAmount(
                      analysis.lastPriceMinor,
                    )}{" "}
                    ₺/L
                  </strong>
                </p>

                <p>
                  Önceki alıma göre
                  değişim:{" "}
                  <strong>
                    {analysis.priceChangePercent ===
                    null
                      ? "Veri yok"
                      : `%${analysis.priceChangePercent}`}
                  </strong>
                </p>

                {analysis.lastPurchaseDate && (
                  <p className="table-secondary-text">
                    Son alış tarihi:{" "}
                    {formatDate(
                      analysis.lastPurchaseDate,
                    )}
                  </p>
                )}
              </div>
            ),
          )}
        </div>
      )}

      {filteredHistory.length >
        0 && (
        <>
          <h3 className="archive-title fuel-history-title">
            Yakıt Alış Geçmişi
          </h3>

          <div className="table-wrapper">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Tarih</th>

                  <th>
                    Yakıt Türü
                  </th>

                  <th>
                    İstasyon / Şube
                  </th>

                  <th>Litre</th>

                  <th>
                    Litre Fiyatı
                  </th>

                  <th>
                    Toplam Tutar
                  </th>

                  <th>
                    Araç / Kilometre
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map(
                  (
                    purchase,
                    index,
                  ) => (
                    <tr
                      key={`${purchase.transactionId}-${purchase.fuelType}-${index}`}
                    >
                      <td>
                        {formatDate(
                          purchase.transactionDate,
                        )}
                      </td>

                      <td>
                        {FUEL_LABELS[
                          purchase.fuelType
                        ] ?? "Diğer"}
                      </td>

                      <td>
                        {purchase.merchantName ||
                          "-"}

                        {purchase.branchName && (
                          <div className="table-secondary-text">
                            {
                              purchase.branchName
                            }
                          </div>
                        )}
                      </td>

                      <td>
                        {Number(
                          purchase.liters ??
                            0,
                        ).toLocaleString(
                          "tr-TR",
                          {
                            minimumFractionDigits:
                              0,
                            maximumFractionDigits:
                              3,
                          },
                        )}{" "}
                        L
                      </td>

                      <td>
                        {formatAmount(
                          purchase.unitPriceMinor,
                        )}{" "}
                        ₺/L
                      </td>

                      <td>
                        {formatAmount(
                          purchase.totalMinor,
                        )}{" "}
                        ₺
                      </td>

                      <td>
                        {purchase.vehicleId ||
                          "-"}

                        {Number(
                          purchase.odometer ??
                            0,
                        ) > 0 && (
                          <div className="table-secondary-text">
                            {Number(
                              purchase.odometer,
                            ).toLocaleString(
                              "tr-TR",
                            )}{" "}
                            km
                          </div>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default FuelAnalysis;
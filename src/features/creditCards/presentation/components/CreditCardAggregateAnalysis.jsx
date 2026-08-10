import { useState } from "react";

import { useSelector } from "react-redux";

import {
  selectCreditCardRiskSummaries,
  selectCreditCardRiskTotals,
} from "../creditCardSelectors";

import {
  selectProjectedLoadsByStatementDate,
  selectRequiredMoneyUntilDate,
} from "../../../statements/presentation/statementSelectors";

// =====================================================
// 11.GÜN
// Çoklu kredi kartı analizinde para değerlerini
// kullanıcıya TL biçiminde göstermek için kullanılır.
// =====================================================

function formatAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// =====================================================
// 11.GÜN
// Tarih değerlerini Türkçe tarih biçiminde göstermek
// için ortak yardımcı fonksiyon oluşturuldu.
// =====================================================

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("tr-TR");
}

// =====================================================
// 11.GÜN
// Limit kullanım yüzdesi kullanıcıya daha anlaşılır
// şekilde en fazla iki ondalık basamakla gösterilir.
//
// Limit bilgisi bilinmiyorsa yüzde yerine
// "Hesaplanamadı" gösterilir.
// =====================================================

function formatPercent(percent) {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) {
    return "Hesaplanamadı";
  }

  return `%${percent.toLocaleString("tr-TR", {
    maximumFractionDigits: 2,
  })}`;
}

// =====================================================
// 11.GÜN - Çoklu kredi kartı toplu yük analizi
//
// Kullanıcının bütün kredi kartları tek bir analiz
// ekranında değerlendirilir.
//
// Bu bölümde:
//
// - her kartın mevcut dönem harcaması,
// - tahmini ekstre yükü,
// - ödenmemiş kapalı ekstresi,
// - gelecekteki taksitleri,
// - kullanılabilir limiti,
// - limit kullanım yüzdesi
//
// ayrı ayrı gösterilir.
//
// Ayrıca bütün kartların toplam değerleri de
// tablonun son satırında gösterilir.
// =====================================================

function CreditCardAggregateAnalysis() {
  // =====================================================
  // 11.GÜN
  // Her kredi kartının hesaplanmış finansal özetini alır.
  // =====================================================

  const creditCardRiskSummaries = useSelector(selectCreditCardRiskSummaries);

  // =====================================================
  // 11.GÜN
  // Bütün kredi kartlarının toplam limit ve yük
  // değerleri alınır.
  // =====================================================

  const creditCardRiskTotals = useSelector(selectCreditCardRiskTotals);

  // =====================================================
  // 11.GÜN
  // Aynı ekstre kesim tarihine sahip kartların
  // birlikte hesaplanan yükleri alınır.
  // =====================================================

  const projectedLoadsByStatementDate = useSelector(
    selectProjectedLoadsByStatementDate,
  );

  // =====================================================
  // 11.GÜN
  // Kullanıcının hangi tarihe kadar ödeme durumunu
  // görmek istediğini tutar.
  //
  // Kullanıcı tarih seçmeden herhangi bir varsayım
  // yapılmaz.
  // =====================================================

  const [selectedDate, setSelectedDate] = useState("");

  // =====================================================
  // 11.GÜN
  // Kullanıcının seçtiği tarihe kadar son ödeme tarihi
  // gelmiş bütün ödenmemiş ekstreler hesaplanır.
  //
  // Selector'a seçilen tarih ikinci parametre
  // olarak gönderilir.
  // =====================================================

  const requiredMoneyUntilDate = useSelector((state) =>
    selectRequiredMoneyUntilDate(state, selectedDate),
  );

  // =====================================================
  // 11.GÜN
  // Aynı kesim gününe sahip EN AZ iki kart bulunan
  // gruplar seçilir.
  //
  // Tek kart bulunan tarihlerin ayrıca toplu şekilde
  // gösterilmesine gerek olmadığı için burada çıkarılır.
  // =====================================================

  const sharedStatementDateGroups = projectedLoadsByStatementDate.filter(
    (statementGroup) => statementGroup.creditCardIds.length > 1,
  );

  return (
    <section className="category-action-panel">
      <h3>Çoklu Kredi Kartı Yük Analizi</h3>

      <p className="page-description">
        Tüm kredi kartlarınızın mevcut ve gelecekteki ödeme yüklerini birlikte
        inceleyebilirsiniz.
      </p>

      {/* =====================================================
          11.GÜN
          Kart bazlı finansal değerler tablo halinde gösterilir.

          Her kart ayrı satırda bulunur.
          En altta ise bütün kartların toplam satırı bulunur.
          ===================================================== */}

      {creditCardRiskSummaries.length === 0 ? (
        <p className="empty-message">
          Toplu analiz için kredi kartı bulunmuyor.
        </p>
      ) : (
        <div className="table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Kart</th>

                <th>Bu Dönem Yeni Harcama</th>

                <th>Tahmini Ekstre</th>

                <th>Ödenmemiş Kapalı Ekstre</th>

                <th>Gelecek Taksitler</th>

                <th>Kullanılabilir Limit</th>

                <th>Limit Kullanımı</th>
              </tr>
            </thead>

            <tbody>
              {creditCardRiskSummaries.map((creditCard) => (
                <tr key={creditCard.id}>
                  <td>
                    <strong>{creditCard.name}</strong>

                    <br />

                    <small>{creditCard.issuer}</small>
                  </td>

                  <td>
                    {formatAmount(creditCard.currentCycleSpendingMinor)} ₺
                  </td>

                  <td>{formatAmount(creditCard.projectedStatementMinor)} ₺</td>

                  <td>
                    {formatAmount(creditCard.closedUnpaidStatementMinor)} ₺
                  </td>

                  <td>{formatAmount(creditCard.futureInstallmentsMinor)} ₺</td>

                  <td>
                    {creditCard.availableLimitMinor === null
                      ? "Limit bilinmiyor"
                      : `${formatAmount(creditCard.availableLimitMinor)} ₺`}
                  </td>

                  <td>{formatPercent(creditCard.limitUsagePercent)}</td>
                </tr>
              ))}

              {/* =====================================================
                  11.GÜN
                  Kartların ayrı satırlarının ardından toplam satırı
                  gösterilir.

                  Böylece kullanıcı tek tek kartları inceleyebildiği
                  gibi bütün kartlarının toplam yükünü de görebilir.
                  ===================================================== */}

              <tr>
                <td>
                  <strong>TOPLAM</strong>
                </td>

                <td>
                  <strong>
                    {formatAmount(creditCardRiskTotals.totalNewSpendingMinor)} ₺
                  </strong>
                </td>

                <td>
                  <strong>
                    {formatAmount(
                      creditCardRiskTotals.totalProjectedStatementMinor,
                    )}{" "}
                    ₺
                  </strong>
                </td>

                <td>
                  <strong>
                    {formatAmount(
                      creditCardRiskTotals.totalClosedUnpaidStatementMinor,
                    )}{" "}
                    ₺
                  </strong>
                </td>

                <td>
                  <strong>
                    {formatAmount(
                      creditCardRiskTotals.totalFutureInstallmentsMinor,
                    )}{" "}
                    ₺
                  </strong>
                </td>

                <td>
                  <strong>
                    {creditCardRiskTotals.knownLimitCardCount === 0
                      ? "Limit bilinmiyor"
                      : `${formatAmount(
                          creditCardRiskTotals.totalAvailableLimitMinor,
                        )} ₺`}
                  </strong>
                </td>

                <td>
                  <strong>
                    {formatPercent(creditCardRiskTotals.totalLimitUsagePercent)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================
          11.GÜN
          Kullanıcı belirli bir tarih seçerek o tarihe kadar
          ne kadar kredi kartı borcu ödemesi gerektiğini görebilir.
          ===================================================== */}

      <div className="installment-summary-panel">
        <h4>Seçilen Tarihe Kadar Gereken Para</h4>

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="aggregateDueDate">
              Tarih Seç
            </label>

            <input
              id="aggregateDueDate"
              className="form-input"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
        </div>

        {/* =====================================================
            11.GÜN
            Tarih seçilmeden kullanıcıya sıfır borç varmış gibi
            yanlış bir bilgi verilmez.

            Önce tarih seçmesi istenir.
            ===================================================== */}

        {!selectedDate ? (
          <p className="empty-message">
            Ödenmesi gereken toplamı görmek için bir tarih seçin.
          </p>
        ) : (
          <>
            <div className="installment-current-total">
              <span>Bu Tarihe Kadar Gereken Toplam Para</span>

              <strong>
                {formatAmount(requiredMoneyUntilDate.totalMinor)} ₺
              </strong>
            </div>

            {/* =====================================================
                11.GÜN
                Toplama hangi ekstrelerin dahil edildiği de
                kullanıcıya açık şekilde gösterilir.
                ===================================================== */}

            {requiredMoneyUntilDate.statements.length > 0 ? (
              <div className="installment-month-list">
                {requiredMoneyUntilDate.statements.map((statement) => {
                  const matchedCard = creditCardRiskSummaries.find(
                    (creditCard) => creditCard.id === statement.creditCardId,
                  );

                  return (
                    <div key={statement.id} className="installment-month-item">
                      <span>
                        {matchedCard?.name ?? "Kredi Kartı"}
                        {" - "}
                        Son ödeme: {formatDate(statement.dueDate)}
                      </span>

                      <strong>
                        {formatAmount(statement.unpaidAmountMinor)} ₺
                      </strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="installment-empty-text">
                Seçilen tarihe kadar ödenmesi gereken ekstre bulunmuyor.
              </p>
            )}
          </>
        )}
      </div>

      {/* =====================================================
          11.GÜN
          Aynı tarihte ekstresi kesilecek birden fazla kart varsa
          bu kartların toplam yükü birlikte gösterilir.

          Yeni harcamalar ile önceki dönemlerden gelen taksitler
          birbirinden ayrı tutulur.
          ===================================================== */}

      <div className="installment-summary-panel">
        <h4>Aynı Kesim Günündeki Kartlar</h4>

        {sharedStatementDateGroups.length === 0 ? (
          <p className="installment-empty-text">
            Aynı kesim tarihine sahip birden fazla kart bulunmuyor.
          </p>
        ) : (
          <div className="installment-month-list">
            {sharedStatementDateGroups.map((statementGroup) => (
              <div
                key={statementGroup.statementDate}
                className="category-action-panel"
              >
                <p>
                  <strong>Kesim Tarihi:</strong>{" "}
                  {formatDate(statementGroup.statementDate)}
                </p>

                <p>
                  <strong>Kart Sayısı:</strong>{" "}
                  {statementGroup.creditCardIds.length}
                </p>

                <div className="installment-current-total">
                  <span>Yeni Harcamalar</span>

                  <strong>
                    {formatAmount(statementGroup.newSpendingMinor)} ₺
                  </strong>
                </div>

                <div className="installment-current-total">
                  <span>Önceki Dönemden Gelen Taksitler</span>

                  <strong>
                    {formatAmount(statementGroup.priorCommitmentBurdenMinor)} ₺
                  </strong>
                </div>

                <div className="installment-future-header">
                  <span>Toplam Tahmini Yük</span>

                  <strong>
                    {formatAmount(statementGroup.projectedTotalMinor)} ₺
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CreditCardAggregateAnalysis;

import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { updateReportingSettings } from "../../application/reportingThunks";

import {
  selectReportingError,
  selectReportingSaveStatus,
  selectReportingSettings,
} from "../reportingSelectors";

import { selectCreditCards } from "../../../creditCards/presentation/creditCardSelectors";

// =====================================================
// 11.GÜN - Finansal dönem ayarları
//
// Kullanıcının raporlarını hangi döneme göre görmek
// istediğini seçebileceği ayar ekranı oluşturuldu.
//
// Kullanıcı:
//
// - Takvim ayı
// - Özel finansal ay
// - Kredi kartı dönemi
//
// seçeneklerinden birini kullanabilir.
// =====================================================

function ReportingPeriodSettings({ currentUser }) {
  const dispatch = useDispatch();

  const reportingSettings = useSelector(selectReportingSettings);

  const reportingSaveStatus = useSelector(selectReportingSaveStatus);

  const reportingError = useSelector(selectReportingError);

  const creditCards = useSelector(selectCreditCards);

  // =====================================================
  // 11.GÜN
  // Kullanıcının form üzerinde yaptığı seçimler önce
  // component state içerisinde tutulur.
  //
  // Kullanıcı Kaydet butonuna bastığında Firestore
  // ve Redux tarafı güncellenir.
  // =====================================================

  const [mode, setMode] = useState(reportingSettings.mode);

  const [customMonthStartDay, setCustomMonthStartDay] = useState(
    reportingSettings.customMonthStartDay,
  );

  const [selectedCreditCardId, setSelectedCreditCardId] = useState(
    reportingSettings.selectedCreditCardId,
  );

  const [formError, setFormError] = useState("");

  // =====================================================
  // 11.GÜN
  // Firestore'dan raporlama ayarları yüklendiğinde
  // form alanları da güncel değerlerle doldurulur.
  //
  // Böylece kullanıcı daha önce yaptığı seçimi
  // tekrar ekranda görür.
  // =====================================================

  useEffect(() => {
    setMode(reportingSettings.mode);

    setCustomMonthStartDay(reportingSettings.customMonthStartDay);

    setSelectedCreditCardId(reportingSettings.selectedCreditCardId);
  }, [reportingSettings]);

  const isSaving = reportingSaveStatus === "loading";

  // =====================================================
  // 11.GÜN
  // Kullanıcının finansal dönem ayarını kaydeder.
  // =====================================================

  const handleSave = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!currentUser?.id) {
      setFormError(
        "Finansal dönem ayarını kaydetmek için kullanıcı oturumu bulunamadı.",
      );

      return;
    }

    // =====================================================
    // 11.GÜN
    // Özel finansal ay seçilmişse başlangıç günü
    // 1 ile 31 arasında olmalıdır.
    // =====================================================

    const numericStartDay = Number(customMonthStartDay);

    if (
      mode === "customMonth" &&
      (!Number.isInteger(numericStartDay) ||
        numericStartDay < 1 ||
        numericStartDay > 31)
    ) {
      setFormError("Finansal ay başlangıç günü 1 ile 31 arasında olmalıdır.");

      return;
    }

    // =====================================================
    // 11.GÜN
    // Kredi kartı dönemi seçilmişse hangi kartın
    // döneminin kullanılacağı mutlaka seçilmelidir.
    // =====================================================

    if (mode === "creditCardCycle" && !selectedCreditCardId) {
      setFormError("Kredi kartı dönemi için bir kredi kartı seçmelisiniz.");

      return;
    }

    await dispatch(
      updateReportingSettings({
        userId: currentUser.id,

        mode,

        customMonthStartDay: numericStartDay,

        selectedCreditCardId:
          mode === "creditCardCycle" ? selectedCreditCardId : "",
      }),
    );
  };

  return (
    <section className="category-action-panel">
      <h3>Finansal Dönem Ayarları</h3>

      <p className="page-description">
        Gelir ve gider raporlarının hangi tarih aralığına göre hesaplanacağını
        seçebilirsiniz.
      </p>

      <form onSubmit={handleSave}>
        {/* =====================================================
            11.GÜN
            Kullanıcı raporlama döneminin türünü seçer.
            ===================================================== */}

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="reportingMode">
              Raporlama Dönemi *
            </label>

            <select
              id="reportingMode"
              className="form-input"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              disabled={isSaving}
            >
              <option value="calendarMonth">Takvim Ayı</option>

              <option value="customMonth">Özel Finansal Ay</option>

              <option value="creditCardCycle">Kredi Kartı Dönemi</option>
            </select>
          </div>
        </div>

        {/* =====================================================
            11.GÜN
            Özel finansal ay seçildiğinde başlangıç günü alanı
            kullanıcıya gösterilir.

            Örneğin 25 seçilirse finansal dönem maaş gününe
            göre 25'inde başlayabilir.
            ===================================================== */}

        {mode === "customMonth" && (
          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="customMonthStartDay">
                Finansal Ay Başlangıç Günü *
              </label>

              <input
                id="customMonthStartDay"
                className="form-input"
                type="number"
                min="1"
                max="31"
                step="1"
                value={customMonthStartDay}
                onChange={(event) => setCustomMonthStartDay(event.target.value)}
                disabled={isSaving}
                required
              />

              <small>Örneğin maaş gününüz 25 ise 25 seçebilirsiniz.</small>
            </div>
          </div>
        )}

        {/* =====================================================
            11.GÜN
            Kredi kartı dönemi seçildiğinde kullanıcının
            hangi kartın ekstre dönemini kullanacağını seçmesi
            sağlanır.
            ===================================================== */}

        {mode === "creditCardCycle" && (
          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="reportingCreditCard">
                Kredi Kartı *
              </label>

              <select
                id="reportingCreditCard"
                className="form-input"
                value={selectedCreditCardId}
                onChange={(event) =>
                  setSelectedCreditCardId(event.target.value)
                }
                disabled={isSaving}
                required
              >
                <option value="">Kredi kartı seçin</option>

                {creditCards.map((creditCard) => (
                  <option key={creditCard.id} value={creditCard.id}>
                    {creditCard.name}
                    {creditCard.lastFourDigits
                      ? ` - **** ${creditCard.lastFourDigits}`
                      : ""}
                  </option>
                ))}
              </select>

              {/* =====================================================
                  11.GÜN
                  Kullanıcının henüz kredi kartı yoksa durum açıkça
                  belirtilir.
                  ===================================================== */}

              {creditCards.length === 0 && (
                <p className="empty-message">
                  Kredi kartı dönemi kullanmak için önce kredi kartı
                  eklemelisiniz.
                </p>
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            11.GÜN
            Dönem seçiminin işlem tarihlerini değiştirmediğini
            kullanıcıya açıkça belirtiyoruz.

            Yalnızca raporların hangi tarih aralığını dikkate
            alacağı değişir.
            ===================================================== */}

        <p className="page-description">
          Bu ayar mevcut gelir ve gider kayıtlarının tarihlerini değiştirmez.
          Yalnızca raporlama dönemini değiştirir.
        </p>

        <button
          className="secondary-button"
          type="submit"
          disabled={
            isSaving || (mode === "creditCardCycle" && creditCards.length === 0)
          }
        >
          {isSaving ? "Kaydediliyor..." : "Dönem Ayarını Kaydet"}
        </button>
      </form>

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      {reportingError && (
        <p className="form-error" role="alert">
          {reportingError}
        </p>
      )}

      {/* =====================================================
          11.GÜN
          Ayar başarıyla kaydedildiyse kullanıcıya bilgi verilir.
          ===================================================== */}

      {reportingSaveStatus === "succeeded" && (
        <p className="success-message">Finansal dönem ayarı kaydedildi.</p>
      )}
    </section>
  );
}

export default ReportingPeriodSettings;

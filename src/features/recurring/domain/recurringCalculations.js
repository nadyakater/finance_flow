// =====================================================
// 11.GÜN - Düzenli gider ve abonelik hesaplamaları
//
// Kira, internet, sigorta ve abonelik gibi tekrar eden
// ödemelerin tarih ve durum hesapları bu dosyada tutulur.
//
// Bu dosyada Firebase işlemi yapılmaz.
// Sadece saf hesaplama fonksiyonları bulunur.
// =====================================================

// =====================================================
// 11.GÜN
// Tarihi YYYY-MM-DD biçiminde göstermek için
// gün ve ay değerini iki basamağa tamamlar.
// =====================================================

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

// =====================================================
// 11.GÜN
// Verilen ayın kaç gün çektiğini bulur.
//
// Örneğin:
// Şubat 2026 -> 28
// Nisan 2026 -> 30
// Ağustos 2026 -> 31
// =====================================================

function getMonthLastDay(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// =====================================================
// 11.GÜN
// Kullanıcının belirlediği ödeme günü ilgili ayda yoksa
// ayın son günü kullanılır.
//
// Örneğin ödeme günü 31 ise:
//
// Şubat -> 28
// Nisan -> 30
// Mayıs -> 31
// =====================================================

function createSafeDateValue(year, monthIndex, requestedDay) {
  const lastDay = getMonthLastDay(year, monthIndex);

  const safeDay = Math.min(Number(requestedDay), lastDay);

  return `${year}-${padDatePart(monthIndex + 1)}-${padDatePart(safeDay)}`;
}

// =====================================================
// 11.GÜN
// YYYY-MM-DD biçimindeki tarihi Date nesnesine çevirir.
// =====================================================

function parseDateValue(dateValue) {
  if (!dateValue) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// =====================================================
// 11.GÜN
// Bugünün tarihini YYYY-MM-DD olarak üretir.
// =====================================================

export function getTodayDateValue() {
  const today = new Date();

  const timezoneOffset = today.getTimezoneOffset() * 60 * 1000;

  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

// =====================================================
// 11.GÜN
// Düzenli giderin ödeme gününün geçerli olup olmadığını
// kontrol eder.
//
// Kullanıcı 1 ile 31 arasında gün seçebilir.
// =====================================================

export function validateRecurringDay(recurringDay) {
  const numericDay = Number(recurringDay);

  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > 31) {
    throw new Error("RECURRING_DAY_INVALID");
  }

  return numericDay;
}

// =====================================================
// 11.GÜN
// Düzenli giderin tahmini tutarını kuruş olarak doğrular.
//
// Tutar sıfırdan büyük olmalıdır.
// =====================================================

export function validateEstimatedAmountMinor(estimatedAmountMinor) {
  const numericAmount = Number(estimatedAmountMinor);

  if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
    throw new Error("RECURRING_AMOUNT_INVALID");
  }

  return numericAmount;
}

// =====================================================
// 11.GÜN - Sonraki ödeme tarihi
//
// Kullanıcının belirlediği ödeme gününe göre aktif
// veya sonraki ödeme tarihini hesaplar.
//
// Örneğin:
//
// Ödeme günü = 15
// Bugün = 10 Ağustos
//
// Sonraki ödeme:
// 15 Ağustos
//
// Bugün = 20 Ağustos ise:
//
// Sonraki ödeme:
// 15 Eylül
// =====================================================

export function calculateNextDueDate({ recurringDay, referenceDate }) {
  const validDay = validateRecurringDay(recurringDay);

  const reference = parseDateValue(referenceDate);

  if (!reference) {
    throw new Error("RECURRING_REFERENCE_DATE_INVALID");
  }

  const year = reference.getFullYear();

  const monthIndex = reference.getMonth();

  const currentMonthDueDate = createSafeDateValue(year, monthIndex, validDay);

  // =====================================================
  // 11.GÜN
  // Bu ayın ödeme tarihi henüz gelmediyse
  // mevcut ayın tarihi kullanılır.
  // =====================================================

  if (referenceDate <= currentMonthDueDate) {
    return currentMonthDueDate;
  }

  // =====================================================
  // 11.GÜN
  // Bu ayın ödeme tarihi geçmişse
  // sonraki ayın ödeme tarihi hesaplanır.
  // =====================================================

  return createSafeDateValue(year, monthIndex + 1, validDay);
}

// =====================================================
// 11.GÜN - Gecikme kontrolü
//
// Bir faturanın son ödeme tarihi geçmiş ve henüz
// ödenmemişse overdue = true olur.
// =====================================================

export function calculateOverdue({ dueDate, status, todayDate }) {
  if (!dueDate) {
    return false;
  }

  // =====================================================
  // 11.GÜN
  // Ödenmiş kayıt hiçbir zaman gecikmiş sayılmaz.
  // =====================================================

  if (status === "paid") {
    return false;
  }

  return dueDate < todayDate;
}

// =====================================================
// 11.GÜN - Yaklaşan ödeme listesi kontrolü
//
// Ödenmiş faturalar yaklaşan ödeme listesinde
// tekrar gösterilmez.
//
// Kullanıcı sadece henüz ödenmemiş forecast/draft
// kayıtlarını görür.
// =====================================================

export function shouldShowInUpcomingPayments(forecastItem) {
  if (!forecastItem) {
    return false;
  }

  return forecastItem.status !== "paid" && forecastItem.status !== "cancelled";
}

// =====================================================
// 11.GÜN - Tahmin hatası
//
// Fatura gibi değişken tutarlı ödemelerde:
//
// estimatedAmountMinor
// actualAmountMinor
//
// ayrı tutulur.
//
// Gerçek tutar girildikten sonra tahmin ile gerçek
// arasındaki fark hesaplanabilir.
// =====================================================

export function calculateForecastErrorMinor({
  estimatedAmountMinor,
  actualAmountMinor,
}) {
  if (actualAmountMinor === null || actualAmountMinor === undefined) {
    return null;
  }

  return Number(actualAmountMinor) - Number(estimatedAmountMinor ?? 0);
}

// =====================================================
// 11.GÜN
// Tahmin hatasını yüzde olarak hesaplar.
//
// Örneğin:
//
// Tahmin = 1.000 TL
// Gerçek = 1.200 TL
//
// Hata = %20
// =====================================================

export function calculateForecastErrorPercent({
  estimatedAmountMinor,
  actualAmountMinor,
}) {
  const estimated = Number(estimatedAmountMinor ?? 0);

  if (
    estimated <= 0 ||
    actualAmountMinor === null ||
    actualAmountMinor === undefined
  ) {
    return null;
  }

  return Number(
    (((Number(actualAmountMinor) - estimated) / estimated) * 100).toFixed(2),
  );
}

// =====================================================
// 11.GÜN - Forecast kayıt oluşturma
//
// Düzenli gider için gelecekte gösterilecek kayıt hazırlanır.
//
// Önemli:
// Bu kayıt gerçek transaction değildir.
//
// Kullanıcı henüz ödeme yapmadığı için sadece forecast
// olarak tutulur.
//
// Gerçek ödeme yapıldığında ayrıca transaction oluşturulur.
// =====================================================

export function createForecastItem({
  recurringRuleId,
  dueDate,
  estimatedAmountMinor,
}) {
  return {
    recurringRuleId,

    dueDate,

    estimatedAmountMinor: Number(estimatedAmountMinor),

    actualAmountMinor: null,

    paidAt: null,

    status: "forecast",

    overdue: false,

    transactionId: "",
  };
}

// =====================================================
// 11.GÜN - Duplicate kontrolü
//
// Forecast kaydı gerçek bir transaction'a dönüştürüldüğünde
// aynı dönem için ikinci kez gerçek işlem oluşmaması gerekir.
//
// transactionId varsa bu forecast daha önce gerçek
// finansal kayda bağlanmış demektir.
// =====================================================

export function canCreateTransactionFromForecast(forecastItem) {
  if (!forecastItem) {
    return false;
  }

  if (forecastItem.transactionId) {
    return false;
  }

  if (forecastItem.status === "paid") {
    return false;
  }

  return true;
}

// =====================================================
// 11.GÜN - Tutar geçmişi kaydı
//
// Bir abonelik veya düzenli giderin fiyatı değiştiğinde
// eski tutar üzerine yazılmaz.
//
// Bunun yerine yeni bir geçmiş kaydı oluşturulur.
//
// Böylece geçmiş ayların raporları yeni fiyatla
// yeniden hesaplanmaz.
// =====================================================

export function createAmountHistoryEntry({ amountMinor, effectiveFrom }) {
  return {
    amountMinor: Number(amountMinor),

    effectiveFrom,
  };
}

// =====================================================
// 11.GÜN
// Belirli bir tarihte geçerli olan tutarı geçmiş
// kayıtlarından bulur.
//
// Örneğin:
//
// Ocak  -> 500 TL
// Haziran -> 650 TL
//
// Mart ayı raporunda 500 TL,
// Ağustos ayı raporunda 650 TL kullanılır.
// =====================================================

export function getAmountForDate({
  amountHistory,
  dateValue,
  fallbackAmountMinor = 0,
}) {
  if (!Array.isArray(amountHistory) || amountHistory.length === 0) {
    return Number(fallbackAmountMinor);
  }

  const validEntries = amountHistory
    .filter((entry) => entry.effectiveFrom && entry.effectiveFrom <= dateValue)
    .sort((firstEntry, secondEntry) =>
      secondEntry.effectiveFrom.localeCompare(firstEntry.effectiveFrom),
    );

  if (validEntries.length === 0) {
    return Number(fallbackAmountMinor);
  }

  return Number(validEntries[0].amountMinor ?? fallbackAmountMinor);
}

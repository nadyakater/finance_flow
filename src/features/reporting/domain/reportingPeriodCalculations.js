// =====================================================
// 11.GÜN - Kullanıcı tanımlı finansal ay hesaplamaları
//
// Kullanıcının raporlarda hangi tarih aralığını görmek
// istediğini hesaplayan fonksiyonlar bu dosyada toplandı.
//
// Desteklenen dönem türleri:
//
// 1. Takvim ayı
// 2. Özel finansal ay
// 3. Kredi kartı ekstre dönemi
//
// Bu dosya yalnızca hesaplama yapar.
// Firebase veya kullanıcı arayüzü işlemi içermez.
// =====================================================

// =====================================================
// 11.GÜN
// Tarihteki gün ve ay değerlerinin her zaman
// iki basamaklı yazılması için kullanılır.
//
// Örneğin:
// 5  -> "05"
// 12 -> "12"
// =====================================================

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

// =====================================================
// 11.GÜN
// Verilen yıl ve ayın kaç gün çektiğini bulur.
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
// Kullanıcının seçtiği gün ilgili ayda bulunmuyorsa
// otomatik olarak ayın son gününe düşürülür.
//
// Örneğin kullanıcı finansal ay başlangıcı olarak
// 31 seçmiş olabilir.
//
// Şubat ayında 31 olmadığı için:
//
// 31 Şubat yerine
// 28 Şubat
//
// kullanılır.
//
// Böylece geçersiz bir tarih oluşturulmaz.
// =====================================================

function createSafeDateValue(year, monthIndex, requestedDay) {
  const lastDay = getMonthLastDay(year, monthIndex);

  const safeDay = Math.min(requestedDay, lastDay);

  return `${year}-${padDatePart(monthIndex + 1)}-${padDatePart(safeDay)}`;
}

// =====================================================
// 11.GÜN
// YYYY-MM-DD biçimindeki tarihi JavaScript Date
// nesnesine dönüştürür.
//
// Eksik veya hatalı tarih gönderilirse hesaplama
// devam ettirilmez.
// =====================================================

function parseDateValue(dateValue) {
  if (typeof dateValue !== "string" || !dateValue) {
    throw new Error("REPORTING_DATE_REQUIRED");
  }

  const [year, month, day] = dateValue.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error("REPORTING_DATE_INVALID");
  }

  const parsedDate = new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("REPORTING_DATE_INVALID");
  }

  return parsedDate;
}

// =====================================================
// 11.GÜN
// JavaScript Date nesnesini tekrar YYYY-MM-DD
// biçimine çevirir.
// =====================================================

function formatDateValue(date) {
  return `${date.getFullYear()}-${padDatePart(
    date.getMonth() + 1,
  )}-${padDatePart(date.getDate())}`;
}

// =====================================================
// 11.GÜN
// Bir tarihten belirli sayıda gün ileri veya geri
// gitmek için kullanılan yardımcı fonksiyon.
//
// Örneğin:
//
// 25 Ağustos - 1 gün
// = 24 Ağustos
// =====================================================

function addDays(dateValue, dayCount) {
  const date = parseDateValue(dateValue);

  date.setDate(date.getDate() + dayCount);

  return formatDateValue(date);
}

// =====================================================
// 11.GÜN
// Kullanıcının özel finansal ay başlangıç gününün
// geçerli olup olmadığını kontrol eder.
//
// Kullanıcı 1 ile 31 arasında bir gün seçebilir.
// =====================================================

export function validateCustomMonthStartDay(customMonthStartDay) {
  const numericDay = Number(customMonthStartDay);

  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > 31) {
    throw new Error("REPORTING_CUSTOM_START_DAY_INVALID");
  }

  return numericDay;
}

// =====================================================
// 11.GÜN - Takvim ayı
//
// Kullanıcının bulunduğu ayın:
//
// ayın 1'i
// ile
// ayın son günü
//
// arasındaki raporlama dönemini oluşturur.
//
// Örneğin:
//
// Referans tarih:
// 10 Ağustos 2026
//
// Sonuç:
// 01.08.2026 - 31.08.2026
// =====================================================

export function calculateCalendarMonthPeriod(referenceDate) {
  const date = parseDateValue(referenceDate);

  const year = date.getFullYear();

  const monthIndex = date.getMonth();

  const startDate = createSafeDateValue(year, monthIndex, 1);

  const endDate = createSafeDateValue(
    year,
    monthIndex,
    getMonthLastDay(year, monthIndex),
  );

  return {
    mode: "calendarMonth",

    startDate,

    endDate,
  };
}

// =====================================================
// 11.GÜN - Özel finansal ay
//
// Kullanıcı maaş günü veya kendi bütçe düzenine göre
// finansal ayın başlangıç gününü belirleyebilir.
//
// Örneğin:
//
// Başlangıç günü = 25
// Referans tarih  = 10 Ağustos 2026
//
// Aktif dönem:
//
// 25 Temmuz 2026
// -
// 24 Ağustos 2026
//
// olur.
// =====================================================

export function calculateCustomMonthPeriod({
  referenceDate,
  customMonthStartDay,
}) {
  const startDay = validateCustomMonthStartDay(customMonthStartDay);

  const date = parseDateValue(referenceDate);

  const year = date.getFullYear();

  const monthIndex = date.getMonth();

  // =====================================================
  // 11.GÜN
  // Önce referans tarihin bulunduğu ay için
  // finansal başlangıç tarihi oluşturulur.
  //
  // Başlangıç günü 31 ise ve ay 30 çekiyorsa
  // otomatik olarak ayın 30'u kullanılır.
  // =====================================================

  const currentMonthStartValue = createSafeDateValue(
    year,
    monthIndex,
    startDay,
  );

  const currentMonthStartDate = parseDateValue(currentMonthStartValue);

  let periodStart;

  // =====================================================
  // 11.GÜN
  // Referans tarih o ayın finansal başlangıç tarihine
  // ulaşmışsa dönem bu ay başlamıştır.
  //
  // Örneğin:
  //
  // Başlangıç günü = 25
  // Bugün           = 28 Ağustos
  //
  // Başlangıç:
  // 25 Ağustos
  // =====================================================

  if (date.getTime() >= currentMonthStartDate.getTime()) {
    periodStart = currentMonthStartValue;
  } else {
    // =====================================================
    // 11.GÜN
    // Referans tarih henüz başlangıç gününe ulaşmamışsa
    // finansal dönem önceki ay başlamıştır.
    //
    // Örneğin:
    //
    // Başlangıç günü = 25
    // Bugün           = 10 Ağustos
    //
    // Başlangıç:
    // 25 Temmuz
    // =====================================================

    periodStart = createSafeDateValue(year, monthIndex - 1, startDay);
  }

  const periodStartDate = parseDateValue(periodStart);

  // =====================================================
  // 11.GÜN
  // Bir sonraki finansal ayın başlangıç tarihi hesaplanır.
  //
  // Mevcut dönemin bitiş tarihi ise bu tarihten
  // bir gün öncesidir.
  // =====================================================

  const nextPeriodStart = createSafeDateValue(
    periodStartDate.getFullYear(),
    periodStartDate.getMonth() + 1,
    startDay,
  );

  const periodEnd = addDays(nextPeriodStart, -1);

  return {
    mode: "customMonth",

    startDate: periodStart,

    endDate: periodEnd,

    customMonthStartDay: startDay,
  };
}

// =====================================================
// 11.GÜN - Kredi kartı dönemi
//
// Kullanıcı raporlama modu olarak kredi kartı dönemini
// seçtiğinde, seçilen kartın mevcut ekstre döneminin
// başlangıç ve bitiş tarihleri kullanılır.
//
// Burada yeni tarih hesaplaması yapılmaz.
// Kredi kartı ekstre sisteminin oluşturduğu cycleStart
// ve cycleEnd değerleri doğrudan kullanılır.
// =====================================================

export function calculateCreditCardCyclePeriod({
  selectedCreditCardId,
  statementPeriods,
  referenceDate,
}) {
  if (!selectedCreditCardId) {
    throw new Error("REPORTING_CREDIT_CARD_REQUIRED");
  }

  const safeStatementPeriods = Array.isArray(statementPeriods)
    ? statementPeriods
    : [];

  const reference = parseDateValue(referenceDate);

  // =====================================================
  // 11.GÜN
  // Önce seçilen karta ait ve referans tarihi kapsayan
  // ekstre dönemi aranır.
  // =====================================================

  const activeStatement = safeStatementPeriods.find((statement) => {
    if (
      statement.creditCardId !== selectedCreditCardId ||
      !statement.cycleStart ||
      !statement.cycleEnd
    ) {
      return false;
    }

    const cycleStart = parseDateValue(statement.cycleStart);

    const cycleEnd = parseDateValue(statement.cycleEnd);

    return (
      reference.getTime() >= cycleStart.getTime() &&
      reference.getTime() <= cycleEnd.getTime()
    );
  });

  // =====================================================
  // 11.GÜN
  // Referans tarihi kapsayan bir ekstre dönemi
  // bulunamazsa projected durumundaki güncel dönem aranır.
  // =====================================================

  const projectedStatement = safeStatementPeriods.find(
    (statement) =>
      statement.creditCardId === selectedCreditCardId &&
      statement.status === "projected" &&
      statement.cycleStart &&
      statement.cycleEnd,
  );

  const selectedStatement = activeStatement ?? projectedStatement;

  if (!selectedStatement) {
    throw new Error("REPORTING_CREDIT_CARD_PERIOD_NOT_FOUND");
  }

  return {
    mode: "creditCardCycle",

    startDate: selectedStatement.cycleStart,

    endDate: selectedStatement.cycleEnd,

    selectedCreditCardId,
  };
}

// =====================================================
// 11.GÜN - Aktif raporlama dönemi
//
// Uygulamanın diğer bölümleri hangi raporlama modunun
// seçildiğini bilmek zorunda kalmasın diye bütün dönem
// hesapları bu fonksiyon üzerinden yönetilir.
//
// Seçilen moda göre doğru hesaplama fonksiyonu çağrılır.
// =====================================================

export function calculateReportingPeriod({
  mode,
  referenceDate,
  customMonthStartDay,
  selectedCreditCardId,
  statementPeriods = [],
}) {
  // =====================================================
  // 11.GÜN
  // Takvim ayı seçilmişse normal ayın başı ve sonu
  // kullanılır.
  // =====================================================

  if (mode === "calendarMonth") {
    return calculateCalendarMonthPeriod(referenceDate);
  }

  // =====================================================
  // 11.GÜN
  // Özel finansal ay seçilmişse kullanıcının belirlediği
  // başlangıç gününe göre tarih aralığı oluşturulur.
  // =====================================================

  if (mode === "customMonth") {
    return calculateCustomMonthPeriod({
      referenceDate,
      customMonthStartDay,
    });
  }

  // =====================================================
  // 11.GÜN
  // Kredi kartı dönemi seçilmişse seçilen kartın
  // cycleStart ve cycleEnd tarihleri kullanılır.
  // =====================================================

  if (mode === "creditCardCycle") {
    return calculateCreditCardCyclePeriod({
      selectedCreditCardId,
      statementPeriods,
      referenceDate,
    });
  }

  // =====================================================
  // 11.GÜN
  // Tanımlanmayan bir raporlama modu gönderilirse
  // sessizce yanlış hesaplama yapmak yerine hata verilir.
  // =====================================================

  throw new Error("REPORTING_MODE_INVALID");
}

// =====================================================
// 11.GÜN
// Bir işlemin seçilen raporlama döneminin içerisinde
// bulunup bulunmadığını kontrol eder.
//
// Önemli:
// Bu fonksiyon transactionDate değerini DEĞİŞTİRMEZ.
//
// Yalnızca işlem tarihinin aktif raporlama aralığında
// olup olmadığını kontrol eder.
// =====================================================

export function isDateInsideReportingPeriod({ dateValue, startDate, endDate }) {
  if (!dateValue || !startDate || !endDate) {
    return false;
  }

  return dateValue >= startDate && dateValue <= endDate;
}

// =====================================================
// 11.GÜN
// Dashboard üzerinde kullanıcıya gösterilecek aktif
// dönem başlığını oluşturmak için yardımcı bilgi döndürür.
//
// Burada yalnızca teknik başlık hazırlanır.
// Tarihin Türkçe görüntülenmesi kullanıcı arayüzünde yapılır.
// =====================================================

export function getReportingPeriodTitle(mode) {
  if (mode === "calendarMonth") {
    return "Takvim Ayı";
  }

  if (mode === "customMonth") {
    return "Özel Finansal Ay";
  }

  if (mode === "creditCardCycle") {
    return "Kredi Kartı Dönemi";
  }

  return "Finansal Dönem";
}

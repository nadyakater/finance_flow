import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../../../firebase";

// =====================================================
// 11.GÜN - Raporlama dönemi ayarları
//
// Kullanıcının seçtiği finansal dönem ayarlarının
// Firestore ile iletişimi bu dosyada yönetilir.
//
// Kullanıcı:
//
// - Takvim ayı
// - Özel finansal ay
// - Kredi kartı dönemi
//
// seçeneklerinden birini seçebilir.
//
// Bu seçim Firestore'da saklandığı için kullanıcı
// uygulamayı tekrar açtığında aynı ayar korunur.
// =====================================================

// =====================================================
// 11.GÜN
// Firestore Timestamp değerini uygulamanın daha rahat
// kullanabileceği ISO tarih metnine dönüştürür.
// =====================================================

function convertTimestampToIsoString(timestampValue) {
  if (!timestampValue) {
    return "";
  }

  if (typeof timestampValue.toDate === "function") {
    return timestampValue.toDate().toISOString();
  }

  if (typeof timestampValue === "string") {
    return timestampValue;
  }

  return "";
}

// =====================================================
// 11.GÜN
// Kullanıcının raporlama ayarlarının tutulduğu
// Firestore belgesinin referansını oluşturur.
//
// Firestore yapısı:
//
// users/{userId}/settings/reporting
//
// şeklinde olacaktır.
//
// Böylece raporlama ayarları kullanıcıya özel tutulur.
// =====================================================

function getReportingSettingsReference(userId) {
  return doc(db, "users", userId, "settings", "reporting");
}

// =====================================================
// 11.GÜN
// Firestore'dan gelen raporlama ayarı belgesini
// uygulamada kullanacağımız sade veri yapısına çevirir.
// =====================================================

function mapReportingSettingsDocument(reportingDocument) {
  const data = reportingDocument.data();

  return {
    // =====================================================
    // 11.GÜN
    // Kullanıcının seçtiği raporlama türü.
    //
    // calendarMonth
    // customMonth
    // creditCardCycle
    // =====================================================

    mode: data.mode ?? "calendarMonth",

    // =====================================================
    // 11.GÜN
    // Özel finansal ay kullanılıyorsa başlangıç günü.
    //
    // Örneğin 25 seçilirse finansal ay her ayın
    // 25'inde başlayacaktır.
    // =====================================================

    customMonthStartDay: Number(data.customMonthStartDay ?? 1),

    // =====================================================
    // 11.GÜN
    // Kredi kartı dönemi seçilmişse hangi kartın
    // ekstre döneminin kullanılacağını belirtir.
    // =====================================================

    selectedCreditCardId: data.selectedCreditCardId ?? "",

    ownerId: data.ownerId ?? "",

    createdAtUtc: convertTimestampToIsoString(data.createdAtUtc),

    updatedAtUtc: convertTimestampToIsoString(data.updatedAtUtc),

    createdBy: data.createdBy ?? "",

    updatedBy: data.updatedBy ?? "",

    version: Number(data.version ?? 1),
  };
}

// =====================================================
// 11.GÜN
// Kullanıcının seçtiği raporlama modunun geçerli olup
// olmadığını kontrol eder.
//
// Tanımlanmamış bir değer Firestore'a kaydedilmez.
// =====================================================

function validateReportingMode(mode) {
  const allowedModes = ["calendarMonth", "customMonth", "creditCardCycle"];

  if (!allowedModes.includes(mode)) {
    throw new Error("REPORTING_MODE_INVALID");
  }

  return mode;
}

// =====================================================
// 11.GÜN
// Özel finansal ay başlangıç günü kontrol edilir.
//
// Kullanıcı yalnızca 1 ile 31 arasında bir gün
// belirleyebilir.
// =====================================================

function validateCustomMonthStartDay(customMonthStartDay) {
  const numericDay = Number(customMonthStartDay);

  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > 31) {
    throw new Error("REPORTING_CUSTOM_START_DAY_INVALID");
  }

  return numericDay;
}

// =====================================================
// 11.GÜN
// Kullanıcının daha önce kaydettiği raporlama ayarlarını
// Firestore'dan getirir.
// =====================================================

export async function getReportingSettings(userId) {
  if (!userId) {
    throw new Error("REPORTING_USER_REQUIRED");
  }

  const reportingReference = getReportingSettingsReference(userId);

  const reportingSnapshot = await getDoc(reportingReference);

  // =====================================================
  // 11.GÜN
  // Kullanıcı henüz herhangi bir raporlama ayarı
  // kaydetmediyse varsayılan olarak takvim ayı kullanılır.
  //
  // Böylece yeni kullanıcı için ayrıca ayar oluşturulmadan
  // raporlama sistemi çalışmaya başlayabilir.
  // =====================================================

  if (!reportingSnapshot.exists()) {
    return {
      mode: "calendarMonth",

      customMonthStartDay: 1,

      selectedCreditCardId: "",

      ownerId: userId,

      createdAtUtc: "",

      updatedAtUtc: "",

      createdBy: userId,

      updatedBy: userId,

      version: 1,
    };
  }

  return mapReportingSettingsDocument(reportingSnapshot);
}

// =====================================================
// 11.GÜN
// Kullanıcının raporlama dönemi ayarlarını Firestore'a
// kaydeder.
//
// setDoc + merge kullanıldığı için aynı belge varsa
// güncellenir, yoksa yeni belge oluşturulur.
// =====================================================

export async function saveReportingSettings(userId, reportingSettings) {
  if (!userId) {
    throw new Error("REPORTING_USER_REQUIRED");
  }

  const mode = validateReportingMode(reportingSettings.mode);

  // =====================================================
  // 11.GÜN
  // Özel finansal ay kullanılmasa bile değer güvenli
  // şekilde doğrulanarak saklanır.
  //
  // Varsayılan başlangıç günü 1'dir.
  // =====================================================

  const customMonthStartDay = validateCustomMonthStartDay(
    reportingSettings.customMonthStartDay ?? 1,
  );

  // =====================================================
  // 11.GÜN
  // Kredi kartı dönemi seçildiyse kullanıcı mutlaka
  // hangi kartı kullanacağını seçmelidir.
  //
  // Takvim ayı veya özel finansal ay seçilmişse
  // kredi kartı seçimi zorunlu değildir.
  // =====================================================

  const selectedCreditCardId = String(
    reportingSettings.selectedCreditCardId ?? "",
  ).trim();

  if (mode === "creditCardCycle" && !selectedCreditCardId) {
    throw new Error("REPORTING_CREDIT_CARD_REQUIRED");
  }

  const reportingReference = getReportingSettingsReference(userId);

  const currentSnapshot = await getDoc(reportingReference);

  const currentData = currentSnapshot.exists() ? currentSnapshot.data() : null;

  // =====================================================
  // 11.GÜN
  // Ayar ilk kez oluşturuluyorsa createdAt ve createdBy
  // bilgileri hazırlanır.
  //
  // Daha önce oluşturulmuş bir kayıt güncelleniyorsa
  // eski oluşturulma bilgileri korunur.
  // =====================================================

  const createdAtUtc = currentData?.createdAtUtc ?? serverTimestamp();

  const createdBy = currentData?.createdBy ?? userId;

  const currentVersion = Number(currentData?.version ?? 0);

  await setDoc(
    reportingReference,
    {
      ownerId: userId,

      // =====================================================
      // 11.GÜN
      // Kullanıcının seçtiği raporlama modu saklanır.
      // =====================================================

      mode,

      // =====================================================
      // 11.GÜN
      // Özel finansal ay seçildiğinde kullanılacak
      // başlangıç günü saklanır.
      // =====================================================

      customMonthStartDay,

      // =====================================================
      // 11.GÜN
      // Kredi kartı dönemi seçilmişse seçilen kartın
      // kimliği saklanır.
      // =====================================================

      selectedCreditCardId,

      createdAtUtc,

      updatedAtUtc: serverTimestamp(),

      createdBy,

      updatedBy: userId,

      // =====================================================
      // 11.GÜN
      // Ayar her değiştirildiğinde versiyon değeri artırılır.
      // =====================================================

      version: currentVersion + 1,
    },
    {
      merge: true,
    },
  );

  // =====================================================
  // 11.GÜN
  // Kaydetme işleminden sonra Firestore'daki güncel
  // belge tekrar okunarak Redux tarafına döndürülür.
  // =====================================================

  const updatedSnapshot = await getDoc(reportingReference);

  return mapReportingSettingsDocument(updatedSnapshot);
}

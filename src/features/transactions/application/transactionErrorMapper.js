const TRANSACTION_ERROR_MESSAGES = {
  TRANSACTION_INVALID_AMOUNT: "Tutar sıfırdan büyük olmalıdır.",

  TRANSACTION_INVALID_DISCOUNT:
    "İndirim tutarı geçerli değil veya ürün tutarını aşıyor.",

  TRANSACTION_INVALID_QUANTITY: "Ürün miktarı sıfırdan büyük olmalıdır.",

  TRANSACTION_UNSUPPORTED_UNIT: "Seçilen ürün birimi desteklenmiyor.",

  TRANSACTION_LINE_REQUIRED: "Gider için en az bir satır eklemelisiniz.",

  TRANSACTION_LINE_CATEGORY_REQUIRED:
    "Her gider satırı için kategori seçmelisiniz.",

  TRANSACTION_TOTAL_MISMATCH: "Satırların toplamı işlem toplamıyla uyuşmuyor.",

  TRANSACTION_CATEGORY_REQUIRED: "Kategori seçmelisiniz.",

  TRANSACTION_PAYMENT_METHOD_REQUIRED: "Ödeme yöntemi seçmelisiniz.",

  TRANSACTION_DATE_REQUIRED: "İşlem tarihini seçmelisiniz.",

  TRANSACTION_USER_REQUIRED:
    "İşlem oluşturmak için kullanıcı oturumu bulunamadı.",

  TRANSACTION_NOT_FOUND: "İşlem kaydı bulunamadı.",

  TRANSACTION_REFUND_INVALID: "İade tutarı geçerli değil.",

  TRANSACTION_REFUND_EXCEEDS_REMAINING:
    "İade tutarı kalan iade edilebilir tutarı aşıyor.",

  TRANSACTION_REFUND_LINE_INVALID: "İade edilen ürün satırı bulunamadı.",

  REFUND_ORIGINAL_REQUIRED:
    "İade oluşturmak için bir gider kaydı seçmelisiniz.",

  REFUND_ORIGINAL_NOT_FOUND: "İade edilecek gider kaydı bulunamadı.",

  REFUND_ONLY_EXPENSE: "Yalnızca gider kayıtları için iade oluşturabilirsiniz.",

  REFUND_AMOUNT_EXCEEDED: "İade tutarı, kalan iade edilebilir tutarı aşamaz.",

  RECEIPT_INVALID_FILE_TYPE:
    "Yalnızca JPG, PNG, WEBP veya PDF dosyası yükleyebilirsiniz.",

  RECEIPT_FILE_TOO_LARGE: "Fiş veya fatura dosyası en fazla 5 MB olabilir.",

  RECEIPT_INVALID_PATH:
    "Fiş dosyası için geçerli kullanıcı veya işlem bilgisi bulunamadı.",
};

export function getTransactionErrorMessage(
  error,
  fallbackMessage = "İşlem sırasında bir hata oluştu.",
) {
  return TRANSACTION_ERROR_MESSAGES[error?.message] ?? fallbackMessage;
}

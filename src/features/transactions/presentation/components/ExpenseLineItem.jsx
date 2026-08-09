// =====================================================
// 7.GÜN
// Tek bir gider satırına ait kategori, ürün, marka,
// miktar, paket içeriği, birim, tutar ve indirim
// alanlarını gösterir.
//
// 8.GÜN
// Yakıt ürünü seçildiğinde yakıt türü, litre,
// litre fiyatı, araç ve kilometre alanları gösterilir.
// =====================================================

function getNumericValue(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const normalizedValue =
    typeof value === "string"
      ? value.replace(",", ".")
      : value;

  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
}

function getFuelTypeLabel(fuelType) {
  const fuelTypeLabels = {
    gasoline: "Benzin",
    diesel: "Motorin",
    lpg: "LPG",
    other: "Diğer",
  };

  return fuelTypeLabels[fuelType] ?? "Diğer";
}

function ExpenseLineItem({
  line,
  index,
  expenseLinesCount,
  transactionCategoryOptions,
  categoryLoadStatus,
  products,
  brands,
  handleExpenseLineChange,
  handleRemoveExpenseLine,
}) {
  const selectedProduct =
    products.find(
      (product) =>
        product.id === line.productId,
    ) ?? null;

  const productHasBeenSelected =
    Boolean(selectedProduct);

  const isFuelProduct =
    selectedProduct?.productType === "fuel" ||
    line.productType === "fuel";

  const selectedFuelType =
    line.fuelType ||
    selectedProduct?.fuelType ||
    "gasoline";

  const liters =
    getNumericValue(line.liters);

  const fuelUnitPrice =
    getNumericValue(
      line.fuelUnitPrice,
    );

  const calculatedFuelTotal =
    liters > 0 &&
    fuelUnitPrice > 0
      ? liters * fuelUnitPrice
      : 0;

  const enteredLineAmount =
    getNumericValue(line.amount);

  const fuelTotalDifference =
    calculatedFuelTotal > 0 &&
    enteredLineAmount > 0
      ? Math.abs(
          calculatedFuelTotal -
            enteredLineAmount,
        )
      : 0;

  const hasFuelTotalDifference =
    fuelTotalDifference > 0.05;

  return (
    <div className="category-action-panel expense-line-panel">
      <div className="expense-line-header">
        <div>
          <p className="selected-category-text">
            <strong>
              {index + 1}. Gider Satırı
            </strong>
          </p>

          {isFuelProduct && (
            <span className="fuel-product-badge">
              Yakıt •{" "}
              {getFuelTypeLabel(
                selectedFuelType,
              )}
            </span>
          )}
        </div>

        <button
          className="danger-button"
          type="button"
          onClick={() =>
            handleRemoveExpenseLine(
              line.id,
            )
          }
          disabled={
            expenseLinesCount === 1
          }
        >
          Satırı Kaldır
        </button>
      </div>

      <div className="category-form-grid">
        <div>
          <label
            className="form-label"
            htmlFor={`expenseCategory-${line.id}`}
          >
            Kategori *
          </label>

          <select
            id={`expenseCategory-${line.id}`}
            className="form-input"
            value={line.categoryId}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "categoryId",
                event.target.value,
              )
            }
            disabled={
              categoryLoadStatus ===
                "loading" ||
              transactionCategoryOptions.length ===
                0
            }
            required
          >
            <option value="">
              Kategori seçiniz
            </option>

            {transactionCategoryOptions.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.pathNames.join(
                    " > ",
                  )}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`expenseProduct-${line.id}`}
          >
            Ürün
          </label>

          <select
            id={`expenseProduct-${line.id}`}
            className="form-input"
            value={line.productId}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "productId",
                event.target.value,
              )
            }
          >
            <option value="">
              Ürün bilgisi bulunmuyor
            </option>

            {products.map(
              (product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                  {product.productType ===
                  "fuel"
                    ? ` (${getFuelTypeLabel(
                        product.fuelType,
                      )})`
                    : ""}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`expenseBrand-${line.id}`}
          >
            Marka
          </label>

          <select
            id={`expenseBrand-${line.id}`}
            className="form-input"
            value={line.brandId}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "brandId",
                event.target.value,
              )
            }
            disabled={
              productHasBeenSelected &&
              Boolean(
                selectedProduct?.brandId,
              )
            }
          >
            <option value="">
              Marka seçilmedi
            </option>

            {brands.map(
              (brand) => (
                <option
                  key={brand.id}
                  value={brand.id}
                >
                  {brand.name}
                </option>
              ),
            )}
          </select>
        </div>

        {isFuelProduct ? (
          <>
            <div>
              <label
                className="form-label"
                htmlFor={`fuelType-${line.id}`}
              >
                Yakıt Türü *
              </label>

              <select
                id={`fuelType-${line.id}`}
                className="form-input"
                value={selectedFuelType}
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "fuelType",
                    event.target.value,
                  )
                }
                required
              >
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

            <div>
              <label
                className="form-label"
                htmlFor={`fuelLiters-${line.id}`}
              >
                Alınan Litre *
              </label>

              <input
                id={`fuelLiters-${line.id}`}
                className="form-input"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="Örnek: 42,750"
                value={line.liters ?? ""}
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "liters",
                    event.target.value,
                  )
                }
                required
              />
            </div>

            <div>
              <label
                className="form-label"
                htmlFor={`fuelUnitPrice-${line.id}`}
              >
                Litre Fiyatı *
              </label>

              <input
                id={`fuelUnitPrice-${line.id}`}
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Örnek: 48,75"
                value={
                  line.fuelUnitPrice ?? ""
                }
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "fuelUnitPrice",
                    event.target.value,
                  )
                }
                required
              />
            </div>

            <div>
              <label
                className="form-label"
                htmlFor={`vehicleId-${line.id}`}
              >
                Araç / Plaka Takma Adı
              </label>

              <input
                id={`vehicleId-${line.id}`}
                className="form-input"
                type="text"
                maxLength="100"
                placeholder="Örnek: Aile Arabası"
                value={
                  line.vehicleId ?? ""
                }
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "vehicleId",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label
                className="form-label"
                htmlFor={`odometer-${line.id}`}
              >
                Kilometre / Odometre
              </label>

              <input
                id={`odometer-${line.id}`}
                className="form-input"
                type="number"
                min="0"
                step="1"
                placeholder="Örnek: 154320"
                value={
                  line.odometer ?? ""
                }
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "odometer",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="fuel-calculated-total">
              <span className="form-label">
                Hesaplanan Yakıt Toplamı
              </span>

              <strong>
                {calculatedFuelTotal.toLocaleString(
                  "tr-TR",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}{" "}
                ₺
              </strong>

              <small>
                {liters.toLocaleString(
                  "tr-TR",
                  {
                    maximumFractionDigits: 3,
                  },
                )}{" "}
                L ×{" "}
                {fuelUnitPrice.toLocaleString(
                  "tr-TR",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}{" "}
                ₺
              </small>
            </div>
          </>
        ) : (
          <>
            <div>
              <label
                className="form-label"
                htmlFor={`purchaseQuantity-${line.id}`}
              >
                Satın Alınan Paket /
                Ürün Adedi
              </label>

              <input
                id={`purchaseQuantity-${line.id}`}
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                value={
                  line.purchaseQuantity
                }
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "purchaseQuantity",
                    event.target.value,
                  )
                }
                disabled={!line.productId}
              />
            </div>

            <div>
              <label
                className="form-label"
                htmlFor={`unitCount-${line.id}`}
              >
                Paket İçindeki Ürün
                Adedi
              </label>

              <input
                id={`unitCount-${line.id}`}
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                value={line.unitCount}
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "unitCount",
                    event.target.value,
                  )
                }
                disabled={!line.productId}
              />
            </div>

            <div>
              <label
                className="form-label"
                htmlFor={`unitSize-${line.id}`}
              >
                Bir Ürünün Miktarı
              </label>

              <input
                id={`unitSize-${line.id}`}
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                value={line.unitSize}
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "unitSize",
                    event.target.value,
                  )
                }
                disabled={!line.productId}
              />
            </div>

            <div>
              <label
                className="form-label"
                htmlFor={`unitType-${line.id}`}
              >
                Miktar Birimi
              </label>

              <select
                id={`unitType-${line.id}`}
                className="form-input"
                value={line.unitType}
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "unitType",
                    event.target.value,
                  )
                }
                disabled={!line.productId}
              >
                <option value="adet">
                  Adet
                </option>

                <option value="ml">
                  Mililitre
                </option>

                <option value="l">
                  Litre
                </option>

                <option value="g">
                  Gram
                </option>

                <option value="kg">
                  Kilogram
                </option>
              </select>
            </div>

            <div>
              <label
                className="form-label"
                htmlFor={`unitPrice-${line.id}`}
              >
                Paket / Ürün Birim
                Fiyatı
              </label>

              <input
                id={`unitPrice-${line.id}`}
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="İsteğe bağlı"
                value={line.unitPrice}
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "unitPrice",
                    event.target.value,
                  )
                }
                disabled={!line.productId}
              />
            </div>
          </>
        )}

        <div>
          <label
            className="form-label"
            htmlFor={`lineAmount-${line.id}`}
          >
            {isFuelProduct
              ? "Yakıt Toplam Tutarı *"
              : "Tutar *"}
          </label>

          <input
            id={`lineAmount-${line.id}`}
            className={`form-input ${
              hasFuelTotalDifference
                ? "input-warning"
                : ""
            }`}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            value={line.amount}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "amount",
                event.target.value,
              )
            }
            required
          />

          {isFuelProduct &&
            calculatedFuelTotal > 0 && (
              <p
                className={
                  hasFuelTotalDifference
                    ? "fuel-total-warning"
                    : "fuel-total-success"
                }
              >
                {hasFuelTotalDifference
                  ? `Litre × litre fiyatı sonucu ${calculatedFuelTotal.toLocaleString(
                      "tr-TR",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )} ₺ olmalıdır.`
                  : "Girilen toplam ile yakıt hesabı uyumludur."}
              </p>
            )}
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`lineDiscount-${line.id}`}
          >
            Satır İndirimi
          </label>

          <input
            id={`lineDiscount-${line.id}`}
            className="form-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={line.discount}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "discount",
                event.target.value,
              )
            }
          />
        </div>

        <div className="expense-line-note-field">
          <label
            className="form-label"
            htmlFor={`lineNote-${line.id}`}
          >
            Satır Açıklaması
          </label>

          <input
            id={`lineNote-${line.id}`}
            className="form-input"
            type="text"
            maxLength="200"
            placeholder={
              isFuelProduct
                ? "İsteğe bağlı yakıt açıklaması"
                : "İsteğe bağlı ürün veya gider açıklaması"
            }
            value={line.note}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "note",
                event.target.value,
              )
            }
          />
        </div>
      </div>

      {line.productId &&
        !isFuelProduct && (
          <p className="empty-message">
            Normalize miktar; paket adedi ×
            paket içindeki adet × ürün miktarı
            kullanılarak hesaplanacaktır.
          </p>
        )}

      {isFuelProduct && (
        <p className="empty-message">
          Yakıt miktarı litre olarak
          saklanır. Litre fiyatı; benzin,
          motorin ve LPG için ayrı ayrı
          analiz edilir.
        </p>
      )}
    </div>
  );
}

export default ExpenseLineItem;
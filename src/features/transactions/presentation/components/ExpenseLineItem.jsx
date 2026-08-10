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

// =====================================================
// DÜZENLEME
// Gider satırındaki kullanıcıyı gereksiz yere uğraştıran
// alanlar sadeleştirildi.
//
// Standart giderlerde temel bilgiler korunurken, yakıt
// giderinde toplam tutar litre ve litre fiyatından otomatik
// hesaplandığı için kullanıcıdan tekrar istenmez.
// =====================================================

function getNumericValue(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const normalizedValue =
    typeof value === "string" ? value.replace(",", ".") : value;

  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
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
    products.find((product) => product.id === line.productId) ?? null;

  const productHasBeenSelected = Boolean(selectedProduct);

  const isFuelProduct =
    selectedProduct?.productType === "fuel" || line.productType === "fuel";

  const selectedFuelType =
    line.fuelType || selectedProduct?.fuelType || "gasoline";

  const liters = getNumericValue(line.liters);

  const fuelUnitPrice = getNumericValue(line.fuelUnitPrice);

  const calculatedFuelTotal =
    liters > 0 && fuelUnitPrice > 0 ? liters * fuelUnitPrice : 0;

  return (
    <div className="category-action-panel expense-line-panel">
      <div className="expense-line-header">
        <div>
          <p className="selected-category-text">
            <strong>{index + 1}. Gider Satırı</strong>
          </p>

          {isFuelProduct && (
            <span className="fuel-product-badge">
              Yakıt • {getFuelTypeLabel(selectedFuelType)}
            </span>
          )}
        </div>

        <button
          className="danger-button"
          type="button"
          onClick={() => handleRemoveExpenseLine(line.id)}
          disabled={expenseLinesCount === 1}
        >
          Satırı Kaldır
        </button>
      </div>

      {/* 10.GÜN - Gider girişinin daha kolay yapılabilmesi için satır alanları sadeleştirildi. */}

      <div className="category-form-grid">
        <div>
          <label className="form-label" htmlFor={`expenseCategory-${line.id}`}>
            Kategori *
          </label>

          <select
            id={`expenseCategory-${line.id}`}
            className="form-input"
            value={line.categoryId}
            onChange={(event) =>
              handleExpenseLineChange(line.id, "categoryId", event.target.value)
            }
            disabled={
              categoryLoadStatus === "loading" ||
              transactionCategoryOptions.length === 0
            }
            required
          >
            <option value="">Kategori seçiniz</option>

            {transactionCategoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.pathNames.join(" > ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label" htmlFor={`expenseProduct-${line.id}`}>
            Ürün
          </label>

          <select
            id={`expenseProduct-${line.id}`}
            className="form-input"
            value={line.productId}
            onChange={(event) =>
              handleExpenseLineChange(line.id, "productId", event.target.value)
            }
          >
            <option value="">Ürün seçmeden devam et</option>

            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {product.productType === "fuel"
                  ? ` (${getFuelTypeLabel(product.fuelType)})`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label" htmlFor={`expenseBrand-${line.id}`}>
            Marka
          </label>

          <select
            id={`expenseBrand-${line.id}`}
            className="form-input"
            value={line.brandId}
            onChange={(event) =>
              handleExpenseLineChange(line.id, "brandId", event.target.value)
            }
            disabled={
              productHasBeenSelected && Boolean(selectedProduct?.brandId)
            }
          >
            <option value="">Marka seçmeden devam et</option>

            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {isFuelProduct ? (
          <>
            <div>
              <label className="form-label" htmlFor={`fuelType-${line.id}`}>
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
                <option value="gasoline">Benzin</option>
                <option value="diesel">Motorin</option>
                <option value="lpg">LPG</option>
                <option value="other">Diğer</option>
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor={`fuelLiters-${line.id}`}>
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
                  handleExpenseLineChange(line.id, "liters", event.target.value)
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
                value={line.fuelUnitPrice ?? ""}
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
              <label className="form-label" htmlFor={`vehicleId-${line.id}`}>
                Araç
              </label>

              <input
                id={`vehicleId-${line.id}`}
                className="form-input"
                type="text"
                maxLength="100"
                placeholder="Örnek: Aile Arabası"
                value={line.vehicleId ?? ""}
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
              <label className="form-label" htmlFor={`odometer-${line.id}`}>
                Kilometre
              </label>

              <input
                id={`odometer-${line.id}`}
                className="form-input"
                type="number"
                min="0"
                step="1"
                placeholder="Örnek: 154320"
                value={line.odometer ?? ""}
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "odometer",
                    event.target.value,
                  )
                }
              />
            </div>

            {/* DÜZENLEME - Yakıt tutarının kullanıcı tarafından tekrar girilmesi kaldırılarak otomatik hesaplanan toplam gösterildi. */}
            <div className="fuel-calculated-total">
              <span className="form-label">Hesaplanan Yakıt Toplamı</span>

              <strong>
                {calculatedFuelTotal.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₺
              </strong>

              <small>
                {liters.toLocaleString("tr-TR", {
                  maximumFractionDigits: 3,
                })}{" "}
                L ×{" "}
                {fuelUnitPrice.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
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
                Adet
              </label>

              <input
                id={`purchaseQuantity-${line.id}`}
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                value={line.purchaseQuantity}
                onChange={(event) =>
                  handleExpenseLineChange(
                    line.id,
                    "purchaseQuantity",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="form-label" htmlFor={`lineAmount-${line.id}`}>
                Tutar *
              </label>

              <input
                id={`lineAmount-${line.id}`}
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={line.amount}
                onChange={(event) =>
                  handleExpenseLineChange(line.id, "amount", event.target.value)
                }
                required
              />
            </div>
          </>
        )}

        {/* DÜZENLEME - Satır indirimi kaldırılarak gider satırındaki alan sayısı azaltıldı. */}
        <div className="expense-line-note-field">
          <label className="form-label" htmlFor={`lineNote-${line.id}`}>
            Açıklama
          </label>

          <input
            id={`lineNote-${line.id}`}
            className="form-input"
            type="text"
            maxLength="200"
            placeholder="İsteğe bağlı açıklama"
            value={line.note}
            onChange={(event) =>
              handleExpenseLineChange(line.id, "note", event.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
}

export default ExpenseLineItem;

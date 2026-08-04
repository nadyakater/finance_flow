import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  addBranch,
  addBrand,
  addMerchant,
  addProduct,
} from "../../application/catalogThunks";

import {
  selectBrands,
  selectCatalogError,
  selectCatalogLoadStatus,
  selectCatalogMutationStatus,
  selectMerchants,
} from "../catalogSelectors";

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

// =====================================================
// 6.GÜN
// Firma, şube, marka ve ürün katalog yönetimi.
//
// PDF mimarisine göre:
// - Geçici form değerleri presentation bileşeninde tutulur.
// - Kalıcı katalog verileri Redux selectorlarından alınır.
// - Firebase'e doğrudan erişilmez.
// - Kayıt işlemleri application katmanındaki thunklarla yapılır.
// =====================================================

function CatalogSection() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);
  const merchants = useSelector(selectMerchants);
  const brands = useSelector(selectBrands);
  const catalogLoadStatus = useSelector(selectCatalogLoadStatus);
  const catalogMutationStatus = useSelector(selectCatalogMutationStatus);
  const catalogError = useSelector(selectCatalogError);

  const [merchantName, setMerchantName] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState("");

  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");

  const [brandName, setBrandName] = useState("");

  const [productName, setProductName] = useState("");
  const [productBrandId, setProductBrandId] = useState("");
  const [productAliases, setProductAliases] = useState("");

  const [catalogFormError, setCatalogFormError] = useState("");

  const isCatalogMutating = catalogMutationStatus === "loading";

  const selectedMerchant =
    merchants.find((merchant) => merchant.id === selectedMerchantId) ?? null;

  const handleAddMerchant = async (event) => {
    event.preventDefault();
    setCatalogFormError("");

    if (!currentUser?.id || !merchantName.trim()) {
      setCatalogFormError("Firma adı zorunludur.");
      return;
    }

    const result = await dispatch(
      addMerchant({
        userId: currentUser.id,
        name: merchantName,
      }),
    );

    if (addMerchant.fulfilled.match(result)) {
      setSelectedMerchantId(result.payload.id);
      setMerchantName("");
    }
  };

  const handleAddBranch = async (event) => {
    event.preventDefault();
    setCatalogFormError("");

    if (!currentUser?.id || !selectedMerchant) {
      setCatalogFormError("Şube eklemek için önce firma seçiniz.");
      return;
    }

    if (!branchName.trim()) {
      setCatalogFormError("Şube adı zorunludur.");
      return;
    }

    const result = await dispatch(
      addBranch({
        userId: currentUser.id,
        merchantId: selectedMerchant.id,
        merchantName: selectedMerchant.name,
        name: branchName,
        address: branchAddress,
      }),
    );

    if (addBranch.fulfilled.match(result)) {
      setBranchName("");
      setBranchAddress("");
    }
  };

  const handleAddBrand = async (event) => {
    event.preventDefault();
    setCatalogFormError("");

    if (!currentUser?.id || !brandName.trim()) {
      setCatalogFormError("Marka adı zorunludur.");
      return;
    }

    const result = await dispatch(
      addBrand({
        userId: currentUser.id,
        name: brandName,
      }),
    );

    if (addBrand.fulfilled.match(result)) {
      setProductBrandId(result.payload.id);
      setBrandName("");
    }
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();
    setCatalogFormError("");

    if (!currentUser?.id || !productName.trim()) {
      setCatalogFormError("Ürün adı zorunludur.");
      return;
    }

    const selectedBrand =
      brands.find((brand) => brand.id === productBrandId) ?? null;

    const result = await dispatch(
      addProduct({
        userId: currentUser.id,
        name: productName,
        aliases: productAliases
          .split(",")
          .map((alias) => alias.trim())
          .filter(Boolean),
        brandId: selectedBrand?.id ?? "",
        brandName: selectedBrand?.name ?? "",
      }),
    );

    if (addProduct.fulfilled.match(result)) {
      setProductName("");
      setProductAliases("");
      setProductBrandId("");
    }
  };

  return (
    <section className="category-management-section">
      <h2 className="section-title">
        Firma, Şube, Marka ve Ürün Kataloğu
      </h2>

      <div className="category-form-grid">
        <form
          className="category-action-panel"
          onSubmit={handleAddMerchant}
        >
          <label className="form-label" htmlFor="merchantName">
            Yeni Firma
          </label>

          <input
            id="merchantName"
            className="form-input"
            type="text"
            placeholder="Firma adı"
            value={merchantName}
            onChange={(event) => setMerchantName(event.target.value)}
          />

          <button
            className="secondary-button"
            type="submit"
            disabled={isCatalogMutating}
          >
            Firma Ekle
          </button>
        </form>

        <form
          className="category-action-panel"
          onSubmit={handleAddBranch}
        >
          <label className="form-label" htmlFor="catalogMerchant">
            Şubenin Firması
          </label>

          <select
            id="catalogMerchant"
            className="form-input"
            value={selectedMerchantId}
            onChange={(event) => setSelectedMerchantId(event.target.value)}
          >
            <option value="">Firma seçiniz</option>

            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="branchName">
            Yeni Şube
          </label>

          <input
            id="branchName"
            className="form-input"
            type="text"
            placeholder="Şube adı"
            value={branchName}
            onChange={(event) => setBranchName(event.target.value)}
          />

          <label className="form-label" htmlFor="branchAddress">
            Şube Adresi
          </label>

          <input
            id="branchAddress"
            className="form-input"
            type="text"
            placeholder="Adres (isteğe bağlı)"
            value={branchAddress}
            onChange={(event) => setBranchAddress(event.target.value)}
          />

          <button
            className="secondary-button"
            type="submit"
            disabled={isCatalogMutating || !selectedMerchantId}
          >
            Şube Ekle
          </button>
        </form>

        <form
          className="category-action-panel"
          onSubmit={handleAddBrand}
        >
          <label className="form-label" htmlFor="brandName">
            Yeni Marka
          </label>

          <input
            id="brandName"
            className="form-input"
            type="text"
            placeholder="Marka adı"
            value={brandName}
            onChange={(event) => setBrandName(event.target.value)}
          />

          <button
            className="secondary-button"
            type="submit"
            disabled={isCatalogMutating}
          >
            Marka Ekle
          </button>
        </form>

        <form
          className="category-action-panel"
          onSubmit={handleAddProduct}
        >
          <label className="form-label" htmlFor="productName">
            Yeni Ürün
          </label>

          <input
            id="productName"
            className="form-input"
            type="text"
            placeholder="Ürün adı"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
          />

          <label className="form-label" htmlFor="productBrand">
            Ürün Markası
          </label>

          <select
            id="productBrand"
            className="form-input"
            value={productBrandId}
            onChange={(event) => setProductBrandId(event.target.value)}
          >
            <option value="">Markasız ürün</option>

            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="productAliases">
            Alternatif Ürün Adları
          </label>

          <input
            id="productAliases"
            className="form-input"
            type="text"
            placeholder="Örnek: soda, maden suyu"
            value={productAliases}
            onChange={(event) => setProductAliases(event.target.value)}
          />

          <button
            className="secondary-button"
            type="submit"
            disabled={isCatalogMutating}
          >
            Ürün Ekle
          </button>
        </form>
      </div>

      {catalogLoadStatus === "loading" && (
        <p className="empty-message">
          Katalog bilgileri yükleniyor...
        </p>
      )}

      {catalogFormError && (
        <p className="form-error">{catalogFormError}</p>
      )}

      {catalogError && (
        <p className="form-error">{catalogError}</p>
      )}
    </section>
  );
}

export default CatalogSection;
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  addCategory,
  loadCategories,
} from "../features/categories/application/categoryThunks";

import {
  selectCategories,
  selectCategoryError,
  selectCategoryLoadStatus,
  selectCategorySaveStatus,
} from "../features/categories/presentation/categorySelectors";

import {
  selectCurrentUser,
} from "../features/auth/presentation/authSelectors";

// =====================================================
// 5.GÜN
// 3.7 - Sınırsız Kategori Ağacı
// Kategori ekleme, üst kategori seçme ve listeleme
// işlemleri CategoryManager bileşeninde toplandı.
// =====================================================

function CategoryManager() {
  const dispatch = useDispatch();

  const currentUser =
    useSelector(selectCurrentUser);

  const categories =
    useSelector(selectCategories);

  const categoryLoadStatus =
    useSelector(
      selectCategoryLoadStatus,
    );

  const categorySaveStatus =
    useSelector(
      selectCategorySaveStatus,
    );

  const categoryError =
    useSelector(selectCategoryError);

  const [
    categoryName,
    setCategoryName,
  ] = useState("");

  const [
    parentCategoryId,
    setParentCategoryId,
  ] = useState("");

  // 5.GÜN - Kullanıcıya ait kategoriler sayfa açıldığında getirilir.
  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    dispatch(
      loadCategories(
        currentUser.id,
      ),
    );
  }, [
    dispatch,
    currentUser?.id,
  ]);

  // 5.GÜN - Yeni kategori Firestore'a kaydedilir.
  const handleAddCategory = async (
    event,
  ) => {
    event.preventDefault();

    const trimmedName =
      categoryName.trim();

    if (!currentUser?.id) {
      return;
    }

    if (!trimmedName) {
      return;
    }

    const result =
      await dispatch(
        addCategory({
          userId:
            currentUser.id,

          name:
            trimmedName,

          parentId:
            parentCategoryId ||
            null,
        }),
      );

    if (
      addCategory.fulfilled.match(
        result,
      )
    ) {
      setCategoryName("");
      setParentCategoryId("");
    }
  };

  return (
    <div className="transaction-form">
      <h2 className="section-title">
        📂 Kategori Yönetimi
      </h2>

      <form
        onSubmit={
          handleAddCategory
        }
      >
        <div className="form-row">
          <div>
            <label
              className="form-label"
              htmlFor="categoryName"
            >
              Kategori Adı
            </label>

            <input
              id="categoryName"
              className="form-input"
              type="text"
              required
              placeholder="Kategori adı giriniz"
              value={categoryName}
              onChange={(event) =>
                setCategoryName(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label
              className="form-label"
              htmlFor="parentCategory"
            >
              Üst Kategori
            </label>

            <select
              id="parentCategory"
              className="form-input"
              value={
                parentCategoryId
              }
              onChange={(event) =>
                setParentCategoryId(
                  event.target.value,
                )
              }
            >
              <option value="">
                Ana Kategori
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <button
          className="add-button"
          type="submit"
          disabled={
            categorySaveStatus ===
            "loading"
          }
        >
          {categorySaveStatus ===
          "loading"
            ? "Kategori ekleniyor..."
            : "Kategori Ekle"}
        </button>
      </form>

      {categoryError && (
        <p className="form-error">
          {categoryError}
        </p>
      )}

      <h3 className="section-title table-title">
        Kategoriler
      </h3>

      {categoryLoadStatus ===
        "loading" &&
      categories.length === 0 ? (
        <p>
          Kategoriler yükleniyor...
        </p>
      ) : categories.length ===
        0 ? (
        <p>
          Henüz kategori
          bulunmuyor.
        </p>
      ) : (
        <div className="table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Tür</th>
                <th>Üst Kategori</th>
              </tr>
            </thead>

            <tbody>
              {categories.map(
                (category) => {
                  const parent =
                    categories.find(
                      (item) =>
                        item.id ===
                        category.parentId,
                    );

                  return (
                    <tr
                      key={
                        category.id
                      }
                    >
                      <td>
                        {category.parentId
                          ? `↳ ${category.name}`
                          : category.name}
                      </td>

                      <td>
                        {category.parentId
                          ? "Alt kategori"
                          : "Ana kategori"}
                      </td>

                      <td>
                        {parent?.name ||
                          "-"}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CategoryManager;
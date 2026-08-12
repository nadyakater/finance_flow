import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  archiveCategoryNode,
  createCategoryNode,
  moveCategoryNode,
  restoreCategoryNode,
} from "../../features/categories/application/categoryThunks";

import {
  selectActiveCategories,
  selectArchivedCategories,
  selectCategoryError,
  selectCategoryLoadStatus,
  selectCategoryMutationStatus,
  selectCategoryTree,
} from "../../features/categories/presentation/categorySelectors";

import { selectCurrentUser } from "../../features/auth/presentation/authSelectors";

import ArchivedCategoryList from "./ArchivedCategoryList";
import CategoryActions from "./CategoryActions";
import CategoryCreateForm from "./CategoryCreateForm";
import CategoryTree from "./CategoryTree";

function isParentTypeAllowed(categoryType, parentCategoryType) {
  if (categoryType === "both") {
    return parentCategoryType === "both";
  }

  return parentCategoryType === "both" || parentCategoryType === categoryType;
}

// =====================================================
// 5.GÜN
// Sınırsız kategori ağacının presentation bileşeni.
//
// PDF mimarisine göre:
// - Form ve seçim state'leri bu bileşende tutulur.
// - Kalıcı kategori verileri Redux selectorlarından alınır.
// - Firebase'e doğrudan erişilmez.
// - İşlemler application katmanındaki thunklar üzerinden yürütülür.
// =====================================================

function CategorySection({
  categoryTotals,
  formatAmount,
}) {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);
  const activeCategories = useSelector(selectActiveCategories);
  const archivedCategories = useSelector(selectArchivedCategories);
  const categoryTree = useSelector(selectCategoryTree);
  const categoryLoadStatus = useSelector(selectCategoryLoadStatus);
  const categoryMutationStatus = useSelector(selectCategoryMutationStatus);
  const categoryError = useSelector(selectCategoryError);

  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("expense");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [moveParentId, setMoveParentId] = useState("");
  const [categoryFormError, setCategoryFormError] = useState("");

  const isCategoryMutating = categoryMutationStatus === "loading";

  const parentCategoryOptions = useMemo(
    () =>
      activeCategories.filter((category) =>
        isParentTypeAllowed(categoryType, category.categoryType),
      ),
    [activeCategories, categoryType],
  );

  const selectedCategory = useMemo(
    () =>
      activeCategories.find((category) => category.id === selectedCategoryId) ??
      null,
    [activeCategories, selectedCategoryId],
  );

  const moveParentOptions = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return activeCategories.filter(
      (category) =>
        category.id !== selectedCategory.id &&
        !category.pathIds.includes(selectedCategory.id) &&
        isParentTypeAllowed(
          selectedCategory.categoryType,
          category.categoryType,
        ),
    );
  }, [activeCategories, selectedCategory]);

  useEffect(() => {
    const selectedParentIsValid = parentCategoryOptions.some(
      (category) => category.id === parentCategoryId,
    );

    if (parentCategoryId && !selectedParentIsValid) {
      setParentCategoryId("");
    }
  }, [parentCategoryId, parentCategoryOptions]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    setCategoryFormError("");

    if (!currentUser?.id) {
      return;
    }

    if (!categoryName.trim()) {
      setCategoryFormError("Kategori adı zorunludur.");
      return;
    }

    const result = await dispatch(
      createCategoryNode({
        userId: currentUser.id,
        name: categoryName,
        parentId: parentCategoryId || null,
        categoryType,
      }),
    );

    if (createCategoryNode.fulfilled.match(result)) {
      setCategoryName("");
      setParentCategoryId("");
      setCategoryFormError("");
    }
  };

  const handleMoveCategory = async () => {
    if (!currentUser?.id || !selectedCategory) {
      return;
    }

    const result = await dispatch(
      moveCategoryNode({
        userId: currentUser.id,
        categoryId: selectedCategory.id,
        newParentId: moveParentId || null,
      }),
    );

    if (moveCategoryNode.fulfilled.match(result)) {
      setMoveParentId("");
    }
  };

  const handleArchiveCategory = async () => {
    if (!currentUser?.id || !selectedCategory) {
      return;
    }

    const shouldArchive = window.confirm(
      `"${selectedCategory.name}" kategorisi ve bütün alt kategorileri arşivlensin mi?`,
    );

    if (!shouldArchive) {
      return;
    }

    const result = await dispatch(
      archiveCategoryNode({
        userId: currentUser.id,
        categoryId: selectedCategory.id,
      }),
    );

    if (archiveCategoryNode.fulfilled.match(result)) {
      setSelectedCategoryId("");
      setMoveParentId("");
    }
  };

  // 13. gün düzenleme - Ağaç üzerinden doğrudan silme butonuna tıklanınca çalışır
  const handleDeleteCategoryById = async (categoryId) => {
    if (!currentUser?.id) {
      return;
    }

    const targetCategory = activeCategories.find((cat) => cat.id === categoryId);
    const categoryName = targetCategory ? targetCategory.name : "Bu";

    const shouldDelete = window.confirm(
      `"${categoryName}" kategorisini ve alt kategorilerini silmek istediğinize emin misiniz?`,
    );

    if (!shouldDelete) {
      return;
    }

    const result = await dispatch(
      archiveCategoryNode({
        userId: currentUser.id,
        categoryId,
      }),
    );

    if (archiveCategoryNode.fulfilled.match(result)) {
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId("");
        setMoveParentId("");
      }
    }
  };

  const handleRestoreCategory = async (category) => {
    if (!currentUser?.id) {
      return;
    }

    const shouldRestore = window.confirm(
      `"${category.name}" kategorisi arşivden çıkarılsın mı?`,
    );

    if (!shouldRestore) {
      return;
    }

    await dispatch(
      restoreCategoryNode({
        userId: currentUser.id,
        categoryId: category.id,
      }),
    );
  };

  return (
    <section className="category-management-section">
      <h2 className="section-title">
        Sınırsız Kategori Ağacı
      </h2>

      <CategoryCreateForm
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        categoryType={categoryType}
        setCategoryType={setCategoryType}
        parentCategoryId={parentCategoryId}
        setParentCategoryId={setParentCategoryId}
        parentCategoryOptions={parentCategoryOptions}
        handleCreateCategory={handleCreateCategory}
        isCategoryMutating={isCategoryMutating}
      />

      {categoryFormError && (
        <p className="form-error">
          {categoryFormError}
        </p>
      )}

      {categoryError && (
        <p className="form-error">
          {categoryError}
        </p>
      )}

      <CategoryTree
        categoryLoadStatus={categoryLoadStatus}
        activeCategories={activeCategories}
        categoryTree={categoryTree}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        categoryTotals={categoryTotals}
        formatAmount={formatAmount}
        onDeleteCategory={handleDeleteCategoryById} /* 13. gün düzenleme */
      />

      <CategoryActions
        selectedCategory={selectedCategory}
        moveParentId={moveParentId}
        setMoveParentId={setMoveParentId}
        moveParentOptions={moveParentOptions}
        handleMoveCategory={handleMoveCategory}
        handleArchiveCategory={handleArchiveCategory}
        isCategoryMutating={isCategoryMutating}
      />

      <ArchivedCategoryList
        archivedCategories={archivedCategories}
        handleRestoreCategory={handleRestoreCategory}
        isCategoryMutating={isCategoryMutating}
      />
    </section>
  );
}

export default CategorySection;
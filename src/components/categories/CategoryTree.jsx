import { useDispatch, useSelector } from "react-redux"; // 13. gün düzenleme
import { archiveCategoryNode } from "../../features/categories/application/categoryThunks"; // 13. gün düzenleme
import { selectCurrentUser } from "../../features/auth/presentation/authSelectors"; // 13. gün düzenleme

function getCategoryTypeLabel(categoryType) {
  const labels = {
    income: "Gelir",
    expense: "Gider",
    both: "Gelir ve Gider",
  };

  return labels[categoryType] ?? categoryType;
}

function CategoryTreeItem({
  node,
  selectedCategoryId,
  onSelect,
  onDelete, // 13. gün düzenleme
  categoryTotals,
  formatAmount,
}) {
  const totals = categoryTotals[node.id] ?? {
    incomeMinor: 0,
    expenseMinor: 0,
  };

  return (
    <li className="category-tree-item">
      <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "8px" }}>
        <button
          className={
            selectedCategoryId === node.id
              ? "category-node-button category-node-button-selected"
              : "category-node-button"
          }
          type="button"
          onClick={() => onSelect(node.id)}
          style={{ flex: 1 }}
        >
          <span className="category-node-main">
            <span className="category-node-name">
              {node.name}
            </span>

            <span className="category-node-type">
              {getCategoryTypeLabel(node.categoryType)}
            </span>
          </span>

          <span className="category-node-totals">
            Gelir: {formatAmount(totals.incomeMinor)} ₺ | Gider:{" "}
            {formatAmount(totals.expenseMinor)} ₺
          </span>
        </button>

        {/* 13. gün düzenleme - Kategori Sil Butonu */}
        <button
          className="danger-button"
          type="button"
          style={{ backgroundColor: "#333333", height: "100%", padding: "8px 12px" }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
        >
          Sil
        </button>
      </div>

      {node.children.length > 0 && (
        <ul className="category-tree-list category-tree-children">
          {node.children.map((childNode) => (
            <CategoryTreeItem
              key={childNode.id}
              node={childNode}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              onDelete={onDelete} // 13. gün düzenleme
              categoryTotals={categoryTotals}
              formatAmount={formatAmount}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function CategoryTree({
  categoryLoadStatus,
  activeCategories,
  categoryTree,
  selectedCategoryId,
  setSelectedCategoryId,
  categoryTotals,
  formatAmount,
  onDeleteCategory, // 13. gün düzenleme - Dışarıdan prop gelirse kullanır
}) {
  const dispatch = useDispatch(); // 13. gün düzenleme
  const currentUser = useSelector(selectCurrentUser); // 13. gün düzenleme

  // 13. gün düzenleme - Silme/Arşivleme işlemi mantığı
  const handleDeleteCategory = async (categoryId) => {
    if (onDeleteCategory) {
      onDeleteCategory(categoryId);
      return;
    }

    if (!window.confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) {
      return;
    }

    if (!currentUser?.id) {
      return;
    }

    await dispatch(
      archiveCategoryNode({
        userId: currentUser.id,
        categoryId,
      })
    );
  };

  return (
    <div className="category-tree-panel">
      {categoryLoadStatus === "loading" &&
        activeCategories.length === 0 ? (
        <p className="empty-message">
          Kategoriler yükleniyor...
        </p>
      ) : categoryTree.length === 0 ? (
        <p className="empty-message">
          Henüz aktif kategori bulunmuyor.
        </p>
      ) : (
        <ul className="category-tree-list">
          {categoryTree.map((categoryNode) => (
            <CategoryTreeItem
              key={categoryNode.id}
              node={categoryNode}
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              onDelete={handleDeleteCategory} // 13. gün düzenleme
              categoryTotals={categoryTotals}
              formatAmount={formatAmount}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default CategoryTree;
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
  categoryTotals,
  formatAmount,
}) {
  const totals = categoryTotals[node.id] ?? {
    incomeMinor: 0,
    expenseMinor: 0,
  };

  return (
    <li className="category-tree-item">
      <button
        className={
          selectedCategoryId === node.id
            ? "category-node-button category-node-button-selected"
            : "category-node-button"
        }
        type="button"
        onClick={() => onSelect(node.id)}
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

      {node.children.length > 0 && (
        <ul className="category-tree-list category-tree-children">
          {node.children.map((childNode) => (
            <CategoryTreeItem
              key={childNode.id}
              node={childNode}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
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
}) {
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
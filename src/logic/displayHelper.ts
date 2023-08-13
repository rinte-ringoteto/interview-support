export const shouldDisplayCell = (
  currentItem: any,
  currentField: any,
  currentIndex: any,
  allItems: any
) => {
  // フィールド名が "l" に続く数字でない場合は常に表示します
  if (!/^l\d+$/.test(currentField)) return true;

  // 最初の行はすべて表示します
  if (currentIndex === 0) return true;

  // 前のアイテムを取得します
  const previousItem = allItems[currentIndex - 1];

  // もし現在のフィールドが空欄であるなら、そのセルは表示します
  if (currentItem[currentField] === "") return true;

  // 前のアイテムと現在のアイテムのフィールド（列）が一致するか確認します
  return previousItem[currentField] !== currentItem[currentField];
};

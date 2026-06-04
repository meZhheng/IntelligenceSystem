import { computed, ref } from "vue";
import { isAnalyzed } from "./socialResult";
export function useSelection(items) {
    const selectedItems = ref([]);
    const selectedCount = computed(() => selectedItems.value.length);
    const currentPageIds = computed(() => items.value.map((item) => item.id));
    const unanalyzedIds = computed(() => items.value.filter((item) => !isAnalyzed(item)).map((item) => item.id));
    const isSelected = (id) => selectedItems.value.includes(id);
    const selectCurrentPage = () => {
        selectedItems.value = [...currentPageIds.value];
    };
    const selectCurrentPageUnanalyzed = () => {
        selectedItems.value = [...unanalyzedIds.value];
    };
    const clearSelection = () => {
        selectedItems.value = [];
    };
    const toggleItem = (id) => {
        selectedItems.value = isSelected(id)
            ? selectedItems.value.filter((itemId) => itemId !== id)
            : [...selectedItems.value, id];
    };
    const pruneSelection = () => {
        const validIds = new Set(currentPageIds.value);
        selectedItems.value = selectedItems.value.filter((id) => validIds.has(id));
    };
    return {
        selectedItems,
        selectedCount,
        isSelected,
        selectCurrentPage,
        selectCurrentPageUnanalyzed,
        clearSelection,
        toggleItem,
        pruneSelection,
    };
}

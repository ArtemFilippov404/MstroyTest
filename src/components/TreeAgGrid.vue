<template>
  <div>
    <div class="controls">
      <button @click="toggleMode">{{ isEditMode ? 'Просмотр' : 'Редактирование' }}</button>
      <button v-if="isEditMode" @click="undo" :disabled="!canUndo">Назад</button>
      <button v-if="isEditMode" @click="redo" :disabled="!canRedo">Вперед</button>
    </div>
    <ag-grid-vue
      class="ag-theme-alpine"
      :rowData="rowData"
      :columnDefs="columnDefs"
      :treeData="true"
      :groupDefaultExpanded="-1"
      :getDataPath="getDataPath"
      :editable="isEditMode"
      :autoGroupColumnDef="autoGroupColumnDef"
      @rowClicked="onRowClicked"
    />
  </div>
</template>

<script lang="ts">
import '../assets/main.css';
import { defineComponent, ref, computed } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import TreeStore from '../store/TreeStore';
import { ModuleRegistry, ClientSideRowModelModule } from 'ag-grid-community';
import { TreeDataModule } from 'ag-grid-enterprise';
import { RowGroupingModule } from 'ag-grid-enterprise';

ModuleRegistry.registerModules([ClientSideRowModelModule]);
ModuleRegistry.registerModules([RowGroupingModule]);
ModuleRegistry.registerModules([TreeDataModule]);

interface Item {
  id: string | number;
  parent: string | number | null;
  label: string;
}

export default defineComponent({
  name: 'App',
  components: { AgGridVue },
  setup() {
    const isEditMode = ref(false);
    const initialItems: Item[] = [
      { id: 1, parent: null, label: 'Айтем 1' },
      { id: '2', parent: 1, label: 'Айтем 2' },
      { id: 3, parent: 1, label: 'Айтем 3' },
      { id: 4, parent: '2', label: 'Айтем 4' },
      { id: 5, parent: '2', label: 'Айтем 5' },
      { id: 6, parent: '2', label: 'Айтем 6' },
      { id: 7, parent: 4, label: 'Айтем 7' },
      { id: 8, parent: 4, label: 'Айтем 8' },
    ];

    const treeStore = ref(new TreeStore(initialItems.map((item) => ({
      ...item,
      id: typeof item.id === 'number' ? item.id : Number(item.id),
      parent: typeof item.parent === 'number' || item.parent === null ? item.parent : Number(item.parent),
    }))));

    const columnDefs = computed(() => {
      const baseColumns = [
        { headerName: '№ п/п', field: 'id', editable: false, pinned: 'left' },
        { headerName: 'Наименование', field: 'label', editable: true },
      ];
      if (isEditMode.value) {
        baseColumns.unshift({
          headerName: '',
          cellRenderer: editButtonRenderer,
          minWidth: 100,
          maxWidth: 100,
          sortable: false,
          filter: false,
        });
      }
      return baseColumns;

    });

    const autoGroupColumnDef = computed(() => {
      return {
          headerName: 'Категория',
          cellRenderer: 'agGroupCellRenderer',
          cellRendererParams: {
              innerRenderer: (params: any) => {
                  const hasChildren = treeStore.value.getChildren(params.data.id).length > 0;
                  return hasChildren ? 'Группа' : 'Элемент';
              },
          },
          minWidth: 100,
      };
    });

    const rowData = computed(() => treeStore.value.getAll());

    const getDataPath = (data:any) => {
      const parents = treeStore.value.getAllParents(data.id).map((item: any) => item.label);
      return [...parents, data.label];
    };

    const editButtonRenderer = (params: any) => {
      const container = document.createElement('div');
      const addButton = document.createElement('button');
      addButton.className = 'edit-button add-button';
      addButton.innerText = '+';
      addButton.addEventListener('click', () => addRow(params.data.id));
      container.appendChild(addButton);
      const removeButton = document.createElement('button');
      removeButton.className = 'edit-button remove-button';
      removeButton.innerText = 'x';
      removeButton.addEventListener('click', () => removeRow(params.data.id));
      container.appendChild(removeButton);
      return container;
    };

    const editButtonStyles = document.createElement('style');
    editButtonStyles.innerHTML = `
      .edit-button {
        border: none;
        border-radius: 50%;
        width: 25px;
        height: 25px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 2px;
        padding: 0;
      }
      .add-button {
        background-color: blue;
      }
      .remove-button {
        background-color: red;
      }
      .edit-button:hover {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(editButtonStyles);

    const toggleMode = () => {
      isEditMode.value = !isEditMode.value;
    };

    const undo = () => {
      treeStore.value.undo();
      setTimeout(() => {
        rowData.value = treeStore.value.getAll();
      }, 0);
    };

    const redo = () => {
      if (treeStore.value.future.length > 0) {
        treeStore.value.redo();
        setTimeout(() => {
          rowData.value = treeStore.value.getAll();
        }, 0);
      }
    };

    const canUndo = computed(() => treeStore.value.history.length > 0);
    const canRedo = computed(() => treeStore.value.future.length > 0);

    const onRowClicked = (event: any) => {
      if (!isEditMode.value) {
        event.node.setExpanded(!event.node.expanded);
      }
    };

    const addRow = (parentId: string | number) => {
      const label = prompt('Введите метку для нового элемента', 'Новый айтем') || 'Новый айтем';
      const newItem = {
        id: Date.now(),
        parent: parentId,
        label: label,
      };
      treeStore.value.addItem(newItem);
        rowData.value = treeStore.value.getAll();
    };

    const removeRow = (id: string | number) => {
      treeStore.value.removeItem(id);
      rowData.value = treeStore.value.getAll();
    };

    return {
      isEditMode,
      columnDefs,
      rowData,
      getDataPath,
      toggleMode,
      undo,
      redo,
      canUndo,
      canRedo,
      autoGroupColumnDef,
      editButtonRenderer,
      onRowClicked,
      addRow,
      removeRow,
    };
  },
});
</script>


interface TreeRow {
  id: number | string;
  parent: number | string | null;
  label: string;
  [key: string]: any;
}

export default class TreeStore {
  private items: TreeRow[];
  private history: {action: string, data: TreeRow | null, oldItem?: TreeRow}[] = [];
  private future: {action: string, data: TreeRow | null, oldItem?: TreeRow}[] = [];

  constructor(items: TreeRow[]) {
    this.items = items;
  }

  getAll(): TreeRow[] {
    return this.items;
  }
  getItem(id: number | string): TreeRow | undefined {
    return this.items.find(item => item.id === id);
  }
  getChildren(id: number | string): TreeRow[] {
    return this.items.filter(item => item.parent === id);
  }
  getAllChildren(id: number | string): TreeRow[] {
    const childrens: TreeRow[] = [];
    const queue: TreeRow[] = this.getChildren(id);

    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        childrens.push(item);
        queue.push(...this.getChildren(item.id));
      }
    }
    return childrens;
  }
  getAllParents(id: number | string): TreeRow[] {
    const parents: TreeRow[] = [];
    let item = this.getItem(id);

    while (item && item.parent !== null) {
      const parent = this.getItem(item.parent);
      if (parent) {
        parents.push(parent);
        item = parent;
      } else {
        break;
      }
    }
    return parents.reverse();
  }
  addItem(item: TreeRow) {
    this.items.push(item);
    this.history.push({action: 'add', data: item});
    this.future = [];
  }
  removeItem(id: number | string) {
    const toRemove = [id, ...this.getAllChildren(id).map(item => item.id)];
    const removed = this.items.filter(item => toRemove.includes(item.id));

    this.items = this.items.filter(item => !toRemove.includes(item.id));
    this.history.push({action: 'remove', data: null, oldItem: {id, removed, parent: null, label: ''}});
    this.future = [];
  }
  updateItem(updatedItem: TreeRow) {
    const index = this.items.findIndex(item => item.id === updatedItem.id);

    if (index !== -1) {
      const oldItem = {...this.items[index]};
      this.items[index] = {...this.items[index], ...updatedItem};
      this.history.push({action: 'update', data: updatedItem, oldItem});
      this.future = [];
    }
  }
  undo(): void {
    const lastAction = this.history.pop();
    if(!lastAction) return;

    const {action, data, oldItem} = lastAction;
    switch (action) {
      case 'add':
        this.items = this.items.filter(item => item.id !== data?.id);
        break;
      case 'remove':
        if (oldItem?.removed) this.items.push(...oldItem.removed);
        break;
      case 'update':
        if (oldItem) {
          const index = this.items.findIndex(item => item.id === oldItem.id);
          if (index !== -1) this.items[index] = oldItem;
        }
        break;
    }
    this.future.push(lastAction);
  }
  redo(): void {
    const nextAction = this.future.pop();
    if (nextAction) {
      const { action, data } = nextAction;
      switch (action) {
        case "add":
          if (data) this.items.push(data);
          break;
        case "remove":
          if (data) this.removeItem(data.id);
          break;
        case "update":
          if (data) this.updateItem(data);
          break;
      }
      this.history.push(nextAction);
    }
  }
}

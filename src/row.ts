import {
  CELL_WIDTH,
  CellComponent,
  HeaderCell,
  FilterCell,
  StringCell,
} from "./cell";
import { Grid } from "./grid";

export type Cell = {
  id: number;
  v: string | number;
  // val: number;
};

export interface Row {
  id: number;
  cells: Cell[];
}

type CellRenderer = typeof StringCell | typeof HeaderCell | typeof FilterCell;

export class RowComponent {
  id: number;
  el: HTMLDivElement;
  cells: Cell[];
  _offset: number;
  CellRenderer: CellRenderer;
  cellComponentMap: Record<string, CellComponent>;
  grid: Grid;
  absoluteIndex: number;

  constructor(
    grid: Grid,
    id: number,
    cells: Cell[],
    offset: number,
    CellRenderer: CellRenderer,
    absoluteIndex: number
  ) {
    this.grid = grid;
    this.id = id;
    this.cells = cells;
    this._offset = offset;
    this.CellRenderer = CellRenderer;
    this.cellComponentMap = {};
    this.absoluteIndex = absoluteIndex;

    this.el = document.createElement("div");
    this.el.className = "absolute top-0 h-[32px]";

    // 👇 Añadir !important para sobrescribir cualquier estilo conflictivo
    if (CellRenderer === StringCell) {
      this.el.style.cssText = `
        position: absolute;
        top: 0;
        height: 32px;
        width: 100%;
      `;
      this.updateBackground(); // Actualizar color aquí
    } else {
      this.el.style.backgroundColor = "#f0f0f0";
    }

    // Hack temporal para headers
    if (CellRenderer !== StringCell) {
      this.el.style.zIndex = "1";
    }

    this.setOffset(this._offset, true);
    this.renderCells();
  }
  destroy() {
    // TODO(gab): can speed be improved?
    // https://github.com/brianmhunt/knockout-fast-foreach/issues/37
    // TODO(gab): should not need this, but crashes on my other computer otherwise. check
    if (this.grid.container.contains(this.el)) {
      this.grid.container.removeChild(this.el);
    } else {
      console.error("row component already removed");
    }
  }
  setOffset(offset: number, force: boolean = false) {
    if (force || offset != this._offset) {
      this.el.style.transform = `translateY(${offset}px)`;
    }
    this._offset = offset;
  }
  renderCells() {
    const state = this.grid.getState();

    const renderCells: Record<string, true> = {};
    for (let i = state.startCell; i < state.endCell; i++) {
      const cell = this.cells[i];
      renderCells[cell.id] = true;
    }

    const removeCells: CellComponent[] = [];
    for (const id in this.cellComponentMap) {
      if (id in renderCells) {
        continue;
      }
      const cell = this.cellComponentMap[id]!;
      removeCells.push(cell);
    }

    for (let i = state.startCell; i < state.endCell; i++) {
      const cell = this.cells[i]!;
      const offset = state.cellOffset + (i - state.startCell) * CELL_WIDTH;

      const existingCell = this.cellComponentMap[cell.id];
      if (existingCell != null) {
        existingCell.setOffset(offset);
        continue;
      }

      const reuseCell = removeCells.pop();
      if (reuseCell != null) {
        delete this.cellComponentMap[reuseCell.id];
        reuseCell.reuse(cell.id, offset, cell.v, i);
        this.cellComponentMap[reuseCell.id] = reuseCell;
        continue;
      }

      const newCell = new this.CellRenderer(
        cell.id,
        offset,
        cell.v,
        this.grid,
        i
      );
      this.el.appendChild(newCell.el);
      this.cellComponentMap[newCell.id] = newCell;
    }

    for (const cell of removeCells) {
      delete this.cellComponentMap[cell.id];
      this.el.removeChild(cell.el);
    }
  }
  updateBackground() {
    if (this.CellRenderer === StringCell) {
      const color = Number(this.absoluteIndex) % 2 === 1 ? "white" : "rgb(219, 219, 219)";
      this.el.style.setProperty('background-color', color, 'important');
    } else {
      this.el.style.backgroundColor = "#f0f0f0";
    }
  }
}

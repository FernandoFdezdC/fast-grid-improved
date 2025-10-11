import {
  // CELL_WIDTH,
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
  resizeHandles: HTMLDivElement[] = [];

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
    this.cellComponentMap = {};
    this.absoluteIndex = absoluteIndex;

    this.el = document.createElement("div");
    this.el.className = "absolute top-0 h-[32px]";

    // eh temporary header hack, make this passable
    if (CellRenderer !== StringCell) {
      this.el.style.zIndex = "1";
    }

    this.CellRenderer = CellRenderer;

    // 👇 Add !important to overwrite any conflicting style
    if (CellRenderer === StringCell) {
      this.el.style.cssText = `
        position: absolute;
        top: 0;
        height: 32px;
        width: 100%;
      `;
      this.updateBackground(); // Actualizar color
    } else {
      this.el.style.backgroundColor = "#f0f0f0";
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
    // remove old resize handles (we recreate them each render)
    for (const h of this.resizeHandles) {
      if (this.el.contains(h)) this.el.removeChild(h);
    }
    this.resizeHandles = [];
    
    const state = this.grid.getState();

    let currentOffset = state.cellOffset; // Use calculated offset based on actual widths
    let accumulatedWidth = 0;

    const renderCells: Record<string, true> = {};
    for (let i = state.startCell; i < state.endCell; i++) {
        const cell = this.cells[i];
        renderCells[cell.id] = true;
        accumulatedWidth += this.grid.columnWidths[i]; // Accumulate real width
    }

    const removeCells: CellComponent[] = [];
    for (const id in this.cellComponentMap) {
      if (id in renderCells) {
        continue;
      }
      const cell = this.cellComponentMap[id]!;
      removeCells.push(cell);
    }

    // Reset accumulator for accurate calculation
    currentOffset = state.cellOffset;
    
    for (let i = state.startCell; i < state.endCell; i++) {
      const cell = this.cells[i]!;
      const columnWidth = this.grid.columnWidths[i]; // Actual column width

      const existingCell = this.cellComponentMap[cell.id];
      if (existingCell != null) {
          existingCell.setOffset(currentOffset);
          existingCell.el.style.width = `${columnWidth}px`; // Update width
          currentOffset += columnWidth; // Move offset

          // --- create a resize handle at the right edge of this column ---
          const HANDLE_WIDTH = 12;
          const HANDLE_HALF = HANDLE_WIDTH / 2;

          // Only create a handle if there is a next column in the model (so there is a boundary)
          if (i < this.grid.columnWidths.length - 1) {
            const boundaryX = currentOffset; // right edge (relative to this.el)
            const handle = document.createElement("div");
            Object.assign(handle.style, {
              position: "absolute",
              top: "0px",
              left: `${boundaryX - HANDLE_HALF}px`,
              width: `${HANDLE_WIDTH}px`,
              height: "100%",
              cursor: "col-resize",
              zIndex: "100",               // above cells
              backgroundColor: "transparent",
            });

            // capture the column index for this handle
            const colIndex = i;

            handle.addEventListener("mousedown", (ev: MouseEvent) => {
              ev.preventDefault();
              const startX = ev.clientX;
              const startWidth = this.grid.columnWidths[colIndex];

              const onMouseMove = (moveEv: MouseEvent) => {
                const dx = moveEv.clientX - startX;
                const newWidth = Math.max(30, Math.round(startWidth + dx));
                this.grid.columnWidths[colIndex] = newWidth;

                // 1) Re-render cells
                this.grid.renderViewportCells();

                // 2) Recompute grid state to update scrollableWidth
                this.grid.getState();

                // 3) Refresh horizontal scrollbar
                this.grid.scrollbar.refreshThumb();
              };

              const onMouseUp = () => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
                document.body.style.cursor = "";
              };

              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
              document.body.style.cursor = "col-resize";
            });

            this.el.appendChild(handle);
            this.resizeHandles.push(handle);
          }

          continue;
      }

      const reuseCell = removeCells.pop();
      if (reuseCell != null) {
        delete this.cellComponentMap[reuseCell.id];
        reuseCell.reuse(cell.id, currentOffset, cell.v, i); // Pass index
        reuseCell.el.style.width = `${columnWidth}px`; // Force update
        this.cellComponentMap[reuseCell.id] = reuseCell;
        currentOffset += columnWidth;
        continue;
      }

      const newCell = new this.CellRenderer(
          cell.id,
          currentOffset,
          cell.v,
          this.grid,
          i // Pasar índice de columna
      );
      newCell.el.style.width = `${columnWidth}px`; // Set real column width
      this.el.appendChild(newCell.el);
      this.cellComponentMap[newCell.id] = newCell;
      currentOffset += columnWidth;
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

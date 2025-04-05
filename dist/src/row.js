import { StringCell, } from "./cell";
export class RowComponent {
    constructor(grid, id, cells, offset, CellRenderer, absoluteIndex) {
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "el", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cells", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_offset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CellRenderer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cellComponentMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "grid", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "absoluteIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.grid = grid;
        this.id = id;
        this.cells = cells;
        this._offset = offset;
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
        }
        else {
            this.el.style.backgroundColor = "#f0f0f0";
        }
        // eh temporary header hack, make this passable
        if (CellRenderer !== StringCell) {
            this.el.style.zIndex = "1";
        }
        this.CellRenderer = CellRenderer;
        this.setOffset(this._offset, true);
        this.renderCells();
    }
    destroy() {
        // TODO(gab): can speed be improved?
        // https://github.com/brianmhunt/knockout-fast-foreach/issues/37
        // TODO(gab): should not need this, but crashes on my other computer otherwise. check
        if (this.grid.container.contains(this.el)) {
            this.grid.container.removeChild(this.el);
        }
        else {
            console.error("row component already removed");
        }
    }
    setOffset(offset, force = false) {
        if (force || offset != this._offset) {
            this.el.style.transform = `translateY(${offset}px)`;
        }
        this._offset = offset;
    }
    renderCells() {
        const state = this.grid.getState();
        let currentOffset = state.cellOffset; // Usar el offset calculado basado en anchos reales
        let accumulatedWidth = 0;
        const renderCells = {};
        for (let i = state.startCell; i < state.endCell; i++) {
            const cell = this.cells[i];
            renderCells[cell.id] = true;
            accumulatedWidth += this.grid.columnWidths[i]; // Acumular ancho real
        }
        const removeCells = [];
        for (const id in this.cellComponentMap) {
            if (id in renderCells) {
                continue;
            }
            const cell = this.cellComponentMap[id];
            removeCells.push(cell);
        }
        // Resetear el acumulador para el cálculo preciso
        currentOffset = state.cellOffset;
        for (let i = state.startCell; i < state.endCell; i++) {
            const cell = this.cells[i];
            const columnWidth = this.grid.columnWidths[i]; // Ancho real de la columna
            const existingCell = this.cellComponentMap[cell.id];
            if (existingCell != null) {
                existingCell.setOffset(currentOffset);
                existingCell.el.style.width = `${columnWidth}px`; // Actualizar ancho
                currentOffset += columnWidth; // Mover offset
                continue;
            }
            const reuseCell = removeCells.pop();
            if (reuseCell != null) {
                delete this.cellComponentMap[reuseCell.id];
                reuseCell.reuse(cell.id, currentOffset, cell.v, i); // Pasar índice
                reuseCell.el.style.width = `${columnWidth}px`; // Forzar actualización
                this.cellComponentMap[reuseCell.id] = reuseCell;
                currentOffset += columnWidth;
                continue;
            }
            const newCell = new this.CellRenderer(cell.id, currentOffset, cell.v, this.grid, i // Pasar índice de columna
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
        }
        else {
            this.el.style.backgroundColor = "#f0f0f0";
        }
    }
}

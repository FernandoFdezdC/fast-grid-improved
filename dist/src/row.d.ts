import { CellComponent, HeaderCell, FilterCell, StringCell } from "./cell";
import { Grid } from "./grid";
export type Cell = {
    id: number;
    v: string | number;
};
export interface Row {
    id: number;
    cells: Cell[];
}
type CellRenderer = typeof StringCell | typeof HeaderCell | typeof FilterCell;
export declare class RowComponent {
    id: number;
    el: HTMLDivElement;
    cells: Cell[];
    _offset: number;
    CellRenderer: CellRenderer;
    cellComponentMap: Record<string, CellComponent>;
    grid: Grid;
    absoluteIndex: number;
    constructor(grid: Grid, id: number, cells: Cell[], offset: number, CellRenderer: CellRenderer, absoluteIndex: number);
    destroy(): void;
    setOffset(offset: number, force?: boolean): void;
    renderCells(): void;
    updateBackground(): void;
}
export {};

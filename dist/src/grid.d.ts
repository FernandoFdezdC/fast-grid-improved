import { RowComponent } from "./row";
import { RowManager, Rows } from "./row-manager/row-manager";
import { Scrollbar } from "./scrollbar";
interface GridState {
    endRow: number;
    startRow: number;
    rowOffset: number;
    startCell: number;
    endCell: number;
    cellOffset: number;
    scrollableHeight: number;
    tableHeight: number;
    thumbOffsetY: number;
    thumbSizeY: number;
    scrollableWidth: number;
    tableWidth: number;
    thumbOffsetX: number;
    thumbSizeX: number;
    rowsPerViewport: number;
    cellsPerRow: number;
}
export declare class Grid {
    state: GridState;
    headerRows: RowComponent[];
    offsetY: number;
    offsetX: number;
    windowHeight: number;
    windowWidth: number;
    container: HTMLDivElement;
    rowComponentMap: Record<number, RowComponent>;
    scrollbar: Scrollbar;
    rowManager: RowManager;
    viewportWidth: number;
    viewportHeight: number;
    numCols: number;
    columnWidths: number[];
    resizeObserver: ResizeObserver;
    constructor(container: HTMLDivElement, rows: Rows, headers: string[]);
    computeColumnWidths(): void;
    createHeader(headers: string[]): RowComponent[];
    getState: () => GridState;
    renderViewportRows: () => void;
    renderViewportCells: () => void;
    onResize: () => void;
    destroy: () => void;
}
export {};

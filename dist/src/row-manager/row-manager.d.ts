import { Grid } from "../grid";
import { Row } from "../row";
export type Rows = Row[];
type ColumnIndex = number;
export type View = {
    filter: Record<ColumnIndex, string>;
    sort: {
        direction: "ascending" | "descending";
        column: ColumnIndex;
    }[];
    version: number;
};
export type RowBuffer = {
    buffer: Int32Array;
    numRows: number;
};
export declare class RowManager {
    rows: Rows;
    grid: Grid;
    view: View;
    isViewResult: boolean;
    currentFilterId: number;
    viewBuffer: RowBuffer;
    constructor(grid: Grid, rows: Rows);
    getViewBuffer: () => RowBuffer | null;
    getNumRows: () => number;
    setRows: (rows: Rows, skipSendToWorker?: boolean) => void;
    isViewEmpty: () => boolean;
    runFilter: () => Promise<void>;
    runSort: () => Promise<void>;
    destroy: () => void;
}
export type ComputeViewDoneEvent = {
    type: "compute-view-done";
    numRows: number;
    skipRefreshThumb?: boolean;
};
export declare const FILTER_COL = 1;
export declare const SORT_COL = 1;
export {};

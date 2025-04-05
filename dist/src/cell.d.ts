import { Grid } from "./grid";
export declare const CELL_WIDTH = 50;
export type CellComponent = {
    id: number;
    el: HTMLDivElement;
    _offset: number;
    setContent: (text: string | number) => void;
    setOffset: (offset: number, force?: boolean) => void;
    reuse: (id: number, offset: number, text: string | number, index: number) => void;
};
export declare class StringCell implements CellComponent {
    id: number;
    el: HTMLDivElement;
    _offset: number;
    constructor(id: number, offset: number, text: string | number);
    setContent(text: string | number): void;
    setOffset(offset: number, force?: boolean): void;
    reuse(id: number, offset: number, text: string | number): void;
}
export declare class HeaderCell implements CellComponent {
    grid: Grid;
    id: number;
    el: HTMLDivElement;
    arrow: SVGSVGElement;
    index: number;
    textDisplay: HTMLDivElement;
    _offset: number;
    constructor(id: number, offset: number, text: string | number, grid: Grid, index: number);
    private onHeaderClick;
    setContent(text: string | number): void;
    setOffset(offset: number, force?: boolean): void;
    reuse: (id: number, offset: number, text: string | number, index: number) => void;
    syncToFilter: () => void;
}
export declare class FilterCell implements CellComponent {
    grid: Grid;
    index: number;
    id: number;
    el: HTMLDivElement;
    input: HTMLInputElement;
    _offset: number;
    constructor(id: number, offset: number, text: string | number, grid: Grid, index: number);
    private onInputChange;
    syncToFilter: () => void;
    setContent: () => void;
    setOffset: (offset: number, force?: boolean) => void;
    reuse: (id: number, offset: number, _text: string | number, index: number) => void;
}

import { Row } from "../row";
interface FilterRows {
    rows: Row[];
    query: string;
    rowsPerViewport: number;
    onEarlyResults: (rows: Row[]) => void;
    shouldCancel: () => boolean;
}
export declare const filterRows: ({ rows, query, rowsPerViewport, onEarlyResults, shouldCancel, }: FilterRows) => Promise<Row[] | "canceled">;
export {};

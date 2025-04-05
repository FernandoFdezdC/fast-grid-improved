import { Rows, View } from "./row-manager";
export type ComputeViewEvent = {
    type: "compute-view";
    viewBuffer: Int32Array;
    viewConfig: View;
};
export type SetRowsEvent = {
    type: "set-rows";
    rows: Rows;
};
export type Message = MessageEvent<ComputeViewEvent | SetRowsEvent>;

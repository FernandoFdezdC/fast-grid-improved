import { isEmptyFast } from "../utils/is-empty-fast";
import ViewWorker from "./view-worker?worker&inline";
const viewWorker = new ViewWorker();
export class RowManager {
    constructor(grid, rows) {
        Object.defineProperty(this, "rows", {
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
        Object.defineProperty(this, "view", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isViewResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "currentFilterId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "viewBuffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "getViewBuffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                if (this.isViewResult) {
                    return this.viewBuffer;
                }
                return null;
            }
        });
        Object.defineProperty(this, "getNumRows", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                const viewBuffer = this.getViewBuffer();
                if (viewBuffer == null) {
                    return this.rows.length;
                }
                return viewBuffer.numRows;
            }
        });
        Object.defineProperty(this, "setRows", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (rows, skipSendToWorker = false) => {
                this.rows = rows;
                this.grid.scrollbar.setScrollOffsetY(this.grid.offsetY);
                this.grid.scrollbar.setScrollOffsetX(this.grid.offsetX);
                this.grid.renderViewportRows();
                this.grid.scrollbar.refreshThumb();
                if (!skipSendToWorker) {
                    // TODO: this is blocking wtf, gotta split this up
                    const t0 = performance.now();
                    viewWorker.postMessage({
                        type: "set-rows",
                        rows: this.rows,
                    });
                    console.log("Ms to send rows to worker", performance.now() - t0);
                }
            }
        });
        Object.defineProperty(this, "isViewEmpty", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                return isEmptyFast(this.view.filter) && isEmptyFast(this.view.sort);
            }
        });
        Object.defineProperty(this, "runFilter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async () => {
                console.count("---------- start filter");
                this.view.version = Date.now();
                if (this.isViewEmpty()) {
                    this.isViewResult = false;
                    this.grid.renderViewportRows();
                    this.grid.renderViewportCells();
                    this.grid.scrollbar.refreshThumb();
                }
                else {
                    viewWorker.postMessage({
                        type: "compute-view",
                        viewConfig: this.view,
                        viewBuffer: this.viewBuffer.buffer,
                    });
                }
            }
        });
        Object.defineProperty(this, "runSort", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async () => {
                console.count("---------- start sort");
                this.view.version = Date.now();
                if (this.isViewEmpty()) {
                    this.isViewResult = false;
                    this.grid.renderViewportRows();
                    this.grid.renderViewportCells();
                    this.grid.scrollbar.refreshThumb();
                }
                else {
                    viewWorker.postMessage({
                        type: "compute-view",
                        viewConfig: this.view,
                        viewBuffer: this.viewBuffer.buffer,
                    });
                }
            }
        });
        Object.defineProperty(this, "destroy", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                // no memory leaks.. make sure gc kicks in asap
                // @ts-expect-error
                this.viewBuffer = null;
                // @ts-expect-error
                this.noViewBuffer = null;
                viewWorker.terminate();
            }
        });
        this.grid = grid;
        this.rows = rows;
        this.currentFilterId = 0;
        this.view = {
            filter: {},
            sort: [],
            version: Date.now(),
        };
        viewWorker.postMessage({ type: "set-rows", rows });
        const sharedBuffer = new SharedArrayBuffer(1000000 * Int32Array.BYTES_PER_ELEMENT);
        this.viewBuffer = { buffer: new Int32Array(sharedBuffer), numRows: -1 };
        viewWorker.onmessage = (event) => {
            switch (event.data.type) {
                case "compute-view-done": {
                    const updateThumb = event.data.skipRefreshThumb !== true;
                    this.viewBuffer.numRows = event.data.numRows;
                    this.isViewResult = true;
                    this.grid.renderViewportRows();
                    if (updateThumb) {
                        this.grid.scrollbar.clampThumbIfNeeded();
                    }
                    this.grid.renderViewportRows();
                    this.grid.renderViewportCells();
                    if (updateThumb) {
                        this.grid.scrollbar.refreshThumb();
                    }
                    // NOTE(gab): refresh size of thumb after completely done filtering, to prevent jumping of size
                    break;
                }
            }
        };
    }
}
// temporary while i dont have multi column views. these are  columnindexes to be computed for sort/filter
export const FILTER_COL = 1;
export const SORT_COL = 1;

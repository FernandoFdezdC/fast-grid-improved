import { Grid } from "../grid";
import { Row } from "../row";
import { isEmptyFast } from "../utils/is-empty-fast";
import type { ComputeViewEvent, SetRowsEvent } from "./view-worker";

// Función universal para crear el worker
// row-manager.ts
const getViewWorker = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    return new Worker(new URL("./view-worker", import.meta.url), {
      type: "module"
    });
  } catch (e) {
    console.error("Worker creation failed", e);
    return null;
  }
};

export type Rows = Row[];

export type View = {
  filter: Record<number, string>;
  sort: { direction: "ascending" | "descending"; column: number }[];
  version: number;
};

export type RowBuffer = {
  buffer: Int32Array;
  numRows: number;
};

export type ComputeViewDoneEvent = {
  type: "compute-view-done";
  numRows: number;
  skipRefreshThumb?: boolean;
};

export class RowManager {
  rows: Rows;
  grid: Grid;
  view: View;

  private viewWorker: Worker | null = null;

  isViewResult: boolean = false;
  currentFilterId: number;
  viewBuffer: RowBuffer;
  private workerAvailable: boolean;
  
  constructor(grid: Grid, rows: Rows) {
    this.grid = grid;
    this.rows = rows;

    // Initialize worker only in browser
    if (typeof window !== "undefined") {
      this.viewWorker = getViewWorker();
    }
    this.workerAvailable = this.viewWorker !== null;

    console.log("RowManager initialized");
    console.log("Worker available:", this.workerAvailable);
    console.log("Rows count:", rows.length);
    
    this.currentFilterId = 0;
    this.view = {
      filter: {},
      sort: [],
      version: Date.now(),
    };

    // Solo enviar mensajes si el worker está disponible
    if (this.workerAvailable) {
      this.viewWorker!.postMessage({ 
        type: "set-rows", 
        rows 
      } satisfies SetRowsEvent);
    }

    const sharedBuffer = new SharedArrayBuffer(
      1_000_000 * Int32Array.BYTES_PER_ELEMENT
    );
    this.viewBuffer = { 
      buffer: new Int32Array(sharedBuffer), 
      numRows: -1 
    };

    if (this.workerAvailable) {
      this.viewWorker!.onmessage = (event: MessageEvent<ComputeViewDoneEvent>) => {
        this.handleWorkerMessage(event.data);
      };
    }
  }

  private handleWorkerMessage = (data: ComputeViewDoneEvent) => {
    if (data.type === "compute-view-done") {
      const updateThumb = data.skipRefreshThumb !== true;
      this.viewBuffer.numRows = data.numRows;
      this.isViewResult = true;

      console.log(
        '🏷️ handleWorkerMessage: numRows=', 
        data.numRows, 
        'this.rows.length=', 
        this.rows.length,
        'buffer[0..5]=', 
        Array.from(this.viewBuffer.buffer.slice(0, Math.min(5, data.numRows)))
      );
      
      this.grid.renderViewportRows();
      
      if (updateThumb) {
        this.grid.scrollbar.clampThumbIfNeeded();
      }

      this.grid.renderViewportCells();
      
      if (updateThumb) {
        this.grid.scrollbar.refreshThumb();
      }
    }
  }

  getViewBuffer = (): RowBuffer | null => {
    return this.isViewResult ? this.viewBuffer : null;
  };

  getNumRows = () => {
    const viewBuffer = this.getViewBuffer();
    return viewBuffer?.numRows ?? this.rows.length;
  };

  setRows = (rows: Rows, skipSendToWorker: boolean = false) => {
    this.rows = rows;
    this.isViewResult = false;

    this.grid.scrollbar.setScrollOffsetY(this.grid.offsetY);
    this.grid.scrollbar.setScrollOffsetX(this.grid.offsetX);
    this.grid.renderViewportRows();
    this.grid.scrollbar.refreshThumb();

    if (!skipSendToWorker && this.workerAvailable && this.viewWorker) {
      const t0 = performance.now();
      this.viewWorker.postMessage({
        type: "set-rows",
        rows: this.rows,
      } satisfies SetRowsEvent);
      console.log("Ms to send rows to worker", performance.now() - t0);
    }

    console.log('► main → set-rows', rows.length, 'filas');
  };

  /**
   * Agrega filas de forma incremental sin reemplazar todo el dataset
   * @param newRows Nuevas filas a agregar
   * @param skipSendToWorker Si se debe omitir enviar al worker
   */
  addRows = (newRows: Rows, skipSendToWorker: boolean = false) => {
    // Actualizar el conjunto completo de filas
    this.rows = [...this.rows, ...newRows];
    
    // Mantener el estado actual de la vista (filtros/orden)
    this.isViewResult = false;

    // Actualizar la visualización del grid
    this.grid.scrollbar.setScrollOffsetY(this.grid.offsetY);
    this.grid.scrollbar.setScrollOffsetX(this.grid.offsetX);
    this.grid.renderViewportRows();
    this.grid.scrollbar.refreshThumb();

    // Comunicar al worker si está disponible
    if (!skipSendToWorker && this.workerAvailable && this.viewWorker) {
      const t0 = performance.now();
      
      // Enviar solo las nuevas filas al worker
      this.viewWorker.postMessage({
        type: "add-rows",
        rows: newRows,
      } satisfies AddRowsEvent);
      
      console.log("Ms to add rows to worker", performance.now() - t0);
    }

    console.log('► main → add-rows', newRows.length, 'filas. Total:', this.rows.length);
  };

  runFilter = () => {
    this.updateView('filter');
  };

  runSort = () => {
    this.updateView('sort');
  };

  private updateView = (operation: 'filter' | 'sort') => {
    console.count(`---------- start ${operation}`);
    this.view.version = Date.now();

    if (this.isViewEmpty()) {
      this.isViewResult = false;
      this.updateGridDisplay();
    } else if (this.workerAvailable) {
      console.log(
        `%c► main → compute-view (v=${this.view.version})`, 
        'color: purple',
        this.view
      );
      this.viewWorker!.postMessage({
        type: "compute-view",
        viewConfig: this.view,
        viewBuffer: this.viewBuffer.buffer,
      } satisfies ComputeViewEvent);
    }
  };

  private updateGridDisplay = () => {
    this.grid.renderViewportRows();
    this.grid.renderViewportCells();
    this.grid.scrollbar.refreshThumb();
  };

  destroy = () => {
    if (this.workerAvailable) {
      this.viewWorker!.terminate();
    }
    
    // Liberar memoria
    this.viewBuffer.buffer = new Int32Array(0);
  };

  isViewEmpty = () => {
    return isEmptyFast(this.view.filter) && isEmptyFast(this.view.sort);
  };
}

// New event type for adding rows
export type AddRowsEvent = {
  type: "add-rows";
  rows: Rows;
};
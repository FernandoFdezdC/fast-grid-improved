import { Grid } from "./grid";

export const CELL_WIDTH = 50;

export type CellComponent = {
  id: number;
  el: HTMLDivElement;
  _offset: number;

  setContent: (text: string | number) => void;
  setOffset: (offset: number, force?: boolean) => void;
  reuse: (
    id: number,
    offset: number,
    text: string | number,
    index: number
  ) => void;
};

export class StringCell implements CellComponent {
  id: number;
  el: HTMLDivElement;
  _offset: number;

  constructor(id: number, offset: number, text: string | number) {
    this.id = id;
    this._offset = offset;

    this.el = document.createElement("div");
    // NOTE(gab): fonts are super expensive, might be more simple fonts that are faster to render? testing to render a cursive text with subpixel antialiasing, vs
    // rendering monospace text with text smoothing
    // https://codesandbox.io/s/performance-test-disabling-text-antialiasing-om6f3q?file=/index.js
    // NOTE(gab): align-items actually has a super slight imapact on Layerize time, using padding for now
    this.el.className = 
      "flex h-full pt-[7px] text-black box-border cursor-default pl-[6px] absolute left-0 font-mono text-[14px] truncate";
    this.el.style.width = `${CELL_WIDTH}px`;
    this.el.style.backgroundColor = "transparent";
    this.el.style.position = "absolute";
    this.el.style.top      = "0px";
    this.el.style.left     = "0px";
    
    // Añadir estos estilos complementarios
    this.el.style.overflow = "hidden";
    this.el.style.textOverflow = "ellipsis";
    this.el.style.whiteSpace = "nowrap";
    

    this.setOffset(this._offset, true);
    this.setContent(text);
  }

  setContent(text: string | number) {
    this.el.innerText = String(text);
  }
  setOffset(offset: number, force: boolean = false) {
    if (force || offset !== this._offset) {
      this.el.style.transform = `translateX(${offset}px)`;
    }
    this._offset = offset;
  }
  reuse(id: number, offset: number, text: string | number) {
    this.id = id;
    this.setOffset(offset, true);
    this.setContent(text);
  }
}

export class HeaderCell implements CellComponent {
  grid: Grid;
  id: number;
  el: HTMLDivElement;
  arrow: SVGSVGElement;
  index: number;
  textDisplay: HTMLDivElement;
  _offset: number;

  constructor(id: number,
      offset: number,
      text: string | number,
      grid: Grid,
      index: number
    ) {
    this.id = id;
    this._offset = offset;
    this.grid = grid;
    this.index = index;

    this.el = document.createElement("div");
    this.el.className =
      "flex h-full pt-[5px] border-[0] border-r border-b-2 border-solid border-gray-700 text-gray-800 box-border cursor-pointer pl-[6px] absolute left-0 overflow-clip";
    this.el.style.width = `${CELL_WIDTH}px`;
    this.el.style.backgroundColor = "white";
    this.el.style.position = "absolute";
    this.el.style.top      = "0px";
    this.el.style.left     = "0px";

    // text display
    this.textDisplay = document.createElement("div");
    this.textDisplay.textContent = String(text);
    this.textDisplay.className = "h-full text-[16px] select-none";
    this.textDisplay.style.fontFamily = "monospace";
    this.el.appendChild(this.textDisplay);

    this.setOffset(this._offset, true);
    // this.setContent(text);

    // --------------ARROW FUNCTIONALITY--------------
    const arrowContainer = document.createElement("div");
    arrowContainer.className =
      "flex items-center justify-center w-[35px] h-[28px] cursor-pointer";
    // ordering when clicking on the whole container
    this.el.addEventListener("click", this.onHeaderClick);

    this.arrow = document.createElement("span") as any;
    arrowContainer.className = "flex items-center justify-center w-[35px] h-full cursor-pointer";
    this.arrow.textContent = ""; // sin orden inicialmente

    const arrowHead = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    arrowHead.setAttribute("d", "M12 5.5L7.5 10h9z");
    arrowHead.setAttribute("fill", "currentColor");
    arrowHead.setAttribute("opacity", "0.3");
    this.arrow.appendChild(arrowHead);

    arrowContainer.appendChild(this.arrow);
    this.el.appendChild(arrowContainer);
    // --------------ARROW FUNCTIONALITY--------------

    this.syncToFilter();
    this.setOffset(this._offset, true);
  }
  private onHeaderClick = () => {
    const idx = this.grid.rowManager.view.sort.findIndex(
      (sort) => sort.column === this.index
    );
    const currentSort = idx !== -1 ? this.grid.rowManager.view.sort[idx] : null;
    if (currentSort == null) {
      this.grid.rowManager.view.sort.push({
        direction: "descending",
        column: this.index,
      });
      this.arrow.textContent = "⏷";
    } else if (currentSort.direction === "descending") {
      currentSort.direction = "ascending";
      this.arrow.textContent = "⏶";
    } else {
      this.grid.rowManager.view.sort.splice(idx, 1);
      this.arrow.textContent = "";
    }
    this.grid.rowManager.runSort();
  };
  setContent(text: string | number) {
    this.textDisplay.textContent = String(text); // Actualiza el texto
  }
  setOffset(offset: number, force: boolean = false) {
    if (force || offset !== this._offset) {
      this.el.style.transform = `translateX(${offset}px)`;
    }
    this._offset = offset;
  }
  reuse = (
    id: number,
    offset: number,
    text: string | number,
    index: number
  ) => {
    this.id = id;
    this.index = index;
    this.setOffset(offset, true);
    this.setContent(text);
    this.syncToFilter();
  }
  syncToFilter = () => {
    const sort = this.grid.rowManager.view.sort.find(
      (sort) => sort.column === this.index
    );
    if (sort == null) {
      this.arrow.textContent = "";
    } else if (sort.direction === "descending") {
      this.arrow.textContent = "⏷";
    } else if (sort.direction === "ascending") {
      this.arrow.textContent = "⏶";
    }
  };
}

export class FilterCell implements CellComponent {
  grid: Grid;
  index: number;
  id: number;
  el: HTMLDivElement;
  input: HTMLInputElement;
  // arrow: SVGSVGElement;
  _offset: number;

  constructor(
    id: number,
    offset: number,
    text: string | number,
    grid: Grid,
    index: number
  ) {
    this.grid = grid;
    this.index = index;
    this.id = id;
    this._offset = offset;

    this.el = document.createElement("div");
    this.el.className =
      "flex h-full pt-[5px] border-[0] border-r border-b border-solid border-gray-700 text-gray-800 box-border cursor-default pl-[6px] absolute left-0 overflow-clip";
    this.el.style.width = `${CELL_WIDTH}px`;
    this.el.style.position = "absolute";
    this.el.style.top      = "0px";
    this.el.style.left     = "0px";

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.value = String(text);
    this.input.className =
      "w-full h-full border-none outline-none text-[13px] select-none";
    this.input.style.fontFamily = "monospace";
    this.input.placeholder = "Filtrar...";
    this.input.addEventListener("input", this.onInputChange);
    this.el.appendChild(this.input);

    // --------------ARROW FUNCTIONALITY--------------
    // const arrowContainer = document.createElement("div");
    // arrowContainer.className =
    //   "flex items-center justify-center w-[35px] h-[28px] cursor-pointer";
    // // ordering when clicking on the whole container
    // arrowContainer.addEventListener("click", this.onArrowClick);

    // this.arrow = document.createElement("span") as any;
    // arrowContainer.className = "flex items-center justify-center w-[35px] h-full cursor-pointer";
    // this.arrow.textContent = ""; // sin orden inicialmente

    // const arrowHead = document.createElementNS(
    //   "http://www.w3.org/2000/svg",
    //   "path"
    // );
    // arrowHead.setAttribute("d", "M12 5.5L7.5 10h9z");
    // arrowHead.setAttribute("fill", "currentColor");
    // arrowHead.setAttribute("opacity", "0.3");
    // this.arrow.appendChild(arrowHead);

    // arrowContainer.appendChild(this.arrow);
    // this.el.appendChild(arrowContainer);
    // --------------ARROW FUNCTIONALITY--------------

    this.syncToFilter();
    this.setOffset(this._offset, true);
  }
  private onInputChange = () => {
    if (this.input.value === "") {
      delete this.grid.rowManager.view.filter[this.index];
    } else {
      this.grid.rowManager.view.filter[this.index] = this.input.value;
    }
    this.grid.rowManager.runFilter();
  };
  // private onArrowClick = () => {
  //   const idx = this.grid.rowManager.view.sort.findIndex(
  //     (sort) => sort.column === this.index
  //   );
  //   const currentSort = idx !== -1 ? this.grid.rowManager.view.sort[idx] : null;
  //   if (currentSort == null) {
  //     this.grid.rowManager.view.sort.push({
  //       direction: "descending",
  //       column: this.index,
  //     });
  //     this.arrow.textContent = "⏷";
  //   } else if (currentSort.direction === "descending") {
  //     currentSort.direction = "ascending";
  //     this.arrow.textContent = "⏶";
  //   } else {
  //     this.grid.rowManager.view.sort.splice(idx, 1);
  //     this.arrow.textContent = "";
  //   }
  //   this.grid.rowManager.runSort();
  // };
  syncToFilter = () => {
    if (this.index in this.grid.rowManager.view.filter) {
      this.input.value = this.grid.rowManager.view.filter[this.index];
    } else {
      this.input.value = "";
    }
    // const sort = this.grid.rowManager.view.sort.find(
    //   (sort) => sort.column === this.index
    // );
    // if (sort == null) {
    //   this.arrow.textContent = "";
    // } else if (sort.direction === "descending") {
    //   this.arrow.textContent = "⏷";
    // } else if (sort.direction === "ascending") {
    //   this.arrow.textContent = "⏶";
    // }
  };
  setContent = () => {
    this.syncToFilter();
  };
  setOffset = (offset: number, force: boolean = false) => {
    if (force || offset !== this._offset) {
      this.el.style.transform = `translateX(${offset}px)`;
    }
    this._offset = offset;
  };
  reuse = (
    id: number,
    offset: number,
    _text: string | number,
    index: number
  ) => {
    this.id = id;
    this.index = index;
    this.setOffset(offset, true);
    this.syncToFilter();
  };
}
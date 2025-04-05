export class Scrollbar {
    constructor(grid) {
        Object.defineProperty(this, "trackY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "thumbY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "trackX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "thumbX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isScrolling", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "transientScrollOffsetY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "transientScrollOffsetX", {
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
        Object.defineProperty(this, "refreshThumb", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                const state = this.grid.getState();
                this.translateThumbY(state.thumbOffsetY);
                this.setThumbSizeY(state.thumbSizeY);
                this.translateThumbX(state.thumbOffsetX);
                this.setThumbSizeX(state.thumbSizeX);
            }
        });
        Object.defineProperty(this, "clampThumbIfNeeded", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                const state = this.grid.getState();
                let shouldTranslateThumb = false;
                if (this.grid.offsetY != null &&
                    (this.grid.offsetY < 0 || this.grid.offsetY > state.scrollableHeight)) {
                    const clampedOffsetY = Math.max(0, Math.min(this.grid.offsetY, state.scrollableHeight));
                    this.grid.offsetY = clampedOffsetY;
                    shouldTranslateThumb = true;
                }
                if (this.grid.offsetX != null &&
                    (this.grid.offsetX < 0 || this.grid.offsetX > state.scrollableWidth)) {
                    const clampedOffsetX = Math.max(0, Math.min(this.grid.offsetX, state.scrollableWidth));
                    this.grid.offsetX = clampedOffsetX;
                    shouldTranslateThumb = true;
                }
                if (shouldTranslateThumb) {
                    const state2 = this.grid.getState();
                    this.translateThumbX(state2.thumbOffsetX);
                    this.translateThumbY(state2.thumbOffsetY);
                }
            }
        });
        Object.defineProperty(this, "setScrollOffsetX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (x) => {
                const state = this.grid.getState();
                const clampedOffsetX = Math.max(0, Math.min(x, state.scrollableWidth));
                this.grid.offsetX = clampedOffsetX;
                const state2 = this.grid.getState();
                this.translateThumbX(state2.thumbOffsetX);
            }
        });
        Object.defineProperty(this, "setScrollOffsetY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (y) => {
                const state = this.grid.getState();
                const clampedOffsetY = Math.max(0, Math.min(y, state.scrollableHeight));
                this.grid.offsetY = clampedOffsetY;
                const state2 = this.grid.getState();
                this.translateThumbY(state2.thumbOffsetY);
            }
        });
        Object.defineProperty(this, "scrollBy", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (x, y) => {
                let renderRows = false;
                let renderCells = false;
                if (y != null && y !== 0) {
                    this.setScrollOffsetY(this.grid.offsetY + y);
                    renderRows = true;
                }
                if (x != null && x !== 0) {
                    this.setScrollOffsetX(this.grid.offsetX + x);
                    renderCells = true;
                }
                if (renderRows) {
                    this.grid.renderViewportRows();
                }
                if (renderCells) {
                    this.grid.renderViewportCells();
                }
            }
        });
        Object.defineProperty(this, "onContainerWheel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.preventDefault();
                e.stopPropagation();
                let deltaY = e.deltaY;
                let deltaX = e.deltaX;
                // NOTE(gab): it's hard to scroll exactly horizontally or vertically, so zero out
                // the other dimension for small deltas if scrolling fast
                if (Math.abs(deltaY) > 30 && Math.abs(deltaX) < 15) {
                    deltaX = 0;
                }
                else if (Math.abs(deltaX) > 30 && Math.abs(deltaY) < 15) {
                    deltaY = 0;
                }
                this.transientScrollOffsetX += deltaX;
                this.transientScrollOffsetY += deltaY;
                if (this.isScrolling) {
                    return;
                }
                this.isScrolling = true;
                // NOTE(gab): makes sure scroll events are only triggered at most
                // once every frame. useses transient scrolling to keep track of
                // intermediate scroll offsets
                window.requestAnimationFrame(() => {
                    const scrollX = this.transientScrollOffsetX != 0
                        ? this.transientScrollOffsetX
                        : undefined;
                    const scrollY = this.transientScrollOffsetY != 0
                        ? this.transientScrollOffsetY
                        : undefined;
                    this.scrollBy(scrollX, scrollY);
                    this.isScrolling = false;
                    this.transientScrollOffsetX = 0;
                    this.transientScrollOffsetY = 0;
                });
            }
        });
        Object.defineProperty(this, "onThumbMouseDownY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.body.style.setProperty("cursor", "grabbing", "important");
                document.addEventListener("mousemove", this.onThumbDragY);
                document.addEventListener("mouseup", this.onThumbMouseUpY);
            }
        });
        Object.defineProperty(this, "onThumbDragY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.preventDefault();
                e.stopPropagation();
                const state = this.grid.getState();
                this.transientScrollOffsetY +=
                    // TODO(gab): figure out the 1.5 lol. works perfectly somehow
                    (e.movementY / this.grid.viewportHeight) * state.tableHeight;
                if (this.isScrolling) {
                    return;
                }
                this.isScrolling = true;
                window.requestAnimationFrame(() => {
                    this.scrollBy(undefined, this.transientScrollOffsetY);
                    this.isScrolling = false;
                    this.transientScrollOffsetY = 0;
                });
            }
        });
        Object.defineProperty(this, "onThumbMouseUpY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                document.body.style.removeProperty("cursor");
                document.removeEventListener("mousemove", this.onThumbDragY);
                document.removeEventListener("mouseup", this.onThumbMouseUpY);
                this.isScrolling = false;
                if (this.transientScrollOffsetY > 0) {
                    this.scrollBy(undefined, this.transientScrollOffsetY);
                }
                this.transientScrollOffsetY = 0;
            }
        });
        Object.defineProperty(this, "onThumbMouseDownX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.body.style.setProperty("cursor", "grabbing", "important");
                document.addEventListener("mousemove", this.onThumbDragX);
                document.addEventListener("mouseup", this.onThumbMouseUpX);
            }
        });
        Object.defineProperty(this, "onThumbDragX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.stopPropagation();
                e.preventDefault();
                const state = this.grid.getState();
                this.transientScrollOffsetX +=
                    // TODO(gab): figure out the 1.5 lol. works perfectly somehow
                    (e.movementX / this.grid.viewportWidth) * state.tableWidth;
                if (this.isScrolling) {
                    return;
                }
                this.isScrolling = true;
                window.requestAnimationFrame(() => {
                    this.scrollBy(this.transientScrollOffsetX, undefined);
                    this.isScrolling = false;
                    this.transientScrollOffsetX = 0;
                });
            }
        });
        Object.defineProperty(this, "onThumbMouseUpX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                document.body.style.removeProperty("cursor");
                document.removeEventListener("mousemove", this.onThumbDragX);
                document.removeEventListener("mouseup", this.onThumbMouseUpX);
                this.isScrolling = false;
                // NOTE(gab): makes sure the last cancelled scroll events are applied, if any
                if (this.transientScrollOffsetX > 0) {
                    this.scrollBy(this.transientScrollOffsetX, undefined);
                }
                this.transientScrollOffsetX = 0;
            }
        });
        Object.defineProperty(this, "onTrackMouseMoveY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.preventDefault();
            }
        });
        Object.defineProperty(this, "onTrackMouseMoveX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.preventDefault();
            }
        });
        Object.defineProperty(this, "onTrackMouseDownY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.preventDefault();
                const state = this.grid.getState();
                const relativeOffset = (e.offsetY / this.grid.viewportHeight) * state.tableHeight;
                this.setScrollOffsetY(relativeOffset);
                this.grid.renderViewportRows();
            }
        });
        Object.defineProperty(this, "onTrackMouseDownX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                e.preventDefault();
                const state = this.grid.getState();
                const relativeOffset = (e.offsetX / this.grid.viewportWidth) * state.tableWidth;
                this.setScrollOffsetX(relativeOffset);
                this.grid.renderViewportCells();
            }
        });
        Object.defineProperty(this, "translateThumbY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (offset) => {
                this.thumbY.style.transform = `translateY(${offset}px)`;
            }
        });
        Object.defineProperty(this, "translateThumbX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (offset) => {
                this.thumbX.style.transform = `translateX(${offset}px)`;
            }
        });
        Object.defineProperty(this, "setThumbSizeY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (height) => {
                this.thumbY.style.height = `${height}px`;
            }
        });
        Object.defineProperty(this, "setThumbSizeX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (width) => {
                this.thumbX.style.width = `${width}px`;
            }
        });
        this.grid = grid;
        this.isScrolling = false;
        this.transientScrollOffsetY = 0;
        this.transientScrollOffsetX = 0;
        this.trackX = document.createElement("div");
        this.trackX.className =
            "absolute bottom-0 z-10 h-[8px] w-full cursor-pointer bg-gray-100 border-t border-gray-300";
        this.thumbX = document.createElement("div");
        this.thumbX.className =
            "h-full cursor-pointer bg-gray-400 hover:opacity-90 rounded";
        this.trackY = document.createElement("div");
        this.trackY.className =
            "absolute right-0 z-10 h-full w-[8px] cursor-pointer bg-gray-100 border-l border-gray-300";
        this.thumbY = document.createElement("div");
        this.thumbY.className =
            "w-full cursor-pointer bg-gray-400 hover:opacity-90 rounded";
        this.trackX.addEventListener("mousemove", this.onTrackMouseMoveX);
        this.trackX.addEventListener("mousedown", this.onTrackMouseDownX);
        this.trackY.addEventListener("mousemove", this.onTrackMouseMoveY);
        this.trackY.addEventListener("mousedown", this.onTrackMouseDownY);
        this.thumbX.addEventListener("mousedown", this.onThumbMouseDownX);
        this.thumbY.addEventListener("mousedown", this.onThumbMouseDownY);
        this.grid.container.addEventListener("wheel", this.onContainerWheel);
        this.trackX.appendChild(this.thumbX);
        this.trackY.appendChild(this.thumbY);
        this.grid.container.appendChild(this.trackX);
        this.grid.container.appendChild(this.trackY);
        this.refreshThumb();
    }
}

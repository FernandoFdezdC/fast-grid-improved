import { Grid } from "./grid";

export class Scrollbar {
  trackY: HTMLDivElement;
  thumbY: HTMLDivElement;
  trackX: HTMLDivElement;
  thumbX: HTMLDivElement;

  isScrolling: boolean;
  transientScrollOffsetY: number;
  transientScrollOffsetX: number;

  grid: Grid;
  constructor(grid: Grid) {
    this.grid = grid;
    this.isScrolling = false;
    this.transientScrollOffsetY = 0;
    this.transientScrollOffsetX = 0;

    // TRACK X
    this.trackX = document.createElement("div");
    Object.assign(this.trackX.style, {
      position: "absolute",
      bottom: "0px",
      left: "0px",
      right: "8px",                // deja espacio para la scrollbar Y
      height: "8px",
      backgroundColor: "#f3f4f6",  // bg-gray-100
      borderTop: "1px solid #d1d5db", // border-t border-gray-300
      cursor: "pointer",
      zIndex: "10",
    });

    // THUMB X
    this.thumbX = document.createElement("div");
    Object.assign(this.thumbX.style, {
      height: "100%",
      backgroundColor: "#9ca3af",  // bg-gray-400
      borderRadius: "4px",
      cursor: "pointer",
    });

    // TRACK Y
    this.trackY = document.createElement("div");
    Object.assign(this.trackY.style, {
      position: "absolute",
      top: "0px",
      bottom: "0px",
      right: "0px",
      width: "8px",
      backgroundColor: "#f3f4f6",
      borderLeft: "1px solid #d1d5db",
      cursor: "pointer",
      zIndex: "10",
    });

    // THUMB Y
    this.thumbY = document.createElement("div");
    Object.assign(this.thumbY.style, {
      width: "100%",
      backgroundColor: "#9ca3af",
      borderRadius: "4px",
      cursor: "pointer",
    });

    // Listeners de track
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
  refreshThumb = () => {
    const state = this.grid.getState();
    this.translateThumbY(state.thumbOffsetY);
    this.setThumbSizeY(state.thumbSizeY);
    this.translateThumbX(state.thumbOffsetX);
    this.setThumbSizeX(state.thumbSizeX);
  };
  clampThumbIfNeeded = () => {
    const state = this.grid.getState();
    let shouldTranslateThumb = false;
    if (
      this.grid.offsetY != null &&
      (this.grid.offsetY < 0 || this.grid.offsetY > state.scrollableHeight)
    ) {
      const clampedOffsetY = Math.max(
        0,
        Math.min(this.grid.offsetY, state.scrollableHeight)
      );
      this.grid.offsetY = clampedOffsetY;
      shouldTranslateThumb = true;
    }
    if (
      this.grid.offsetX != null &&
      (this.grid.offsetX < 0 || this.grid.offsetX > state.scrollableWidth)
    ) {
      const clampedOffsetX = Math.max(
        0,
        Math.min(this.grid.offsetX, state.scrollableWidth)
      );
      this.grid.offsetX = clampedOffsetX;
      shouldTranslateThumb = true;
    }
    if (shouldTranslateThumb) {
      const state2 = this.grid.getState();
      this.translateThumbX(state2.thumbOffsetX);
      this.translateThumbY(state2.thumbOffsetY);
    }
  };
  setScrollOffsetX = (x: number) => {
    const state = this.grid.getState();
    const clampedOffsetX = Math.max(0, Math.min(x, state.scrollableWidth));
    this.grid.offsetX = clampedOffsetX;

    const state2 = this.grid.getState();
    this.translateThumbX(state2.thumbOffsetX);
  };
  setScrollOffsetY = (y: number) => {
    const state = this.grid.getState();
    const clampedOffsetY = Math.max(0, Math.min(y, state.scrollableHeight));
    this.grid.offsetY = clampedOffsetY;

    const state2 = this.grid.getState();
    this.translateThumbY(state2.thumbOffsetY);

    // —————— If scrollbar reaches the bottom of the slider ——————
    const trackHeight = this.trackY.clientHeight;
    const { thumbSizeY, scrollableHeight } = state2;

    // 1) si el thumb ocupa toda la pista, no hay scroll posible: salimos
    if (thumbSizeY >= trackHeight) return;

    // 2) si estamos en el fondo, alternamos la bandera
    if (this.grid.offsetY === scrollableHeight) {
      // Notificar al grid que se llegó al final
      this.grid.onReachBottom?.();
    }
    // ————————————————————————
  };
  scrollBy = (x?: number, y?: number) => {
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
  };
  onContainerWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let deltaY = e.deltaY;
    let deltaX = e.deltaX;
    
    // Nueva funcionalidad: Shift modifica el desplazamiento
    if (e.shiftKey && Math.abs(deltaY) > 0 && Math.abs(deltaX) < 5) {
      // Convertir desplazamiento vertical en horizontal cuando Shift está presionado
      deltaX = deltaY;
      deltaY = 0;
    } else if (Math.abs(deltaY) > 30 && Math.abs(deltaX) < 15) {
      deltaX = 0;
    } else if (Math.abs(deltaX) > 30 && Math.abs(deltaY) < 15) {
      deltaY = 0;
    }

    this.transientScrollOffsetX += deltaX;
    this.transientScrollOffsetY += deltaY;
    if (this.isScrolling) {
      return;
    }

    this.isScrolling = true;
    window.requestAnimationFrame(() => {
      const scrollX = this.transientScrollOffsetX !== 0 ? this.transientScrollOffsetX : undefined;
      const scrollY = this.transientScrollOffsetY !== 0 ? this.transientScrollOffsetY : undefined;
      this.scrollBy(scrollX, scrollY);
      this.isScrolling = false;
      this.transientScrollOffsetX = 0;
      this.transientScrollOffsetY = 0;
    });
  };
  onThumbMouseDownY = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.setProperty("cursor", "grabbing", "important");

    const state = this.grid.getState();
    const startClientY = e.clientY;
    const startThumb = state.thumbOffsetY;
    const maxThumb = Math.max(0, this.trackY.clientHeight - state.thumbSizeY);
    const scrollableHeight = state.scrollableHeight;

    const onMove = (moveEv: MouseEvent) => {
      moveEv.preventDefault();
      const delta = moveEv.clientY - startClientY;
      const newThumb = Math.max(0, Math.min(startThumb + delta, maxThumb));

      // Translate thumb visually immediately
      this.translateThumbY(newThumb);

      // Convert thumb position to grid offset
      const newOffsetY = maxThumb === 0 ? 0 : (newThumb / maxThumb) * scrollableHeight;
      this.setScrollOffsetY(newOffsetY);

      // Render rows immediately for immediate feedback
      this.grid.renderViewportRows();
    };

    const onUp = () => {
      document.body.style.removeProperty("cursor");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  onThumbMouseDownX = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.setProperty("cursor", "grabbing", "important");

    const state = this.grid.getState();
    const startClientX = e.clientX;
    const startThumb = state.thumbOffsetX;
    const maxThumb = Math.max(0, this.grid.viewportWidth - state.thumbSizeX);
    const scrollableWidth = state.scrollableWidth;

    const onMove = (moveEv: MouseEvent) => {
      moveEv.preventDefault();
      const delta = moveEv.clientX - startClientX;
      const newThumb = Math.max(0, Math.min(startThumb + delta, maxThumb));

      // Translate thumb visually immediately
      this.translateThumbX(newThumb);

      // Convert thumb position to grid offset
      const newOffsetX = maxThumb === 0 ? 0 : (newThumb / maxThumb) * scrollableWidth;
      this.setScrollOffsetX(newOffsetX);

      // Render cells right away for immediate feedback
      this.grid.renderViewportCells();
    };

    const onUp = () => {
      document.body.style.removeProperty("cursor");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  onTrackMouseMoveY = (e: MouseEvent) => {
    e.preventDefault();
  };
  onTrackMouseMoveX = (e: MouseEvent) => {
    e.preventDefault();
  };
  onTrackMouseDownY = (e: MouseEvent) => {
    e.preventDefault();

    const state = this.grid.getState();
    const trackRect = this.trackY.getBoundingClientRect();
    const clickPos = e.clientY - trackRect.top; // pixels from top of track
    const thumbHalf = state.thumbSizeY / 2;
    const targetThumb = Math.max(0, Math.min(clickPos - thumbHalf, this.trackY.clientHeight - state.thumbSizeY));

    // Jump to clicked position immediately
    const newOffsetY = (this.trackY.clientHeight - state.thumbSizeY) === 0
      ? 0
      : (targetThumb / (this.trackY.clientHeight - state.thumbSizeY)) * state.scrollableHeight;

    this.setScrollOffsetY(newOffsetY);
    this.grid.renderViewportRows();
    this.translateThumbY(targetThumb);

    // Start dragging immediately
    const startClientY = e.clientY;
    const startThumb = targetThumb;
    const maxThumb = Math.max(0, this.trackY.clientHeight - state.thumbSizeY);
    const scrollableHeight = state.scrollableHeight;

    const onMove = (moveEv: MouseEvent) => {
      moveEv.preventDefault();
      const delta = moveEv.clientY - startClientY;
      const newThumb = Math.max(0, Math.min(startThumb + delta, maxThumb));
      this.translateThumbY(newThumb);
      const newOff = maxThumb === 0 ? 0 : (newThumb / maxThumb) * scrollableHeight;
      this.setScrollOffsetY(newOff);
      this.grid.renderViewportRows();
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  onTrackMouseDownX = (e: MouseEvent) => {
    e.preventDefault();

    const state = this.grid.getState();
    const trackRect = this.trackX.getBoundingClientRect();
    const clickPos = e.clientX - trackRect.left; // pixels from left of track
    const thumbHalf = state.thumbSizeX / 2;
    const targetThumb = Math.max(0, Math.min(clickPos - thumbHalf, this.grid.viewportWidth - state.thumbSizeX));

    // Jump to clicked position immediately
    const newOffsetX = (this.grid.viewportWidth - state.thumbSizeX) === 0
      ? 0
      : (targetThumb / (this.grid.viewportWidth - state.thumbSizeX)) * state.scrollableWidth;

    this.setScrollOffsetX(newOffsetX);
    this.grid.renderViewportCells();
    this.translateThumbX(targetThumb);

    // Start dragging immediately (so moving mouse continues)
    const startClientX = e.clientX;
    const startThumb = targetThumb;
    const maxThumb = Math.max(0, this.grid.viewportWidth - state.thumbSizeX);
    const scrollableWidth = state.scrollableWidth;

    const onMove = (moveEv: MouseEvent) => {
      moveEv.preventDefault();
      const delta = moveEv.clientX - startClientX;
      const newThumb = Math.max(0, Math.min(startThumb + delta, maxThumb));
      this.translateThumbX(newThumb);
      const newOff = maxThumb === 0 ? 0 : (newThumb / maxThumb) * scrollableWidth;
      this.setScrollOffsetX(newOff);
      this.grid.renderViewportCells();
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  translateThumbY = (offset: number) => {
    this.thumbY.style.transform = `translateY(${offset}px)`;
  };
  translateThumbX = (offset: number) => {
    this.thumbX.style.transform = `translateX(${offset}px)`;
  };
  setThumbSizeY = (height: number) => {
    this.thumbY.style.height = `${height}px`;
  };
  setThumbSizeX = (width: number) => {
    this.thumbX.style.width = `${width}px`;
  };
}
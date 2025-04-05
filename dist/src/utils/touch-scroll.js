export class TouchScrolling {
    constructor(el) {
        Object.defineProperty(this, "el", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "decelerationId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "touchScrollState", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onTouchStart", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (event) => {
                if (event.touches.length === 1) {
                    this.touchScrollState = {
                        lastOffsetY: event.touches[0].clientY,
                        lastDeltaY: 0,
                        lastOffsetX: event.touches[0].clientX,
                        lastDeltaX: 0,
                    };
                    this.decelerationId = Date.now();
                }
            }
        });
        Object.defineProperty(this, "onTouchEnd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                if (this.touchScrollState != null && this.decelerationId != null) {
                    this.simulateDeceleratedScrolling(this.decelerationId);
                }
                delete this.touchScrollState;
            }
        });
        Object.defineProperty(this, "onTouchMove", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (event) => {
                if (this.touchScrollState == null || event.touches.length !== 1) {
                    return;
                }
                event.preventDefault();
                const currentTouchY = event.touches[0].clientY;
                const currentTouchX = event.touches[0].clientX;
                const deltaY = this.touchScrollState.lastOffsetY - currentTouchY;
                const deltaX = this.touchScrollState.lastOffsetX - currentTouchX;
                this.dispatchWheelEvent(deltaY, deltaX);
                if (this.touchScrollState != null) {
                    this.touchScrollState.lastOffsetY = currentTouchY;
                    this.touchScrollState.lastDeltaY = deltaY;
                    this.touchScrollState.lastOffsetX = currentTouchX;
                    this.touchScrollState.lastDeltaX = deltaX;
                    return;
                }
                this.touchScrollState = {
                    lastOffsetY: currentTouchY,
                    lastDeltaY: deltaY,
                    lastOffsetX: currentTouchX,
                    lastDeltaX: deltaX,
                };
            }
        });
        this.el = el;
        this.el.addEventListener("touchstart", this.onTouchStart);
        this.el.addEventListener("touchend", this.onTouchEnd);
        this.el.addEventListener("touchmove", this.onTouchMove);
        this.decelerationId = null;
    }
    dispatchWheelEvent(deltaY, deltaX) {
        const wheelEvent = new WheelEvent("wheel", {
            deltaY: deltaY,
            deltaX: deltaX,
            deltaMode: 0,
        });
        this.el.dispatchEvent(wheelEvent);
    }
    simulateDeceleratedScrolling(decelerationId) {
        if (this.touchScrollState == null) {
            return;
        }
        const decelerationFactor = 0.95;
        let currentDeltaY = this.touchScrollState.lastDeltaY;
        let currentDeltaX = this.touchScrollState.lastDeltaX;
        const step = () => {
            currentDeltaY *= decelerationFactor;
            currentDeltaX *= decelerationFactor;
            if ((Math.abs(currentDeltaY) < 0.1 && Math.abs(currentDeltaX) < 0.1) ||
                decelerationId !== this.decelerationId) {
                return;
            }
            this.dispatchWheelEvent(currentDeltaY, currentDeltaX);
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
}

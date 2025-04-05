export declare class TouchScrolling {
    el: HTMLDivElement;
    decelerationId: number | null;
    touchScrollState?: {
        lastOffsetY: number;
        lastDeltaY: number;
        lastOffsetX: number;
        lastDeltaX: number;
    };
    constructor(el: HTMLDivElement);
    dispatchWheelEvent(deltaY: number, deltaX: number): void;
    simulateDeceleratedScrolling(decelerationId: number): void;
    onTouchStart: (event: TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchMove: (event: TouchEvent) => void;
}

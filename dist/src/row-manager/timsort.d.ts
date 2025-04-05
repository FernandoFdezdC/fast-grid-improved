import { Result } from "../utils/result";
/**
 * Sort an array in the range [lo, hi) using TimSort.
 *
 * @param {array} array - The array to sort.
 * @param {function=} compare - Item comparison function. Default is
 *     alphabetical
 * @param {number} lo - First element in the range (inclusive).
 * @param {number} hi - Last element in the range.
 *     comparator.
 */
export declare function sort<T>(array: T[], compare: (a: T, b: T) => number, shouldCancel: () => boolean): Promise<Result>;

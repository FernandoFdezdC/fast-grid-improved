export const isEmptyFast = (obj) => {
    for (const _ in obj) {
        return false;
    }
    return true;
};

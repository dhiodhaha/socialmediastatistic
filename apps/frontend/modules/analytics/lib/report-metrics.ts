export function calculateGrowth<TKey extends "followers" | "posts" | "likes">(
    oldVal: number,
    newVal: number,
    key: TKey,
): { [K in `${TKey}Val` | `${TKey}Pct`]: number } {
    const valDiff = newVal - oldVal;
    let pct = 0;

    if (oldVal > 0) {
        pct = (valDiff / oldVal) * 100;
    } else if (newVal > 0) {
        pct = 100;
    }

    return {
        [`${key}Val`]: valDiff,
        [`${key}Pct`]: pct,
    } as { [K in `${TKey}Val` | `${TKey}Pct`]: number };
}

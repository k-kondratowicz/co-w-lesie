// Small numeric helpers.

/** Constrains `value` to the inclusive [min, max] range. */
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Constrains `value` to [0, 1]. */
export const clamp01 = (value: number) => clamp(value, 0, 1);

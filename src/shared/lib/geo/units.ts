// Shared geo constants and angle conversions used across the geo helpers.

export const EARTH_RADIUS_M = 6_371_000;

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const toDegrees = (radians: number) => (radians * 180) / Math.PI;

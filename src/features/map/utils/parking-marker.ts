// MapLibre has no rounded-rectangle marker: circles are the only built-in point shape, so the
// parking marker is drawn once to a canvas and registered as a map image. Rendered at 2x and
// declared with pixelRatio 2 so it stays sharp on retina screens.

const SIZE = 64;
const CORNER_RADIUS = 12;
const BORDER = 5;
const FILL = '#1d4ed8';
const FOREGROUND = '#ffffff';

export const PARKING_MARKER_IMAGE = 'parking-marker';
export const PARKING_MARKER_PIXEL_RATIO = 2;

// Traced with arcTo rather than roundRect: the latter is missing on iOS Safari below 16, where an
// unguarded call would throw during map load and take the whole map down with it.
function traceRoundedSquare(context: CanvasRenderingContext2D, offset: number, size: number, radius: number) {
  const end = offset + size;

  context.beginPath();
  context.moveTo(offset + radius, offset);
  context.arcTo(end, offset, end, end, radius);
  context.arcTo(end, end, offset, end, radius);
  context.arcTo(offset, end, offset, offset, radius);
  context.arcTo(offset, offset, end, offset, radius);
  context.closePath();
}

/** Blue rounded square with a white "P" - returns null when a 2D context is unavailable. */
export function createParkingMarkerImage(): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  traceRoundedSquare(context, BORDER / 2, SIZE - BORDER, CORNER_RADIUS);
  context.fillStyle = FILL;
  context.fill();
  context.lineWidth = BORDER;
  context.strokeStyle = FOREGROUND;
  context.stroke();

  context.fillStyle = FOREGROUND;
  context.font = `bold ${SIZE * 0.62}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('P', SIZE / 2, SIZE / 2 + SIZE * 0.03);

  return context.getImageData(0, 0, SIZE, SIZE);
}

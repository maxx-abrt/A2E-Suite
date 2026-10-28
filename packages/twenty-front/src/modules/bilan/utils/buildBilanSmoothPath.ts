export type BilanChartPoint = {
  x: number;
  y: number;
};

// Catmull-Rom converted to cubic Béziers. The small tension keeps the curve
// close to the data points instead of overshooting sparse financial months.
export const buildBilanSmoothPath = (
  points: BilanChartPoint[],
  tension = 0.18,
): string => {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M${points[0].x},${points[0].y}`;
  }

  const getPoint = (index: number): BilanChartPoint =>
    points[Math.max(0, Math.min(points.length - 1, index))];

  let path = `M${points[0].x},${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previousPoint = getPoint(index - 1);
    const currentPoint = getPoint(index);
    const nextPoint = getPoint(index + 1);
    const followingPoint = getPoint(index + 2);

    path += `C${
      currentPoint.x + (nextPoint.x - previousPoint.x) * tension
    },${currentPoint.y + (nextPoint.y - previousPoint.y) * tension} ${
      nextPoint.x - (followingPoint.x - currentPoint.x) * tension
    },${nextPoint.y - (followingPoint.y - currentPoint.y) * tension} ${
      nextPoint.x
    },${nextPoint.y}`;
  }

  return path;
};

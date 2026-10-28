import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WIDTH = 112;
const HEIGHT = 48;
const RAMP = ' .:-=+*#%@';
const normalize = (vector) => {
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length);
};
const dot = (left, right) =>
  left.reduce((sum, value, index) => sum + value * right[index], 0);
const cross = (left, right) => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0],
];
const add = (left, right, scale = 1) =>
  left.map((value, index) => value + right[index] * scale);
const box = (point, center, half, radius = 0.04) => {
  const distance = point.map(
    (value, index) => Math.abs(value - center[index]) - half[index] + radius,
  );
  return (
    Math.hypot(...distance.map((value) => Math.max(value, 0))) +
    Math.min(Math.max(...distance), 0) -
    radius
  );
};
const rotateZ = ([x, y, z], angle) => [
  x * Math.cos(angle) - y * Math.sin(angle),
  x * Math.sin(angle) + y * Math.cos(angle),
  z,
];

const shapes = {
  bridge: (point) => {
    const [x, y, z] = point;
    const arch = Math.max(
      Math.abs(Math.hypot(x, y + 0.35) - 1.12) - 0.16,
      -(y + 0.35),
      Math.abs(z) - 0.32,
    );
    return Math.min(
      arch,
      box(point, [-1.12, -0.65, 0], [0.16, 0.55, 0.4]),
      box(point, [1.12, -0.65, 0], [0.16, 0.55, 0.4]),
      box(point, [0, 0.96, 0], [1.65, 0.12, 0.46]),
      box(point, [-1.12, -1.16, 0], [0.3, 0.08, 0.53]),
      box(point, [1.12, -1.16, 0], [0.3, 0.08, 0.53]),
    );
  },
  blocks: (point) => {
    // Two leaves meet at a visible spine; inset page layers give the book its edge.
    let distance = 10;
    for (const side of [-1, 1]) {
      const local = rotateZ(
        add(point, [side * 0.73, 0.14, 0], -1),
        -side * 0.18,
      );
      distance = Math.min(
        distance,
        box(local, [0, -0.04, 0], [0.74, 0.07, 1.03]),
        box(local, [0, 0.06, 0], [0.68, 0.08, 0.95]),
      );
      for (let layer = 0; layer < 3; layer++)
        distance = Math.min(
          distance,
          box(
            local,
            [0, 0.07 + layer * 0.035, 0],
            [0.67 - layer * 0.01, 0.012, 0.94 - layer * 0.01],
            0.008,
          ),
        );
    }
    return Math.min(distance, box(point, [0, 0.02, 0], [0.045, 0.075, 1.02]));
  },
  stack: (point) => {
    // Layered pages stand for work gaining structure, rather than an arbitrary texture.
    let distance = 10;
    for (let layer = 0; layer < 3; layer++) {
      const local = rotateZ(
        add(
          point,
          [(layer - 1) * 0.22, (layer - 1) * 0.42, (layer - 1) * -0.14],
          -1,
        ),
        0,
      );
      let sheet = box(local, [0, 0, 0], [0.96, 0.075, 0.88]);
      if (layer === 2) {
        for (let line = 0; line < 4; line++)
          sheet = Math.max(
            sheet,
            -box(
              local,
              [-0.1, 0.077, -0.45 + line * 0.23],
              [line === 3 ? 0.35 : 0.62, 0.012, 0.025],
              0.007,
            ),
          );
      }
      distance = Math.min(distance, sheet);
    }
    return distance;
  },
  cube: (point) =>
    Math.min(
      ...[
        [-0.55, -0.55, 0.4],
        [0.55, -0.55, 0.4],
        [-0.55, -0.55, -0.7],
        [0.55, -0.55, -0.7],
        [-0.55, 0.55, -0.7],
      ].map((center) => box(point, center, [0.5, 0.5, 0.5], 0.07)),
    ),
};

const render = (distance, variant) => {
  const camera = variant === 'bridge' ? [4, 2.1, 7] : [4, 4.5, 6];
  const forward = normalize(camera.map((value) => -value));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const light = normalize([-3, 6, 5]);
  const characters = [];
  for (let row = 0; row < HEIGHT; row++) {
    let line = '';
    for (let column = 0; column < WIDTH; column++) {
      const horizontal =
        (((column / (WIDTH - 1)) * 2 - 1) * 1.85 * WIDTH * 0.6) / HEIGHT;
      const vertical = (1 - (row / (HEIGHT - 1)) * 2) * 1.85;
      const origin = add(add(camera, right, horizontal), up, vertical);
      let travel = 0;
      let hit = false;
      let point;
      for (let step = 0; step < 96; step++) {
        point = add(origin, forward, travel);
        const advance = distance(point);
        if (advance < 0.004) {
          hit = true;
          break;
        }
        travel += advance;
        if (travel > 16) break;
      }
      if (!hit) {
        line += ' ';
        continue;
      }
      const epsilon = 0.008;
      const normal = normalize(
        [0, 1, 2].map((axis) => {
          const offset = [0, 0, 0];
          offset[axis] = epsilon;
          return (
            distance(add(point, offset)) - distance(add(point, offset, -1))
          );
        }),
      );
      const diffuse = Math.max(dot(normal, light), 0);
      const edge = (1 - Math.abs(dot(normal, forward))) ** 2;
      // Dense glyphs describe shadow; a quiet stipple keeps lit surfaces legible.
      const density = Math.min(
        1,
        Math.max(0.12, 0.78 - diffuse * 0.56 + edge * 0.17),
      );
      line += RAMP[Math.round(density * (RAMP.length - 1))];
    }
    characters.push(line);
  }
  const occupiedRows = characters.filter((line) => line.trim().length > 0);
  const firstColumn = Math.min(
    ...occupiedRows.map((line) => line.search(/\S/)),
  );
  const lastColumn = Math.max(
    ...occupiedRows.map((line) => line.trimEnd().length),
  );
  return occupiedRows
    .map((line) => line.slice(firstColumn, lastColumn))
    .join('\n');
};
const frames = Object.fromEntries(
  Object.entries(shapes).map(([variant, shape]) => [
    variant,
    render(shape, variant),
  ]),
);
const target = fileURLToPath(
  new URL(
    '../src/modules/public-site/art/PublicAsciiFrames.ts',
    import.meta.url,
  ),
);
writeFileSync(
  target,
  `// Generated by scripts/generate-public-ascii.mjs from orthographic 3D geometry.\nexport const PUBLIC_ASCII_FRAMES = ${JSON.stringify(frames, null, 2)};\n`,
);

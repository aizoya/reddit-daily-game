import type { Cell, Fare, Puzzle } from '../../shared/onefare';
import { fareLetter } from '../../shared/onefare';
import { fareColor } from '../palette';

const UNIT = 100;
const at = (value: number): number => value * UNIT + UNIT / 2;

type Leg = { from: Cell; to: Cell; paid: boolean };

// Cars drive on the grid, so every leg is drawn as an L: across first, then up or down.
const legPath = ({ from, to }: Leg): string =>
  `M ${at(from.x)} ${at(from.y)} L ${at(to.x)} ${at(from.y)} L ${at(to.x)} ${at(to.y)}`;

const routeLegs = (puzzle: Puzzle, order: readonly number[]): Leg[] => {
  const legs: Leg[] = [];
  let position = puzzle.start;
  for (const id of order) {
    const fare = puzzle.fares.find((candidate) => candidate.id === id);
    if (fare === undefined) continue;
    legs.push({ from: position, to: fare.pickup, paid: false });
    legs.push({ from: fare.pickup, to: fare.dropoff, paid: true });
    position = fare.dropoff;
  }
  return legs;
};

type FareMarksProps = {
  fare: Fare;
  step: number | undefined;
  dimmed: boolean;
  onPick: ((id: number) => void) | undefined;
};

const FareMarks = ({ fare, step, dimmed, onPick }: FareMarksProps) => {
  const color = fareColor(fare.id);
  const letter = fareLetter(fare.id);
  const px = at(fare.pickup.x);
  const py = at(fare.pickup.y);
  const dx = at(fare.dropoff.x);
  const dy = at(fare.dropoff.y);
  return (
    <g
      opacity={dimmed ? 0.32 : 1}
      onClick={onPick ? () => onPick(fare.id) : undefined}
      style={onPick ? { cursor: 'pointer' } : undefined}
    >
      {step === undefined ? (
        <line
          x1={px}
          y1={py}
          x2={dx}
          y2={dy}
          stroke={color}
          strokeWidth={3}
          strokeDasharray="4 10"
          strokeLinecap="round"
          opacity={0.4}
        />
      ) : null}
      {/* Drop-off: hollow square. */}
      <rect
        x={dx - 25}
        y={dy - 25}
        width={50}
        height={50}
        rx={9}
        fill="#0b1524"
        stroke={color}
        strokeWidth={6}
      />
      <text
        x={dx}
        y={dy + 10}
        textAnchor="middle"
        fontSize={30}
        fontWeight={700}
        fill={color}
      >
        {letter}
      </text>
      {/* Pickup: solid circle. */}
      <circle cx={px} cy={py} r={30} fill={color} />
      <text
        x={px}
        y={py + 11}
        textAnchor="middle"
        fontSize={32}
        fontWeight={800}
        fill="#0b1524"
      >
        {letter}
      </text>
      {step !== undefined ? (
        <g>
          <circle cx={px + 26} cy={py - 26} r={17} fill="#ffc233" />
          <text
            x={px + 26}
            y={py - 18}
            textAnchor="middle"
            fontSize={22}
            fontWeight={800}
            fill="#1b1a17"
          >
            {step}
          </text>
        </g>
      ) : null}
      {/* Generous invisible tap targets. */}
      <circle cx={px} cy={py} r={48} fill="transparent" />
      <circle cx={dx} cy={dy} r={48} fill="transparent" />
    </g>
  );
};

type CityMapProps = {
  puzzle: Puzzle;
  order: readonly number[];
  blocked?: ReadonlySet<number> | undefined;
  onPick?: ((id: number) => void) | undefined;
  // Drive the cab along the route once. Used on the result screen.
  drive?: boolean | undefined;
  label: string;
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const CityMap = ({
  puzzle,
  order,
  blocked,
  onPick,
  drive,
  label,
}: CityMapProps) => {
  const width = puzzle.width * UNIT;
  const height = puzzle.height * UNIT;
  const blocks: Cell[] = [];
  for (let y = 0; y < puzzle.height - 1; y++) {
    for (let x = 0; x < puzzle.width - 1; x++) blocks.push({ x, y });
  }
  const legs = routeLegs(puzzle, order);
  const driving = drive === true && legs.length > 0 && !prefersReducedMotion();
  // One continuous path through every leg, relative to the cab's starting corner.
  const drivePath = legs
    .map(
      ({ from, to }, index) =>
        `${index === 0 ? `M ${at(from.x)} ${at(from.y)} ` : ''}L ${at(to.x)} ${at(from.y)} L ${at(to.x)} ${at(to.y)}`
    )
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="block h-full w-full select-none"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
    >
      <rect width={width} height={height} rx={28} fill="#101d31" />
      {blocks.map((block) => (
        <rect
          key={`${block.x}-${block.y}`}
          x={at(block.x) + 13}
          y={at(block.y) + 13}
          width={UNIT - 26}
          height={UNIT - 26}
          rx={10}
          fill="#182a44"
        />
      ))}
      {legs.map((leg, index) => (
        <path
          key={index}
          d={legPath(leg)}
          fill="none"
          stroke="#ffc233"
          strokeWidth={leg.paid ? 13 : 7}
          strokeDasharray={leg.paid ? undefined : '3 15'}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={leg.paid ? 0.95 : 0.8}
        />
      ))}
      {puzzle.fares.map((fare) => {
        const index = order.indexOf(fare.id);
        return (
          <FareMarks
            key={fare.id}
            fare={fare}
            step={index >= 0 ? index + 1 : undefined}
            dimmed={index < 0 && (blocked?.has(fare.id) ?? false)}
            onPick={onPick}
          />
        );
      })}
      {/* The cab: where the shift starts. */}
      <g
        key={driving ? order.join('-') : 'parked'}
        transform={
          driving
            ? undefined
            : `translate(${at(puzzle.start.x)} ${at(puzzle.start.y)})`
        }
      >
        {driving ? (
          <animateMotion
            path={drivePath}
            dur={`${Math.min(3.2, 0.9 + legs.length * 0.28)}s`}
            fill="freeze"
            calcMode="linear"
          />
        ) : null}
        <rect
          x={-30}
          y={-20}
          width={60}
          height={40}
          rx={12}
          fill="#ffc233"
          stroke="#0b1524"
          strokeWidth={5}
        />
        <rect x={-16} y={-11} width={32} height={12} rx={4} fill="#0b1524" />
        <circle cx={-17} cy={20} r={8} fill="#0b1524" />
        <circle cx={17} cy={20} r={8} fill="#0b1524" />
      </g>
    </svg>
  );
};

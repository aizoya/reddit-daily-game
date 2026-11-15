// One colour per fare. Letters and shapes carry the same information, so colour is never the only cue.
const FARE_COLORS = [
  '#ff7a70',
  '#4dd4ac',
  '#74a9ff',
  '#c99cf2',
  '#f78fb8',
  '#a4e06a',
  '#5cd9e6',
];

export const fareColor = (id: number): string =>
  FARE_COLORS[(id - 1) % FARE_COLORS.length] ?? '#ffffff';

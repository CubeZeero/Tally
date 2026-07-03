export const PALETTE = [
  "#ff7a00",
  "#3a86ff",
  "#06d6a0",
  "#9b5de5",
  "#e63946",
  "#ffbe0b",
  "#118ab2",
  "#ef476f",
  "#8338ec",
  "#00b4d8",
  "#fb5607",
  "#2a9d8f",
];

export function colorAt(i: number): string {
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

export interface EdgeTierColor {
  stroke: string;
  label: string;
}

const tierColors: EdgeTierColor[] = [
  { stroke: '', label: '1 belt/pipe' },
  { stroke: 'var(--mantine-color-yellow-7)', label: '2-3 belts/pipes' },
  { stroke: 'var(--mantine-color-orange-6)', label: '4+ belts/pipes' },
];

export function getEdgeTierColor(
  neededCount: number | null,
): EdgeTierColor | null {
  if (neededCount == null || neededCount <= 1) return null;
  if (neededCount <= 3) return tierColors[1];
  return tierColors[2];
}

export function getEdgeTierLegend(): EdgeTierColor[] {
  return tierColors;
}

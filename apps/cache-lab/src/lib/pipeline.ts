export function computeCPI({
  cpiBase,
  missPenalty,
  missRate,
  memRefPerInstr,
}: {
  cpiBase: number;
  missPenalty: number;
  missRate: number;
  memRefPerInstr: number;
}): number {
  return cpiBase + missPenalty * missRate * memRefPerInstr;
}

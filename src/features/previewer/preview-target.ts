export type PreviewTarget = { cvId: string };
export type PreviewTargetData = { cvId: string };

export function toPreviewTargetData(target: PreviewTarget): PreviewTargetData {
  return { cvId: target.cvId };
}

export function fromPreviewTargetData(data: PreviewTargetData): PreviewTarget {
  return { cvId: data.cvId };
}

export function isPreviewTargetMatch({
  current,
  incoming,
}: {
  current: PreviewTarget;
  incoming: PreviewTargetData;
}): boolean {
  return current.cvId === incoming.cvId;
}

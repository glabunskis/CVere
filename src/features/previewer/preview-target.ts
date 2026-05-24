export type PreviewTarget =
  | { kind: 'master' }
  | { kind: 'tailored_cv'; refId: string };

export type PreviewTargetData =
  | { kind: 'master' }
  | { kind: 'tailored_cv'; refId: string };

export function toPreviewTargetData(target: PreviewTarget): PreviewTargetData {
  if (target.kind === 'master') {
    return { kind: 'master' };
  }
  return { kind: 'tailored_cv', refId: target.refId };
}

export function fromPreviewTargetData(data: PreviewTargetData): PreviewTarget {
  if (data.kind === 'master') {
    return { kind: 'master' };
  }
  return { kind: 'tailored_cv', refId: data.refId };
}

export function isPreviewTargetMatch({
  current,
  incoming,
}: {
  current: PreviewTarget;
  incoming: PreviewTargetData;
}): boolean {
  if (current.kind === 'master' && incoming.kind === 'master') return true;
  if (current.kind === 'tailored_cv' && incoming.kind === 'tailored_cv') {
    return current.refId === incoming.refId;
  }
  return false;
}

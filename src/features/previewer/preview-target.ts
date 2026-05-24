export const MASTER_PREVIEW_REF_ID = 'master';

export type PreviewTarget =
  | { kind: 'master' }
  | { kind: 'tailored_cv'; refId: string };

export type PreviewTargetData = {
  kind: 'master' | 'tailored_cv';
  refId: string;
};

export function toPreviewTargetData(target: PreviewTarget): PreviewTargetData {
  if (target.kind === 'master') {
    return { kind: 'master', refId: MASTER_PREVIEW_REF_ID };
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
  if (current.kind !== incoming.kind) return false;
  if (current.kind === 'master') return incoming.refId === MASTER_PREVIEW_REF_ID;
  return current.refId === incoming.refId;
}

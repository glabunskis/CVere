import { usePreviewStore } from '@/features/cv-preview/preview-store';

/**
 * Re-sign the preview URL so the iframe reloads the freshly rendered PDF.
 * Manual fact-editor saves/deletes render the CV server-side (via
 * `renderAndUploadCv`) before returning; calling this in their `onSuccess`
 * makes the preview auto-update, matching the chat and style-picker paths.
 * Localises the single cross-slice dependency on `cv-preview` to this file.
 */
export function refreshCvPreview() {
  void usePreviewStore.getState().markPreviewDirty();
}

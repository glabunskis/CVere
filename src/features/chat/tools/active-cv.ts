import 'server-only';

/**
 * Mutable reference to the CV the chat turn is currently editing.
 *
 * Tools default to `current` when the model omits an explicit `cvId`. The
 * `createCv` tool flips `current` to the freshly created copy so every later
 * tool call in the same turn lands on the new CV without the model having to
 * thread the id through each call.
 */
export type ActiveCvRef = { current: string };

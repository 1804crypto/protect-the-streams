/**
 * Browser compatibility types for WebKit AudioContext.
 * Safari and older mobile browsers expose AudioContext as `webkitAudioContext`.
 * Use this instead of `(window as any).webkitAudioContext`.
 */
export type WebkitWindow = Window & typeof globalThis & {
    webkitAudioContext: typeof AudioContext;
};

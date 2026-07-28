/**
 * True when the app is being driven by Cypress e2e tests.
 *
 * Used to skip GSAP entrance animations: headless browsers throttle
 * requestAnimationFrame, so timelines that gate visibility (preloader,
 * opacity fade-ins) can stall and leave the UI permanently hidden.
 */
export const isE2E = (): boolean =>
  typeof window !== 'undefined' && 'Cypress' in window;

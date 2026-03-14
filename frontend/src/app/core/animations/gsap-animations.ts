import gsap from 'gsap';

/** Fade-in + slide-up entrance for a single element. */
export function fadeInUp(element: HTMLElement, delay = 0): void {
  gsap.fromTo(
    element,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.6, delay, ease: 'power3.out' },
  );
}

/** Staggered fade-in entrance for multiple cards/elements. */
export function staggerCards(elements: HTMLElement[]): void {
  gsap.fromTo(
    elements,
    { opacity: 0, y: 40, scale: 0.95 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
    },
  );
}

/** Subtle scale pulse on hover for sidebar nav items. */
export function sidebarHoverIn(element: HTMLElement): void {
  gsap.to(element, { scale: 1.03, duration: 0.2, ease: 'power1.out' });
}

export function sidebarHoverOut(element: HTMLElement): void {
  gsap.to(element, { scale: 1, duration: 0.2, ease: 'power1.out' });
}

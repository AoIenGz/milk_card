import { getActiveCard, getOtherCards, getActiveDayKey, resetCardPositions } from './carousel.js';
import { renderPage } from './page.js';
import { refreshCards } from './carousel.js';

const pageScene = () => document.getElementById('page-scene');
const carouselScene = () => document.getElementById('carousel-scene');
const carouselEl = () => document.getElementById('carousel');

/* === CAROUSEL → PAGE (active card expands to full page) === */
export function animateCarouselToPage(onComplete) {
  const card = getActiveCard();
  const others = getOtherCards();
  const page = pageScene();
  const dayKey = getActiveDayKey();

  renderPage(dayKey);
  gsap.set(page, { visibility: 'visible', opacity: 0 });
  page.classList.remove('hidden');

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(card, { clearProps: 'all' });
      gsap.set(others, { clearProps: 'all' });
      onComplete();
    }
  });

  // Phase 1: active card lifts + scales up
  tl.to(card, {
    y: -80,
    scale: 1.4,
    opacity: 1,
    boxShadow: '0 30px 60px rgba(233,69,96,0.5)',
    duration: 0.3,
    ease: 'power2.out',
  }, 0);

  // Phase 2: expand to viewport
  tl.to(card, {
    width: '100vw',
    height: '100vh',
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    borderRadius: '0px',
    opacity: 0,
    duration: 0.4,
    ease: 'power3.inOut',
  }, 0.2);

  // Others fade out
  tl.to(others, {
    opacity: 0,
    scale: 0.5,
    duration: 0.3,
    ease: 'power2.in',
    stagger: 0.02,
  }, 0.05);

  // Page cross-fades in
  tl.to(page, {
    opacity: 1,
    duration: 0.3,
    ease: 'power2.out',
  }, 0.3);

  // Stagger todo items appearing
  const items = page.querySelectorAll('.todo-item');
  tl.fromTo(items, {
    opacity: 0,
    y: 20,
  }, {
    opacity: 1,
    y: 0,
    duration: 0.35,
    stagger: 0.05,
    ease: 'power2.out',
  }, 0.45);

  return tl;
}

/* === PAGE → CAROUSEL (page shrinks back into card stack) === */
export function animatePageToCarousel(onComplete) {
  const page = pageScene();
  const cScene = carouselScene();
  const card = getActiveCard();

  gsap.set(cScene, { visibility: 'visible' });
  refreshCards();

  const tl = gsap.timeline({
    onComplete: () => {
      page.classList.add('hidden');
      gsap.set(page, { clearProps: 'all' });
      gsap.set(page, { visibility: 'hidden' });
      resetCardPositions();
      onComplete();
    }
  });

  // Phase 1: page shrinks + tilts
  tl.to(page, {
    scale: 0.5,
    rotation: -3,
    borderRadius: '16px',
    filter: 'blur(4px)',
    y: 30,
    duration: 0.4,
    ease: 'power3.in',
  }, 0);

  // Phase 2: fade out page, scale down further
  tl.to(page, {
    scale: 0.35,
    opacity: 0,
    x: 20,
    duration: 0.3,
    ease: 'power2.in',
  }, 0.3);

  // Carousel fades in
  tl.fromTo(carouselEl(), {
    opacity: 0,
    scale: 0.8,
  }, {
    opacity: 1,
    scale: 1,
    duration: 0.5,
    ease: 'power2.out',
  }, 0.3);

  return tl;
}

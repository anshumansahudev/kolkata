/**
 * Company Timeline - Scroll animations, dynamic spine alignment & Google Maps routes
 */
 
/* ==========================================================================
   Google Maps route settings
   --------------------------------------------------------------------------
   Card titles like "Howrah Station to Pubali Apartment" are split into
   origin + destination. Add a full address / landmark below for any name
   Google Maps might not understand (e.g. "Apartment").
   Values here are used as-is; anything else gets DEFAULT_CITY appended.
   ========================================================================== */
const DEFAULT_CITY = 'Kolkata, West Bengal';
 
const PLACE_ALIASES = {
  'berhpur': 'Berhampur Railway Station, Odisha',
  'howrah station': 'Howrah Junction Railway Station, Howrah',
  // Apartment: Pubali, I/H-1/1 Aswininagar, Rajarhat (pinned via Aswini Nagar Post Office)
  'apartment': 'Aswini Nagar Post Office, Rajarhat, Kolkata, West Bengal 700159',
  'pubali apartment': 'Aswini Nagar Post Office, Rajarhat, Kolkata, West Bengal 700159',
  'alcove triveni mall': 'Alcove Triveni Mall, Serampore, West Bengal',
  'fiem': '22.4433497,88.4154285', // Future Institute of Engineering and Management
  'victorial memorial': 'Victoria Memorial, Kolkata',
  'old kolkata streets': '24 Zakaria Street, Kolutola, Kolkata, West Bengal 700073'
};
 
function resolvePlace(name) {
  const key = name.trim().toLowerCase();
  return PLACE_ALIASES[key] || `${name.trim()}, ${DEFAULT_CITY}`;
}
 
/** Pick a Google Maps travel mode from the card's description text */
function detectTravelMode(text) {
  const t = text.toLowerCase();
  if (/\b(train|metro)\b/.test(t)) return 'transit';
  if (/\bwalk(ing)?\b/.test(t) && !/\b(cab|auto)\b/.test(t)) return 'walking';
  return 'driving';
}
 
function buildRouteUrl(origin, destination, mode) {
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: mode
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
 
/**
 * Adds a "View Route" button to every timeline card.
 * Optional per-item overrides on .timeline-item:
 *   data-origin="..." data-destination="..." data-mode="driving|transit|walking|bicycling"
 *   data-no-route  (skip the button)
 */
function addRouteButtons(items) {
  items.forEach((item) => {
    if (item.hasAttribute('data-no-route')) return;
 
    const card = item.querySelector('.timeline-card');
    const titleEl = item.querySelector('.card-title');
    const textEl = item.querySelector('.card-text');
    if (!card || !titleEl) return;
 
    let origin = item.dataset.origin;
    let destination = item.dataset.destination;
 
    if (!origin || !destination) {
      const parts = titleEl.textContent.trim().split(/\s+to\s+/i);
      if (parts.length < 2) return; // title isn't "A to B"
      origin = origin || resolvePlace(parts[0]);
      destination = destination || resolvePlace(parts.slice(1).join(' to '));
    }
 
    const mode = item.dataset.mode || detectTravelMode(textEl ? textEl.textContent : '');
 
    const link = document.createElement('a');
    link.className = 'route-btn';
    link.href = buildRouteUrl(origin, destination, mode);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `View route for ${titleEl.textContent.trim()} on Google Maps`);
    link.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      <span>View Route</span>`;
    card.appendChild(link);
  });
}
 
/* ==========================================================================
   Day navigation (Day 1, Day 2, ...)
   --------------------------------------------------------------------------
   Built automatically from the dates on the timeline: each new date becomes
   the next "Day N" button, which scrolls to that date's first card.
   ========================================================================== */
function addDayNav(items) {
  const header = document.querySelector('.timeline-header');
  if (!header || items.length === 0) return;
 
  // Group items by date, in the order they appear
  const days = [];
  items.forEach((item) => {
    const dateEl = item.querySelector('.timeline-date');
    if (!dateEl) return;
    const label = dateEl.firstChild.textContent.trim();
    let day = days.find((d) => d.label === label);
    if (!day) {
      day = { label, first: item };
      days.push(day);
    }
  });
  if (days.length < 2) return;
 
  const nav = document.createElement('nav');
  nav.className = 'day-nav';
  nav.setAttribute('aria-label', 'Jump to day');
 
  const buttons = days.map((day, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day-btn';
    btn.innerHTML = `<span class="day-btn-num">Day ${i + 1}</span><span class="day-btn-date">${day.label}</span>`;
    btn.addEventListener('click', () => {
      const offset = nav.offsetHeight + 28;
      const top = day.first.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
    nav.appendChild(btn);
    return btn;
  });
 
  header.insertAdjacentElement('afterend', nav);
 
  // Highlight the day currently in view
  let ticking = false;
  function updateActive() {
    const line = nav.offsetHeight + 60;
    let active = 0;
    days.forEach((day, i) => {
      if (day.first.getBoundingClientRect().top - line <= 0) active = i;
    });
    buttons.forEach((b, i) => b.classList.toggle('active', i === active));
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateActive); }
  }, { passive: true });
  updateActive();
}
 
document.addEventListener('DOMContentLoaded', () => {
  const timelineItems = document.querySelectorAll('.timeline-item');
  const spine = document.querySelector('.timeline-spine');
 
  addRouteButtons(timelineItems);
  addDayNav(timelineItems);
 
  /**
   * Automatically calculates the spine start & end positions so it connects
   * precisely from the center of the first icon to the center of the last icon.
   */
  function updateSpineBounds() {
    if (!spine || timelineItems.length === 0) return;
 
    const firstNode = timelineItems[0].querySelector('.timeline-node');
    const lastNode = timelineItems[timelineItems.length - 1].querySelector('.timeline-node');
    const containerRect = document.querySelector('.timeline-container').getBoundingClientRect();
 
    if (firstNode && lastNode) {
      const firstRect = firstNode.getBoundingClientRect();
      const lastRect = lastNode.getBoundingClientRect();
 
      const topOffset = firstRect.top - containerRect.top + (firstRect.height / 2);
      const bottomOffset = lastRect.top - containerRect.top + (lastRect.height / 2);
 
      spine.style.top = `${topOffset}px`;
      spine.style.height = `${bottomOffset - topOffset}px`;
    }
  }
 
  // Calculate on load and on resize
  updateSpineBounds();
  window.addEventListener('resize', updateSpineBounds);
});
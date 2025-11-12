// ==============================================
// Epic Mind Media — Frontend JS (no Firebase)
// Responsibilities:
//  1) Mobile navigation toggling (ARIA-compliant)
//  2) Smooth in-page scrolling for anchor links
//  3) Dynamic year in footer
//  4) Form feedback animations (success/error states)
// ----------------------------------------------
// This file contains no network or Firebase logic.
// It focuses purely on accessible UI interactions.
// ==============================================

/* ---------- Small helper selectors for brevity ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);        // Query a single element
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel)); // Query multiple elements as array

/* ---------- 1) Mobile Navigation Toggling ---------- */
(() => {
  // Grab the hamburger toggle and the nav element
  const toggle = $('.nav-toggle');        // Button with aria-controls="primary-nav"
  const nav = $('#primary-nav');          // The off-canvas / inline navigation container

  // Exit silently if either element is missing (keeps code resilient)
  if (!toggle || !nav) return;

  // Track open/close state for ARIA and CSS
  const openClass = 'open';               // CSS class that reveals the nav panel

  // Click toggles the open state and updates aria-expanded for assistive tech
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle(openClass);            // Flip CSS state
    toggle.setAttribute('aria-expanded', String(isOpen));      // Reflect state change
  });

  // Close panel when a nav link is activated (better mobile UX)
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');             // Only internal links
    if (!link) return;
    nav.classList.remove(openClass);                           // Hide panel
    toggle.setAttribute('aria-expanded', 'false');             // Reset ARIA state
  });

  // Close nav if Escape is pressed while panel is open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains(openClass)) {
      nav.classList.remove(openClass);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus(); // Return focus to the control for continuity
    }
  });
})();

/* ---------- 2) Smooth In‑Page Scrolling ---------- */
(() => {
  // Find all anchor links that navigate to on-page IDs (e.g., #about)
  const anchors = $$('a[href^="#"]');

  anchors.forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');                      // Read the fragment identifier
      if (!id || id === '#') return;                          // Ignore empty/placeholder hashes

      const target = $(id);                                   // Resolve the element by ID
      if (!target) return;                                    // Abort if no matching target

      // Prevent default abrupt jump and perform smooth scroll
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Move focus for screen readers after scroll completes (short delay is sufficient)
      setTimeout(() => {
        // Elements that can be focused receive a temporary tabindex
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }, 300);
    });
  });
})();

/* ---------- 3) Dynamic Year in Footer ---------- */
(() => {
  const yearEl = $('#year');                                  // Span that should display the current year
  if (!yearEl) return;                                        // Safeguard if markup is missing
  yearEl.textContent = String(new Date().getFullYear());      // Insert the current year as text
})();

/* ---------- 4) Form Feedback Animations ---------- */
(() => {
  const form = $('#quoteForm');                               // Lead capture form element
  const status = $('#quoteStatus');                           // Live region for user feedback

  if (!form || !status) return;                               // Exit if form is not present

  // Utility: add a temporary CSS class, then remove it after animation ends
  const flash = (el, cls, ms = 1200) => {
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  };

  // Client-side checks are intentionally simple; server/Firebase logic can replace this later
  const validate = (data) => {
    // Minimal checks for required fields; HTML5 also enforces constraints
    if (!data.get('name') || !data.get('email') || !data.get('service')) return false;
    return true;
  };

  // Attach submit handler purely for UI feedback (no network calls here)
  form.addEventListener('submit', (e) => {
    e.preventDefault();                                       // Prevent actual submission

    const data = new FormData(form);                          // Gather current field values
    status.textContent = 'Validating…';                       // Update live region for SR users

    // Simulate validation delay to show animation affordances
    setTimeout(() => {
      if (!validate(data)) {
        status.textContent = 'Please fill the required fields (Name, Email, Service).';
        flash(status, 'is-error');                            // Trigger error animation
        // Also highlight missing fields for a11y and clarity
        ['name', 'email', 'service'].forEach((key) => {
          const field = form.elements[key];
          if (field && !data.get(key)) flash(field.closest('label') || field, 'shake', 600);
        });
        return;
      }

      // On success we fake a "sent" state; integrate real submission later
      status.textContent = 'Looks good! Ready to send…';
      flash(status, 'is-ok');                                 // Trigger success animation
      // Optional: reset after a short celebratory animation
      setTimeout(() => form.reset(), 900);
    }, 300);
  });
})();

/* ---------- 5) Minimal CSS-in-JS for feedback animations (optional) ----------
   The following <style> block is injected to ensure the JS demo works
   even if the main CSS omitted these classes. Remove if redundant. */
(() => {
  const css = `
  /* Status flashes for success/error messages */
  #quoteStatus.is-ok { animation: pulse-ok 800ms ease; color: var(--highlight, #0074e4); }
  #quoteStatus.is-error { animation: pulse-err 800ms ease; color: #ff6b6b; }
  @keyframes pulse-ok { 0%{transform:scale(1)} 40%{transform:scale(1.03)} 100%{transform:scale(1)} }
  @keyframes pulse-err { 0%{transform:scale(1)} 40%{transform:scale(0.98)} 100%{transform:scale(1)} }
  /* Shake effect for invalid fields */
  .shake { animation: shake 420ms cubic-bezier(.36,.07,.19,.97) both; }
  @keyframes shake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-4px); }
    40%, 60% { transform: translateX(4px); }
  }`;
  const style = document.createElement('style');  // Create a new <style> element at runtime
  style.textContent = css;                        // Inject our minimal animation rules
  document.head.appendChild(style);               // Append to <head> so classes take effect
})();

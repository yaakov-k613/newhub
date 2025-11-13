// ==============================================
// Epic Mind Media — Frontend JS (UI only, no Firebase)
// Features:
//  1) Mobile navigation toggling (ARIA-compliant)
//  2) Smooth in-page scrolling + focus management
//  3) Dynamic year in footer
//  4) Form feedback animations and basic validation
//  5) Header scroll fade (.is-scrolled)
//  6) Hero video plays once and freezes on final frame
// ==============================================

/* ---------- Helpers ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);                 // Single element
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));  // NodeList → Array

/* ---------- 1) Mobile Navigation Toggling ---------- */
(() => {
  const toggle = $('.nav-toggle');           // <button aria-controls="primary-nav">
  const nav    = $('#primary-nav');          // Off-canvas/inline nav

  if (!toggle || !nav) return;
  const OPEN = 'open';

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle(OPEN);              // Toggle CSS state
    toggle.setAttribute('aria-expanded', String(isOpen));   // Update ARIA
  });

  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    nav.classList.remove(OPEN);
    toggle.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains(OPEN)) {
      nav.classList.remove(OPEN);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
})();

/* ---------- 2) Smooth In-Page Scrolling + Focus ---------- */
(() => {
  const anchors = $$('a[href^="#"]');

  anchors.forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;

      const target = $(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        const hadTabindex = target.hasAttribute('tabindex');
        if (!hadTabindex) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        // Clean up temporary tabindex to keep DOM tidy
        setTimeout(() => { if (!hadTabindex && target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex'); }, 1000);
      }, 300);
    });
  });
})();

/* ---------- 3) Dynamic Year in Footer ---------- */
(() => {
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();

/* ---------- 4) Form Feedback Animations ---------- */
(() => {
  const form   = $('#quoteForm');
  const status = $('#quoteStatus');
  if (!form || !status) return;

  const flash = (el, cls, ms = 1200) => { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };

  const validate = (data) => Boolean(data.get('name') && data.get('email') && data.get('service'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    status.textContent = 'Validating…';

    setTimeout(() => {
      if (!validate(data)) {
        status.textContent = 'Please fill the required fields (Name, Email, Service).';
        flash(status, 'is-error');
        ['name','email','service'].forEach((key) => {
          const field = form.elements[key];
          if (field && !data.get(key)) flash(field.closest('label') || field, 'shake', 600);
        });
        return;
      }
      status.textContent = 'Looks good! Ready to send…';
      flash(status, 'is-ok');
      setTimeout(() => form.reset(), 900);
    }, 300);
  });
})();

/* ---------- 5) Inline CSS for Feedback Animations (safety) ---------- */
(() => {
  const css = `
    #quoteStatus.is-ok { animation: pulse-ok 800ms ease; color: var(--highlight, #0074e4); }
    #quoteStatus.is-error { animation: pulse-err 800ms ease; color: #ff6b6b; }
    @keyframes pulse-ok { 0%{transform:scale(1)} 40%{transform:scale(1.03)} 100%{transform:scale(1)} }
    @keyframes pulse-err { 0%{transform:scale(1)} 40%{transform:scale(0.98)} 100%{transform:scale(1)} }
    .shake { animation: shake 420ms cubic-bezier(.36,.07,.19,.97) both; }
    @keyframes shake { 10%,90%{transform:translateX(-1px)} 20%,80%{transform:translateX(2px)} 30%,50%,70%{transform:translateX(-4px)} 40%,60%{transform:translateX(4px)} }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ---------- 6) Header Scroll Fade (.is-scrolled) ---------- */
(() => {
  const header = document.querySelector('.header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 60);
  onScroll();                        // Initialize on load
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ---------- 7) Hero Video: Play Once + Freeze on Final Frame ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const heroVideo = document.querySelector('.hero__video');
  if (!heroVideo) return;

  heroVideo.loop = false; // Ensure it does not loop

  // Safari/iOS can be finicky about setting currentTime at 'ended'
  heroVideo.addEventListener('ended', () => {
    heroVideo.pause();
    const d = heroVideo.duration || 0;
    // Offset a few hundredths to reliably display the last frame on all engines
    heroVideo.currentTime = Math.max(0, d - 0.05);
  });
});

// HERO: reveal overlay after video ends (with cinematic delay + solid fallbacks)
document.addEventListener('DOMContentLoaded', () => {
  const video = document.querySelector('.hero__video');
  const overlay = document.querySelector('.hero__content');
  if (!video || !overlay) return;

   const DELAY_MS = 1000;        // cinematic pause after end

  const TIMEOUT_MS = 10000;     // absolute safety reveal
  
  const showOverlay = () => {
    overlay.classList.remove('is-hidden');
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
  };

  const reveal = () => setTimeout(showOverlay, DELAY_MS);

  // Primary: on natural end
  video.addEventListener('ended', reveal, { once: true });

  // If metadata is ready and duration is tiny (short clip), still reveal after end
  video.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(video.duration) && video.duration < 1.0) setTimeout(reveal, 500);
  }, { once: true });

  // Try autoplay; if blocked, we still have safety timer
  video.play?.().catch(() => { /* fallback timer handles it */ });

  // Safety: reveal no matter what after TIMEOUT_MS
  const safety = setTimeout(showOverlay, TIMEOUT_MS);
  overlay.addEventListener('transitionstart', () => clearTimeout(safety), { once: true });

  // Error fallback
  video.addEventListener('error', () => reveal(), { once: true });
});


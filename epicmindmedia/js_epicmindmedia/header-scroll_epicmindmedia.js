// ================= HEADER SCROLL SCRIPT =================
(function () {
  // Select the header element
  const header = document.querySelector('.header');
  if (!header) return;

  let ticking = false;

  // Function to toggle .is-scrolled class
  function onScroll() {
    const scrolled = window.scrollY > 12; // threshold for activation
    header.classList.toggle('is-scrolled', scrolled);
    ticking = false;
  }

  // Scroll listener (optimized with requestAnimationFrame)
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );

  // Run once at page load (e.g., refresh mid-scroll)
  onScroll();

  const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
toggle?.addEventListener('click', () => nav.classList.toggle('nav--open'));

})();
// ================= END HEADER SCROLL SCRIPT =================
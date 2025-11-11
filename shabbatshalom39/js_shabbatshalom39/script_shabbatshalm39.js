// script.js
document.addEventListener("DOMContentLoaded", () => {
  // Mobile nav toggle
  const nav = document.querySelector(".main-nav");
  const toggle = document.querySelector(".nav-toggle");
  toggle.addEventListener("click", () => {
    nav.classList.toggle("show");
  });

  // Smooth scroll for nav links
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId.startsWith("#")) {
        e.preventDefault();
        nav.classList.remove("show");
        document.querySelector(targetId).scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector(".faq-question");
    btn.addEventListener("click", () => {
      item.classList.toggle("open");
    });
  });

  // Set current year
  document.getElementById("year").textContent = new Date().getFullYear();
});

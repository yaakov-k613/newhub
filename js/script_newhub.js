document.addEventListener("DOMContentLoaded", () => {
  const exploreBtn = document.getElementById("exploreBtn");
  const categoriesSection = document.getElementById("categories");

  if (exploreBtn && categoriesSection) {
    exploreBtn.addEventListener("click", () => {
      categoriesSection.scrollIntoView({ behavior: "smooth" });
    });
  }
});

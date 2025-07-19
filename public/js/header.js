document.addEventListener("DOMContentLoaded", function () {
  const navSearch = document.getElementById("nav-search");
  const menuBtn = document.querySelector(".navbar-toggler");
  const navLinks = document.getElementById("navbarNav");

  navSearch.addEventListener("click", (e) => {
    e.stopPropagation();
    navSearch.classList.toggle("open");
    if (navSearch.classList.contains("open")) {
      navSearch.querySelector("input").focus();
    }
  });

  navSearch.querySelector("input").addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", (e) => {
    const isClickInsideNavbar =
      navLinks.contains(e.target) ||
      menuBtn.contains(e.target) ||
      navSearch.contains(e.target);
    if (!isClickInsideNavbar && navLinks.classList.contains("show")) {
      menuBtn.click();
    }
  });
});

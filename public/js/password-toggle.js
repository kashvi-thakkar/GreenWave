document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.querySelector(".toggle-password");
    if (togglePassword) {
      togglePassword.addEventListener("click", function () {
        const password = document.querySelector("#password");
        const type = password.getAttribute("type") === "password" ? "text" : "password";
        password.setAttribute("type", type);
        this.classList.toggle("fa-eye");
        this.classList.toggle("fa-eye-slash");
      });
    }
  });
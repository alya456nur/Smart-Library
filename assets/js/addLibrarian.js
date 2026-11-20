document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addLibrarianForm");
  if (!form) return;
  
  // ========== EMAIL VALIDATION FUNCTION ==========
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  // ==============================================

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fname = document.getElementById("fname").value.trim();
    const lname = document.getElementById("lname").value.trim();
    const gender = document.getElementById("gender").value;
    const contact = document.getElementById("contact").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!fname || !lname || !gender || !contact || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    // ========== EMAIL FORMAT CHECK ==========
    if (!isValidEmail(email)) {
      alert("Invalid email format. Please enter a valid email address (e.g., example@domain.com).");
      return;
    }
    // ==============================================

    try {
      const res = await fetch("http://127.0.0.1:3000/api/admin/librarians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fname, lname, gender, contact, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.message.includes("Email already exists")) {
          alert("Email already exists. Please use a different email address.");
        } else if (res.status === 400 && data.message.includes("Invalid email format")) {
          alert("Invalid email format. Please enter a valid email.");
        } else {
          alert(data.message || "Failed to add librarian");
        }
        return;
      }

      alert("Librarian added successfully!");
      window.location.href = "manageLibrarian.html";

    } catch (err) {
      console.error(err);
      alert("Server error while adding librarian");
    }
  });
});

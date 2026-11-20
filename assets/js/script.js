// Global variable to hold current session user
window.CURRENT_USER = null;

// Function to fetch session user from server (ADMIN SIDE)
window.getSessionUser = async function() {
  if (window.CURRENT_USER) return window.CURRENT_USER; // already loaded

  try {
    const res = await fetch("http://127.0.0.1:3000/admin-session", {
      credentials: "include" // important to send cookies
    });

    const data = await res.json();

    if (!data.loggedIn) {
      window.CURRENT_USER = null;
      window.location.href = "../admin/adminLogin.html"; // redirect if not logged in
      return null;
    }

    // ✅ admin-session returns librarian
    window.CURRENT_USER = data.librarian;
    return data.librarian;

  } catch (err) {
    console.error("Session check failed:", err);
    window.location.href = "../admin/adminLogin.html"; // fallback redirect
    return null;
  }
};

// Automatically check session on page load
document.addEventListener("DOMContentLoaded", async () => {
  await window.getSessionUser(); // ensures session exists or redirects
});


// Wait until DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebarCollapse");

    toggleBtn.addEventListener("click", function() {
        sidebar.classList.toggle("active");
    });
});



document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();

  try {
    await fetch("http://127.0.0.1:3000/logout", {
      method: "GET",
      credentials: "include" // 🔑 send session cookie
    });

    // Redirect AFTER session is destroyed
    window.location.href = "../admin/adminLogin.html";
  } catch (err) {
    console.error("Logout failed:", err);
    alert("Failed to logout");
  }
});
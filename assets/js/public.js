// Global variable to hold current session user
window.CURRENT_USER = null;

/* -----------------------------------------
   Helper: Safe set text
------------------------------------------ */
function setTextSafe(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* -----------------------------------------
   1) Get session user from server
------------------------------------------ */
window.getSessionUser = async function () {
  if (window.CURRENT_USER) return window.CURRENT_USER;

  try {
    const res = await fetch("http://127.0.0.1:3000/api/check_session", {
      credentials: "include"
    });

    const data = await res.json();

    if (!data.loggedIn || !data.user) {
      window.CURRENT_USER = null;
      window.location.href = "../user/login.html";
      return null;
    }

    window.CURRENT_USER = data.user;
    return data.user;
  } catch (err) {
    console.error("Session check failed:", err);
    window.location.href = "../user/login.html";
    return null;
  }
};

/* -----------------------------------------
   2) Sync navbar user text (Demo -> real user)
   Runs on every page that has those IDs
------------------------------------------ */
async function syncNavbarUser() {
  const user = await window.getSessionUser();
  if (!user) return;

  // Your session object in server.js was:
  // req.session.user = { id, name, email }
  // So we use user.name and user.email

  setTextSafe("navUserName", user.name || "User");
  setTextSafe("navUserEmail", user.email || "-");
}

/* -----------------------------------------
   3) Logout button
------------------------------------------ */
function initLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return; // prevents errors on pages without logout button

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      await fetch("http://127.0.0.1:3000/logout", {
        method: "GET",
        credentials: "include"
      });

      window.CURRENT_USER = null;
      window.location.href = "../user/login.html";
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to logout");
    }
  });
}

/* -----------------------------------------
   4) Auto sync overdue fines (optional)
------------------------------------------ */
async function autoSyncOverdueFines() {
  const user = await window.getSessionUser();
  if (!user) return;

  fetch("http://127.0.0.1:3000/api/sync-overdue-fines", {
    method: "POST",
    credentials: "include"
  }).catch(err => console.error("Fine sync failed", err));
}

/* -----------------------------------------
   Run
------------------------------------------ */
document.addEventListener("DOMContentLoaded", async () => {
  await syncNavbarUser();
  initLogout();
  // comment this if you don't want it on every page:
  await autoSyncOverdueFines();
});

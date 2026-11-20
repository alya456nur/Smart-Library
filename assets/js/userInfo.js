document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Admin session check (redirect handled by public.js)
  const admin = await window.getSessionUser();
  if (!admin) return;

  // ✅ Get target userId from URL
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");

  if (!userId) {
    alert("Missing userId in URL. Use: userInfo.html?userId=U00123");
    return;
  }

  // Load user profile + stats
  await loadUserProfile(userId);
  await loadUserStats(userId);
});

/* ===============================
   LOAD USER PROFILE
================================ */
async function loadUserProfile(userId) {
  try {
    const res = await fetch(`http://127.0.0.1:3000/api/profile/${userId}`, {
      credentials: "include"
    });

    if (!res.ok) {
      alert("User not found");
      return;
    }

    const data = await res.json();

    document.getElementById("userId").value = userId;
    document.getElementById("firstName").value = data.firstName || "";
    document.getElementById("lastName").value = data.lastName || "";
    document.getElementById("gender").value = data.gender || "";
    document.getElementById("contact").value = data.contact || "";
    document.getElementById("email").value = data.email || "";
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

/* ===============================
   LOAD USER STATS (ADMIN VIEW)
   - borrowed count
   - favourites count
   - pending request count
================================ */
async function loadUserStats(userId) {
  try {
    const res = await fetch(`http://127.0.0.1:3000/api/admin/user-stats/${userId}`, {
      credentials: "include"
    });

    if (!res.ok) return;

    const stats = await res.json();

    document.getElementById("borrowCount").textContent = stats.borrowed || 0;
    document.getElementById("favCount").textContent = stats.favourites || 0;
    document.getElementById("pendingCount").textContent = stats.pending || 0;

  } catch (err) {
    console.error("Stats load error:", err);
  }
}

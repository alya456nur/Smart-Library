

document.addEventListener("DOMContentLoaded", async () => {
  user = await window.getSessionUser();
});

/* =========================================================
   SUMMARY CARDS (DATABASE VERSION)
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  user = await window.getSessionUser();
  if (!user) return; // not logged in

  console.log("Current user ID:", user.id); 

  fetch(`http://127.0.0.1:3000/api/summary/user/${user.id}`)
    .then(res => res.json())
    .then(updateSummaryCards)
    .catch(err => console.error("Summary load error:", err));
});

/* ==============================
   UPDATE UI SAFELY
============================== */
function updateSummaryCards(data) {
  setText("sumAvailable", data.availableBooks);
  setText("sumBorrowed", data.currentlyBorrowed);
  setText("sumOverdue", data.overdueBooks);
  setText("sumFines", `RM${Number(data.currentFines).toFixed(2)}`);

  setText("cardCurrentlyBorrowed", data.currentlyBorrowed);
  setText("cardOverdueBooks", data.overdueBooks);
  setText("cardCurrentFines", `RM${Number(data.currentFines).toFixed(2)}`);

  setText("cardPendingRequests", data.pendingRequests);
  setText("cardApprovedRequests", data.approvedRequests);
  setText("cardRejectedRequests", data.rejectedRequests);
}

/* ==============================
   SAFE DOM SETTER
============================== */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el !== null) el.textContent = value;
}

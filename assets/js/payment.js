document.addEventListener("DOMContentLoaded", () => {

  const raw = localStorage.getItem("selectedFine");

  // Prevent blink / redirect loop
  if (!raw) {
    document.body.innerHTML = `
      <div style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:Poppins,sans-serif;">
        <div style="
          background:#fff;
          border:1px solid rgba(0,0,0,.1);
          border-radius:14px;
          padding:18px;
          max-width:420px;
          width:92%;">
          <h5>No fine selected</h5>
          <p style="color:#666;">
            Please return to the Fines page and click <strong>Pay Now</strong>.
          </p>
          <a href="fines.html"
             style="
               display:inline-block;
               background:#4b56ff;
               color:#fff;
               padding:10px 14px;
               border-radius:10px;
               text-decoration:none;
               font-weight:600;">
            Back to Fines
          </a>
        </div>
      </div>
    `;
    return;
  }

  const fine = JSON.parse(raw);

  const bookTitleEl = document.getElementById("bookTitle");
  const amountDueEl = document.getElementById("amountDue");
  const issuedDateEl = document.getElementById("issuedDate");
  const payBtn = document.getElementById("payBtn");
  const methodCards = document.querySelectorAll(".method-card");

  let selectedMethod = "Card";
  const rm = (n) => `RM${Number(n).toFixed(2)}`;

  bookTitleEl.textContent = fine.title || "-";
  amountDueEl.textContent = rm(fine.amount || 0);
  issuedDateEl.textContent = fine.issuedDate
    ? new Date(fine.issuedDate).toLocaleDateString("en-MY")
    : "-";

  payBtn.textContent = `Pay ${rm(fine.amount || 0)}`;

  methodCards.forEach(card => {
    card.addEventListener("click", () => {
      methodCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedMethod = card.dataset.method;
    });
  });

  payBtn.addEventListener("click", () => {

    const paymentHistory = JSON.parse(
      localStorage.getItem("paymentHistory") || "[]"
    );

    paymentHistory.push({
      ...fine,
      method: selectedMethod,
      paidDate: new Date().toISOString(),
      receiptNo: `RCPT-${Date.now()}`,
      txnId: `TXN-${Math.random().toString(16).slice(2,8).toUpperCase()}`
    });

    localStorage.setItem(
      "paymentHistory",
      JSON.stringify(paymentHistory)
    );

    localStorage.removeItem("selectedFine");

    window.location.href = "fines.html";
  });
});
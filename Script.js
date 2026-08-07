/* ==========================================================================
   1. CONFIG
   Tweak these to change how sparkly the background is, and to plug in
   your own backend later (see section 4).
   ========================================================================== */

const SPARKLE_COUNT = 45;          // how many sparkles to scatter
const STAR_RATIO = 0.15;           // fraction of sparkles that render as stars
const RSVP_ENDPOINT = null;        // e.g. your Supabase/Firebase URL, once ready
const RSVP_STORAGE_KEY = "montessaRsvpResponses"; // used by dashboard.html


/* ==========================================================================
   2. SPARKLE GENERATION
   Scatters twinkling dots/stars across the page at random positions,
   sizes, and animation delays so they don't blink in sync.
   ========================================================================== */

function createSparkles() {
  const layer = document.getElementById("sparkleLayer");
  if (!layer) return;

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const sparkle = document.createElement("div");
    const isStar = Math.random() < STAR_RATIO;

    sparkle.className = isStar ? "sparkle sparkle--star" : "sparkle";

    // Random position anywhere in the viewport
    sparkle.style.top = `${Math.random() * 100}%`;
    sparkle.style.left = `${Math.random() * 100}%`;

    // Random timing so sparkles twinkle independently
    sparkle.style.animationDelay = `${Math.random() * 2.6}s`;
    sparkle.style.animationDuration = `${2 + Math.random() * 2}s`;

    layer.appendChild(sparkle);
  }
}


/* ==========================================================================
   3. RSVP HANDLING
   Wires up the Accept / Decline buttons and shows feedback to the guest.
   ========================================================================== */

function initRsvpButtons() {
  const acceptBtn = document.getElementById("acceptBtn");
  const declineBtn = document.getElementById("declineBtn");
  const nameInput = document.getElementById("guestName");
  const status = document.getElementById("rsvpStatus");

  if (!acceptBtn || !declineBtn || !nameInput || !status) return;

  acceptBtn.addEventListener("click", () => handleRsvp("accepted", nameInput, status));
  declineBtn.addEventListener("click", () => handleRsvp("declined", nameInput, status));

  // Clear the "please enter your name" highlight as soon as they start typing
  nameInput.addEventListener("input", () => nameInput.classList.remove("is-invalid"));
}

function handleRsvp(response, nameInput, statusEl) {
  const guestName = nameInput.value.trim();

  // Require a name so every response is tied to a real person
  if (!guestName) {
    nameInput.classList.add("is-invalid");
    statusEl.textContent = "Please enter your name first.";
    statusEl.classList.remove("is-declined");
    nameInput.focus();
    return;
  }

  const isAccepted = response === "accepted";

  statusEl.textContent = isAccepted
    ? `Wonderful, ${guestName} — we can't wait to celebrate with you!`
    : `Thanks for letting us know, ${guestName}. You'll be missed.`;

  statusEl.classList.toggle("is-declined", !isAccepted);

  saveRsvpLocally(guestName, response);
  sendRsvpToServer(guestName, response);
}


/* ==========================================================================
   4. SAVING THE RESPONSE FOR THE DASHBOARD
   Stores each response in the browser (localStorage) so dashboard.html,
   opened in the same browser, can list who has responded. This works
   without any backend — once you connect a real one (see section 5),
   the dashboard can be switched to read from that instead.
   ========================================================================== */

function saveRsvpLocally(guestName, response) {
  const existing = JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY) || "[]");

  existing.push({
    name: guestName,
    response: response,
    respondedAt: new Date().toISOString()
  });

  localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(existing));
}


/* ==========================================================================
   5. SENDING THE RESPONSE TO YOUR OWN BACKEND (optional)
   This is the hook that notifies you when a guest responds from anywhere,
   not just this browser. Right now it does nothing unless RSVP_ENDPOINT
   is set — plug in your real backend (Supabase, Firebase, a webhook,
   etc.) inside the fetch() call below.
   ========================================================================== */

async function sendRsvpToServer(guestName, response) {
  console.log(`RSVP received: ${guestName} ${response}`);

  if (!RSVP_ENDPOINT) return; // no backend configured yet

  try {
    await fetch(RSVP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guest: guestName,
        response: response,
        respondedAt: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error("Could not send RSVP:", error);
  }
}


/* ==========================================================================
   6. INIT
   Runs once the page has loaded.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  createSparkles();
  initRsvpButtons();
});

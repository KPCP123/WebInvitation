import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ==========================================================================
   1. CONFIG
   Paste your project's URL and anon key from Supabase (Project Settings
   > API). Both are safe to use in front-end code — that's what they're
   designed for.
   ========================================================================== */

const SUPABASE_URL = "https://bfbogsrgwzvlubnoglwn.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmYm9nc3Jnd3p2bHVibm9nbHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzczMDksImV4cCI6MjEwMTY1MzMwOX0.fyokAljl9tBqxjCaP0rEclzD4A-lnSKOoPgDXBeYM1I";

const SPARKLE_COUNT = 45;          // how many sparkles to scatter
const STAR_RATIO = 0.15;           // fraction of sparkles that render as stars
const RSVP_STORAGE_KEY = "montessaRsvpResponses"; // local fallback if Supabase isn't set up yet

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


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

  acceptBtn.addEventListener("click", () => handleRsvp("accepted", nameInput, status, acceptBtn, declineBtn));
  declineBtn.addEventListener("click", () => handleRsvp("declined", nameInput, status, acceptBtn, declineBtn));

  // Clear the "please enter your name" highlight as soon as they start typing
  nameInput.addEventListener("input", () => nameInput.classList.remove("is-invalid"));
}

async function handleRsvp(response, nameInput, statusEl, acceptBtn, declineBtn) {
  const guestName = nameInput.value.trim();

  // Require a name so every response is tied to a real person
  if (!guestName) {
    nameInput.classList.add("is-invalid");
    statusEl.textContent = "Please enter your name first.";
    statusEl.classList.remove("is-declined");
    nameInput.focus();
    return;
  }

  acceptBtn.disabled = true;
  declineBtn.disabled = true;

  const isAccepted = response === "accepted";

  saveRsvpLocally(guestName, response);
  const { error } = await sendRsvpToSupabase(guestName, response);

  acceptBtn.disabled = false;
  declineBtn.disabled = false;

  if (error) {
    statusEl.textContent = "Something went wrong sending your RSVP. Please try again.";
    statusEl.classList.remove("is-declined");
    return;
  }

  statusEl.textContent = isAccepted
    ? `Wonderful, ${guestName} — we can't wait to celebrate with you!`
    : `Thanks for letting us know, ${guestName}. You'll be missed.`;

  statusEl.classList.toggle("is-declined", !isAccepted);
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
   5. SENDING THE RESPONSE TO SUPABASE
   Inserts a row into the "guests" table so the dashboard can read it from
   any device, not just this browser.
   ========================================================================== */

async function sendRsvpToSupabase(guestName, response) {
  const { error } = await supabase
    .from("guests")
    .insert([{ name: guestName, response: response }]);

  if (error) {
    console.error("Could not send RSVP to Supabase:", error);
  }

  return { error };
}


/* ==========================================================================
   6. INIT
   Runs once the page has loaded.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  createSparkles();
  initRsvpButtons();
});
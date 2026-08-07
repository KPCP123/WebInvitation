import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ==========================================================================
   1. CONFIG
   Must match the values in script.js — same Supabase project.
   ========================================================================== */

const SUPABASE_URL = "https://bfbogsrgwzvlubnoglwn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmYm9nc3Jnd3p2bHVibm9nbHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzczMDksImV4cCI6MjEwMTY1MzMwOX0.fyokAljl9tBqxjCaP0rEclzD4A-lnSKOoPgDXBeYM1I";
const RSVP_STORAGE_KEY = "montessaRsvpResponses"; // local fallback if Supabase isn't set up yet

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentFilter = "all";   // "all" | "accepted" | "declined"
let searchTerm = "";


/* ==========================================================================
   2. READING RESPONSES
   Pulls from Supabase so the dashboard reflects RSVPs from every guest,
   not just this browser. Falls back to localStorage if Supabase isn't
   configured yet, so the dashboard still works before you set it up.
   ========================================================================== */

async function getResponses() {
  const { data, error } = await supabase
    .from("guests")
    .select("name, response, responded_at")
    .order("responded_at", { ascending: false });

  if (error) {
    console.error("Could not load responses from Supabase, using local data:", error);
    return JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY) || "[]");
  }

  // Normalize Supabase's snake_case column to match the rest of this file
  return data.map(row => ({
    name: row.name,
    response: row.response,
    respondedAt: row.responded_at
  }));
}


/* ==========================================================================
   3. RENDERING
   Filters, sorts (most recent first), and draws the summary + table.
   ========================================================================== */

async function render() {
  const all = await getResponses();

  renderSummary(all);
  renderTable(all);
}

function renderSummary(all) {
  const accepted = all.filter(r => r.response === "accepted").length;
  const declined = all.filter(r => r.response === "declined").length;

  document.getElementById("totalCount").textContent = all.length;
  document.getElementById("acceptedCount").textContent = accepted;
  document.getElementById("declinedCount").textContent = declined;
}

function renderTable(all) {
  const tbody = document.getElementById("guestListBody");
  const emptyState = document.getElementById("emptyState");

  const filtered = all
    .filter(r => currentFilter === "all" || r.response === currentFilter)
    .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt));

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.add("is-visible");
    emptyState.textContent = all.length === 0
      ? "No responses yet — once a guest accepts or declines on the invite page, they'll show up here."
      : "No responses match your search or filter.";
    return;
  }

  emptyState.classList.remove("is-visible");

  filtered.forEach(entry => {
    const row = document.createElement("tr");

    const badgeClass = entry.response === "accepted" ? "badge--accepted" : "badge--declined";
    const badgeLabel = entry.response === "accepted" ? "Accepted" : "Declined";

    row.innerHTML = `
      <td class="guest-name">${escapeHtml(entry.name)}</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td class="guest-time">${formatTime(entry.respondedAt)}</td>
    `;

    tbody.appendChild(row);
  });
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}


/* ==========================================================================
   4. TOOLBAR: search + filter buttons
   ========================================================================== */

function initToolbar() {
  const searchInput = document.getElementById("searchInput");
  const filterButtons = document.querySelectorAll(".filter-btn");

  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    render();
  });

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentFilter = btn.dataset.filter;
      render();
    });
  });
}


/* ==========================================================================
   5. FOOTER ACTIONS: refresh + clear all
   ========================================================================== */

function initFooterActions() {
  document.getElementById("refreshBtn").addEventListener("click", render);

  document.getElementById("clearBtn").addEventListener("click", async () => {
    const confirmed = confirm("Clear all saved RSVP responses? This can't be undone.");
    if (!confirmed) return;

    const { error } = await supabase
      .from("guests")
      .delete()
      .not("id", "is", null); // matches every row

    if (error) {
      console.error("Could not clear responses from Supabase:", error);
    }

    localStorage.removeItem(RSVP_STORAGE_KEY);
    render();
  });
}


/* ==========================================================================
   6. INIT
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initToolbar();
  initFooterActions();
  render();
});
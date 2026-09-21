/**
 * Simple analytics/event tracker (privacy-friendly, no third-party)
 * Stores events in sessionStorage for session analysis
 */

const EVENTS_KEY = "evoting_events";

function getEvents() {
  try {
    return JSON.parse(sessionStorage.getItem(EVENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function trackEvent(eventName, properties = {}) {
  try {
    const events = getEvents();
    events.push({
      event: eventName,
      properties,
      timestamp: Date.now(),
      path: window.location.pathname,
    });
    // Keep only last 100 events
    const trimmed = events.slice(-100);
    sessionStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function trackPageView(page) {
  trackEvent("page_view", { page });
}

export function trackVote(electionId, positionCount) {
  trackEvent("vote_cast", { election_id: electionId, positions: positionCount });
}

export function trackLogin(role) {
  trackEvent("login", { role });
}

export function getSessionEvents() {
  return getEvents();
}

export function clearEvents() {
  sessionStorage.removeItem(EVENTS_KEY);
}
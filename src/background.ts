const SESSION_ALARM = "wallet-session-cleanup";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SESSION_ALARM, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SESSION_ALARM) {
    return;
  }
  chrome.storage.session?.set({ hasOpenSession: false }).catch(() => {
    // Ignore unsupported storage.session and rely on popup lock checks.
  });
});
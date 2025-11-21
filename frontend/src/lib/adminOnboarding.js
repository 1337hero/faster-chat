const ADMIN_ONBOARDING_FLAG = "fc_admin_connections_onboarding_seen";

export const hasSeenAdminConnectionsOnboarding = (userId) => {
  if (!userId) return false;

  const raw = localStorage.getItem(ADMIN_ONBOARDING_FLAG);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.[userId]);
  } catch {
    return false;
  }
};

export const markAdminConnectionsOnboardingSeen = (userId) => {
  if (!userId) return;

  const raw = localStorage.getItem(ADMIN_ONBOARDING_FLAG);

  try {
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[userId] = true;
    localStorage.setItem(ADMIN_ONBOARDING_FLAG, JSON.stringify(parsed));
  } catch {
    localStorage.setItem(ADMIN_ONBOARDING_FLAG, JSON.stringify({ [userId]: true }));
  }
};

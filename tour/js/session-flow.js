export async function restoreStoredSessionView(state, storedSession, showPendingTrip) {
  const status = state?.session?.status || null;
  if (status !== 'pending' || !storedSession?.joinToken) return status;

  const label = state.session.tripDisplayName || state.session.vehiclePlate;
  await showPendingTrip(label, storedSession.joinToken);
  return status;
}

export function isPendingHistoryEntry(historyState) {
  return historyState?.tourView === 'pending';
}

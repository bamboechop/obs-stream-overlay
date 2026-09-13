export function emptyState(connected = false) {
  return { connected, raceData: null, playerCpInfo: null, vehicleType: null, progress: null };
}

const count = value => Number.isSafeInteger(value) && value >= 0;

export function deriveProgress(race, player) {
  if (!race || !player) {
    return null;
  }
  const configured = race.cpsToFinish / race.lapsNb;
  const gatesPerLap = Number.isSafeInteger(configured) && configured > 0
    ? configured
    : race.cpCount + 1;
  return {
    gatesPerLap,
    currentLap: player.isFinished ? race.lapsNb : Math.min(race.lapsNb, Math.floor(player.cpCount / gatesPerLap) + 1),
    currentCp: player.isFinished ? race.cpCount : Math.min(race.cpCount, player.cpCount % gatesPerLap),
  };
}

// Project only the fields consumed by the overlay; physics ticks do not leak through.
export function reduceSnapshot(state, message) {
  if (message?.type !== 'snapshot') {
    return state;
  }
  const data = message.data?.available === true ? message.data : null;
  const next = { ...state };
  switch (message.source) {
    case 'race_data':
      next.raceData = data && count(data.cpCount) && count(data.cpsToFinish) && count(data.lapsNb) && data.lapsNb > 0
        ? { cpCount: data.cpCount, cpsToFinish: data.cpsToFinish, lapsNb: data.lapsNb }
        : null;
      break;
    case 'player_cp_info': {
      const player = Array.isArray(data?.players) ? data.players.find(p => p?.isLocalPlayer === true) : null;
      next.playerCpInfo = player && count(player.cpCount) && typeof player.playerIsRacing === 'boolean' && typeof player.isFinished === 'boolean'
        ? { cpCount: player.cpCount, isLocalPlayer: true, playerIsRacing: player.playerIsRacing, isFinished: player.isFinished }
        : null;
      break;
    }
    case 'vehicle_state':
      next.vehicleType = typeof data?.vehicleState?.engine?.vehicleType === 'string' ? data.vehicleState.engine.vehicleType : null;
      break;
    default:
      return state;
  }
  next.progress = deriveProgress(next.raceData, next.playerCpInfo);
  return JSON.stringify(next) === JSON.stringify(state) ? state : next;
}

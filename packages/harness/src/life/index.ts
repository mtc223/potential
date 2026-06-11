// Life lifecycle + room transition (compression trigger)
export {
  exitRoom,
  advanceContext,
  RoomTransitionError,
  type RoomCompressorFn,
  type ExitRoomResult,
} from "./room-transition.js";
export {
  startLife,
  endLife,
  clearLife,
  hasResumableLife,
  type StartLifeParams,
} from "./lifecycle.js";

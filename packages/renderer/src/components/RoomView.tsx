import type { Room } from "@potential/shared";

interface RoomViewProps {
  room: Room;
}

/**
 * RoomView — renders the current room in 32px 3/4 top-down pixel art style.
 * Pokémon Gen 1/2 aesthetic. Placeholder until Phase 3.
 */
export function RoomView({ room }: RoomViewProps): JSX.Element {
  return (
    <div style={{ fontFamily: "monospace", padding: 16 }}>
      <h2>{room.label}</h2>
      <p>{room.description}</p>
      <small>Room #{room.sequenceIndex}</small>
    </div>
  );
}

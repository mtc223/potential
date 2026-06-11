import { useEffect, useState } from "react";
import { GAME_CONFIG } from "@potential/shared";

export interface DialogueBoxProps {
  speaker: string | null;
  text: string;
  /** Tap-to-complete then advance. */
  onAdvance: () => void;
  /** Called once per text as streaming starts (drives the bark synth). */
  onStreamStart?: (text: string) => void;
}

/**
 * Pokémon-style dialogue box: streaming text at the configured chars/sec,
 * click or Enter to complete, then to advance.
 */
export function DialogueBox({ speaker, text, onAdvance, onStreamStart }: DialogueBoxProps): JSX.Element {
  const [shown, setShown] = useState(0);
  const complete = shown >= text.length;

  useEffect(() => {
    setShown(0);
    onStreamStart?.(text);
    const interval = setInterval(
      () => {
        setShown((n) => {
          if (n >= text.length) {
            clearInterval(interval);
            return n;
          }
          return n + 1;
        });
      },
      1000 / GAME_CONFIG.conversation.streamingCharsPerSecond,
    );
    return () => { clearInterval(interval); };
  }, [text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Enter" || e.key === " " || e.key === "e") {
        e.preventDefault();
        if (!complete) setShown(text.length);
        else onAdvance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [complete, text, onAdvance]);

  return (
    <div
      onClick={() => { complete ? onAdvance() : setShown(text.length); }}
      style={{
        position: "relative",
        border: "3px solid #f2f2ee",
        outline: "3px solid #23213a",
        borderRadius: 6,
        background: "#2b2940",
        color: "#f2f2ee",
        padding: "10px 14px",
        fontFamily: "'Courier New', monospace",
        fontSize: 15,
        lineHeight: 1.5,
        minHeight: 56,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {speaker !== null && (
        <span
          style={{
            position: "absolute",
            top: -14,
            left: 10,
            background: "#23213a",
            border: "2px solid #f2f2ee",
            borderRadius: 4,
            padding: "0 8px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {speaker}
        </span>
      )}
      {text.slice(0, shown)}
      {complete && <span style={{ float: "right", animation: "none" }}>▼</span>}
    </div>
  );
}

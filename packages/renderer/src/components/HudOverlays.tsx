import { useEffect, useRef, useState } from "react";

/**
 * Top-band UI: inner monologue ticker + the only two visible stats in the
 * game (health red, hunger green). Nature/nurture never appear here —
 * they surface through the monologue text itself.
 */

export function MonologueTicker({ entries }: { entries: string[] }): JSX.Element {
  const latest = entries[entries.length - 1] ?? "";
  const [visible, setVisible] = useState(latest);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisible(latest);
    if (fadeTimer.current !== null) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => { setVisible(""); }, 9000);
    return () => {
      if (fadeTimer.current !== null) clearTimeout(fadeTimer.current);
    };
  }, [latest]);

  return (
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        fontStyle: "italic",
        color: "#bdb8d0",
        fontFamily: "'Courier New', monospace",
        fontSize: 14,
        padding: "0 12px",
      }}
      title={visible}
    >
      {visible}
    </div>
  );
}

export function StatBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}): JSX.Element {
  return (
    <div title={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#8d889f", fontFamily: "monospace" }}>{label}</span>
      <div
        style={{
          width: 72,
          height: 8,
          border: "2px solid #23213a",
          background: "#16141f",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            width: `${String(Math.round(Math.max(0, Math.min(1, value)) * 100))}%`,
            height: "100%",
            background: color,
            transition: "width 400ms",
          }}
        />
      </div>
    </div>
  );
}

export function PromptInput({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        maxLength={500}
        onChange={(e) => { setValue(e.target.value); }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && value.trim().length > 0) onSubmit(value.trim());
          if (e.key === "Escape") onCancel();
        }}
        style={{
          flex: 1,
          background: "#16141f",
          color: "#f2f2ee",
          border: "3px solid #f2f2ee",
          outline: "3px solid #23213a",
          borderRadius: 6,
          padding: "10px 12px",
          fontFamily: "'Courier New', monospace",
          fontSize: 15,
        }}
      />
      <button
        onClick={() => { if (value.trim().length > 0) onSubmit(value.trim()); }}
        style={buttonStyle}
      >
        Say
      </button>
      <button onClick={onCancel} style={buttonStyle}>
        Esc
      </button>
    </div>
  );
}

export const buttonStyle: React.CSSProperties = {
  background: "#2b2940",
  color: "#f2f2ee",
  border: "2px solid #f2f2ee",
  outline: "2px solid #23213a",
  borderRadius: 6,
  padding: "6px 14px",
  fontFamily: "'Courier New', monospace",
  fontSize: 13,
  cursor: "pointer",
};

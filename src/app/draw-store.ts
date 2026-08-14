"use client";

import { useSyncExternalStore } from "react";

export type Entry = {
  id: string;
  value: string;
  name?: string;
};

export type EntryMode = "csv" | "manual" | "numbers";

export type EventConfig = {
  name: string;
  winnerCount: number;
};

export type DrawState = {
  event: EventConfig | null;
  entries: Entry[];
  available: Entry[];
  winners: (Entry | null)[];
  current: Entry | null;
  isRolling: boolean;
  entryMode: EntryMode;
  manualText: string;
  numberTotal: number;
  fileName: string;
  message: string;
  error: string;
};

const storageKey = "lucky-draw-state-v2";

export const mockEntries: Entry[] = [
  { id: "demo-0142", value: "0142", name: "Maya Patel" },
  { id: "demo-0187", value: "0187", name: "Daniel Kim" },
  { id: "demo-0224", value: "0224", name: "Amina Yusuf" },
  { id: "demo-0291", value: "0291", name: "Leo Martins" },
  { id: "demo-0316", value: "0316", name: "Sofia Reyes" },
  { id: "demo-0388", value: "0388", name: "Noah Williams" },
  { id: "demo-0413", value: "0413", name: "Priya Nair" },
  { id: "demo-0479", value: "0479", name: "Omar Hassan" },
  { id: "demo-0521", value: "0521", name: "Eleanor Price" },
  { id: "demo-0576", value: "0576", name: "Mateo Silva" },
  { id: "demo-0634", value: "0634", name: "Hana Suzuki" },
  { id: "demo-0698", value: "0698", name: "Jonas Berg" },
  { id: "demo-0725", value: "0725", name: "Nadia Rahman" },
  { id: "demo-0782", value: "0782", name: "Lucas Moreno" },
  { id: "demo-0819", value: "0819", name: "Zara Ahmed" },
  { id: "demo-0863", value: "0863", name: "Theo Bennett" },
  { id: "demo-0914", value: "0914", name: "Mei Chen" },
  { id: "demo-0971", value: "0971", name: "Sam Okafor" },
  { id: "demo-1028", value: "1028", name: "Clara Fischer" },
  { id: "demo-1084", value: "1084", name: "Ibrahim Ali" },
  { id: "demo-1137", value: "1137", name: "Lena Kowalski" },
  { id: "demo-1195", value: "1195", name: "Ravi Menon" },
  { id: "demo-1246", value: "1246", name: "Amara Brooks" },
  { id: "demo-1302", value: "1302", name: "Nico Laurent" },
];

export const initialDrawState: DrawState = {
  event: null,
  entries: mockEntries,
  available: mockEntries,
  winners: [],
  current: null,
  isRolling: false,
  entryMode: "csv",
  manualText: "",
  numberTotal: 25,
  fileName: "Sample entries.csv",
  message: "24 entries ready to draw",
  error: "",
};

let memoryState = initialDrawState;
let storageLoaded = false;
let storageListening = false;
const listeners = new Set<() => void>();

function isStoredState(value: unknown): value is DrawState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<DrawState>;
  return (
    Array.isArray(state.entries) &&
    Array.isArray(state.available) &&
    Array.isArray(state.winners) &&
    typeof state.isRolling === "boolean" &&
    ["csv", "manual", "numbers"].includes(state.entryMode ?? "") &&
    typeof state.manualText === "string" &&
    typeof state.numberTotal === "number" &&
    typeof state.fileName === "string" &&
    typeof state.message === "string" &&
    typeof state.error === "string"
  );
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function loadStorage() {
  if (storageLoaded || typeof window === "undefined") {
    return;
  }

  storageLoaded = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isStoredState(parsed)) {
        memoryState = parsed;
      }
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!storageListening && typeof window !== "undefined") {
    storageListening = true;
    window.addEventListener("storage", (event) => {
      if (event.key !== storageKey || !event.newValue) {
        return;
      }

      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (isStoredState(parsed)) {
          memoryState = parsed;
          emitChange();
        }
      } catch {
        return;
      }
    });
  }

  return () => listeners.delete(listener);
}

function getSnapshot() {
  loadStorage();
  return memoryState;
}

function getServerSnapshot() {
  return initialDrawState;
}

function subscribeHydration() {
  return () => undefined;
}

function setStoredState(
  update: DrawState | ((current: DrawState) => DrawState),
) {
  loadStorage();
  memoryState =
    typeof update === "function" ? update(memoryState) : update;
  window.localStorage.setItem(storageKey, JSON.stringify(memoryState));
  emitChange();
}

export function useDrawStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  return { state, setState: setStoredState, hydrated };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current.trim());
  return cells;
}

export function parseEntriesCsv(csv: string) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("Add a header row and at least one entry.");
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/[\s_-]+/g, ""),
  );
  const numberIndex = headers.findIndex((header) =>
    ["number", "entry", "entrynumber"].includes(header),
  );
  const nameIndex = headers.findIndex((header) =>
    ["name", "fullname", "displayname"].includes(header),
  );

  if (numberIndex === -1) {
    throw new Error('The CSV needs a "number" column.');
  }

  const entries = lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line);
    const value = cells[numberIndex]?.trim();
    const name = nameIndex === -1 ? undefined : cells[nameIndex]?.trim();

    if (!value) {
      throw new Error(`Number is missing on row ${rowIndex + 2}.`);
    }

    return {
      id: `csv-${rowIndex}-${value}`,
      value,
      name: name || undefined,
    };
  });
  const uniqueNumbers = new Set(entries.map((entry) => entry.value));

  if (uniqueNumbers.size !== entries.length) {
    throw new Error("Every CSV number must be unique.");
  }

  return entries;
}

export function entriesFromText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((value, index) => ({
      id: `manual-${index}-${value}`,
      value,
    }));
}

export function numberedEntries(total: number) {
  return Array.from({ length: total }, (_, index) => ({
    id: `number-${index + 1}`,
    value: String(index + 1),
  }));
}

export function randomEntry(entries: Entry[], excludedId?: string) {
  if (entries.length === 0) {
    return null;
  }

  if (entries.length === 1) {
    return entries[0];
  }

  let selected = entries[Math.floor(Math.random() * entries.length)];
  while (selected.id === excludedId) {
    selected = entries[Math.floor(Math.random() * entries.length)];
  }
  return selected;
}

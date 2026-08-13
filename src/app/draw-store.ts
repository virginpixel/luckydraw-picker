"use client";

import { useSyncExternalStore } from "react";

export type Entrant = {
  bib: string;
  name?: string;
};

export type EventConfig = {
  name: string;
  winnerCount: number;
};

export type DrawState = {
  event: EventConfig | null;
  entrants: Entrant[];
  available: Entrant[];
  winners: (Entrant | null)[];
  current: Entrant | null;
  isRolling: boolean;
  fileName: string;
  message: string;
  error: string;
};

const storageKey = "bib-draw-state-v1";

export const mockEntrants: Entrant[] = [
  { bib: "0142", name: "Maya Patel" },
  { bib: "0187", name: "Daniel Kim" },
  { bib: "0224", name: "Amina Yusuf" },
  { bib: "0291", name: "Leo Martins" },
  { bib: "0316", name: "Sofia Reyes" },
  { bib: "0388", name: "Noah Williams" },
  { bib: "0413", name: "Priya Nair" },
  { bib: "0479", name: "Omar Hassan" },
  { bib: "0521", name: "Eleanor Price" },
  { bib: "0576", name: "Mateo Silva" },
  { bib: "0634", name: "Hana Suzuki" },
  { bib: "0698", name: "Jonas Berg" },
  { bib: "0725", name: "Nadia Rahman" },
  { bib: "0782", name: "Lucas Moreno" },
  { bib: "0819", name: "Zara Ahmed" },
  { bib: "0863", name: "Theo Bennett" },
  { bib: "0914", name: "Mei Chen" },
  { bib: "0971", name: "Sam Okafor" },
  { bib: "1028", name: "Clara Fischer" },
  { bib: "1084", name: "Ibrahim Ali" },
  { bib: "1137", name: "Lena Kowalski" },
  { bib: "1195", name: "Ravi Menon" },
  { bib: "1246", name: "Amara Brooks" },
  { bib: "1302", name: "Nico Laurent" },
];

export const initialDrawState: DrawState = {
  event: null,
  entrants: mockEntrants,
  available: mockEntrants,
  winners: [],
  current: null,
  isRolling: false,
  fileName: "Mock runners.csv",
  message: "24 entrants ready to draw",
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
    Array.isArray(state.entrants) &&
    Array.isArray(state.available) &&
    Array.isArray(state.winners) &&
    typeof state.isRolling === "boolean" &&
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

export function parseEntrantsCsv(csv: string) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("Add a header row and at least one entrant.");
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/[\s_-]+/g, ""),
  );
  const bibIndex = headers.findIndex((header) =>
    ["bib", "bibnumber", "number"].includes(header),
  );
  const nameIndex = headers.findIndex((header) =>
    ["name", "fullname", "participantname"].includes(header),
  );

  if (bibIndex === -1) {
    throw new Error('The CSV needs a "bib number" column.');
  }

  const entrants = lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line);
    const bib = cells[bibIndex]?.trim();
    const name = nameIndex === -1 ? undefined : cells[nameIndex]?.trim();

    if (!bib) {
      throw new Error(`Bib number is missing on row ${rowIndex + 2}.`);
    }

    return { bib, name: name || undefined };
  });
  const uniqueBibs = new Set(entrants.map((entrant) => entrant.bib));

  if (uniqueBibs.size !== entrants.length) {
    throw new Error("Every bib number must be unique.");
  }

  return entrants;
}

export function randomEntrant(entrants: Entrant[], excludedBib?: string) {
  const candidates =
    entrants.length > 1 && excludedBib
      ? entrants.filter((entrant) => entrant.bib !== excludedBib)
      : entrants;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

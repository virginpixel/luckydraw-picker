"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./page.module.css";

type Entrant = {
  bib: string;
  name?: string;
};

type EventConfig = {
  name: string;
  winnerCount: number;
};

const mockEntrants: Entrant[] = [
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

function parseEntrantsCsv(csv: string) {
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

function randomEntrant(entrants: Entrant[], excludedBib?: string) {
  const candidates =
    entrants.length > 1 && excludedBib
      ? entrants.filter((entrant) => entrant.bib !== excludedBib)
      : entrants;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export default function Home() {
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [eventName, setEventName] = useState("");
  const [winnerCount, setWinnerCount] = useState("3");
  const [setupError, setSetupError] = useState("");
  const [entrants, setEntrants] = useState(mockEntrants);
  const [available, setAvailable] = useState(mockEntrants);
  const [winners, setWinners] = useState<(Entrant | null)[]>([]);
  const [current, setCurrent] = useState<Entrant | null>(null);
  const [rollingEntrant, setRollingEntrant] = useState<Entrant | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [drawKey, setDrawKey] = useState(0);
  const [fileName, setFileName] = useState("Mock runners.csv");
  const [message, setMessage] = useState("24 entrants ready to draw");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filledSlots = winners.filter(Boolean).length;
  const drawComplete = winners.length > 0 && filledSlots === winners.length;
  const progressText = useMemo(
    () => `${filledSlots} of ${winners.length} winner slots filled`,
    [filledSlots, winners.length],
  );

  useEffect(() => {
    if (!isRolling || available.length === 0) {
      return;
    }

    let index = Math.floor(Math.random() * available.length);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const interval = window.setInterval(
      () => {
        index = (index + 1) % available.length;
        setRollingEntrant(available[index]);
      },
      reducedMotion ? 180 : 55,
    );

    return () => window.clearInterval(interval);
  }, [available, isRolling]);

  function beginRolling(pool: Entrant[]) {
    const first = randomEntrant(pool);
    if (!first) {
      setCurrent(null);
      setRollingEntrant(null);
      setIsRolling(false);
      setError("There are no eligible bib numbers left to draw.");
      return false;
    }

    setCurrent(null);
    setRollingEntrant(first);
    setIsRolling(true);
    setDrawKey((key) => key + 1);
    setError("");
    return true;
  }

  function createEvent(submission: FormEvent<HTMLFormElement>) {
    submission.preventDefault();
    const name = eventName.trim();
    const count = Number(winnerCount);

    if (!name) {
      setSetupError("Enter an event name.");
      return;
    }

    if (!Number.isInteger(count) || count < 1) {
      setSetupError("Winner count must be a positive whole number.");
      return;
    }

    setEvent({ name, winnerCount: count });
    setWinners(Array.from({ length: count }, () => null));
    setAvailable(entrants);
    setCurrent(null);
    setRollingEntrant(null);
    setIsRolling(false);
    setMessage(`${entrants.length} entrants ready to draw`);
    setSetupError("");
    setError("");
  }

  function startDraw() {
    if (beginRolling(available)) {
      setMessage("Numbers are rolling. Stop when you are ready");
    }
  }

  function stopDraw() {
    if (!isRolling || !rollingEntrant) {
      return;
    }

    setIsRolling(false);
    setCurrent(rollingEntrant);
    setDrawKey((key) => key + 1);
    setMessage("");
  }

  function confirmAndDrawNext() {
    if (!current) {
      startDraw();
      return;
    }

    const openSlot = winners.findIndex((winner) => winner === null);
    if (openSlot === -1) {
      return;
    }

    const updatedWinners = [...winners];
    updatedWinners[openSlot] = current;
    const updatedAvailable = available.filter(
      (entrant) => entrant.bib !== current.bib,
    );
    const isFinalWinner = openSlot === winners.length - 1;

    setWinners(updatedWinners);
    setAvailable(updatedAvailable);

    if (isFinalWinner) {
      setCurrent(null);
      setRollingEntrant(null);
      setIsRolling(false);
      setMessage("All winner slots are filled");
      return;
    }

    beginRolling(updatedAvailable);
    setMessage(`Slot ${openSlot + 1} confirmed. Rolling the next draw`);
  }

  function retake() {
    if (!current) {
      return;
    }

    const removedBib = current.bib;
    const updatedAvailable = available.filter(
      (entrant) => entrant.bib !== removedBib,
    );
    setAvailable(updatedAvailable);
    const continuing = beginRolling(updatedAvailable);
    setMessage(
      continuing
        ? `Bib ${removedBib} removed. Rolling again`
        : `Bib ${removedBib} removed from the draw`,
    );
    if (!continuing) {
      setError(
        "There are no eligible bib numbers left. Import more entrants or start a new event.",
      );
    }
  }

  function resetDraw() {
    setAvailable(entrants);
    setWinners(Array.from({ length: event?.winnerCount ?? 0 }, () => null));
    setCurrent(null);
    setRollingEntrant(null);
    setIsRolling(false);
    setMessage(`${entrants.length} entrants ready to draw`);
    setError("");
  }

  function startNewEvent() {
    setEvent(null);
    setWinners([]);
    setCurrent(null);
    setRollingEntrant(null);
    setIsRolling(false);
    setAvailable(entrants);
    setMessage(`${entrants.length} entrants ready to draw`);
    setError("");
  }

  async function importCsv(fileEvent: ChangeEvent<HTMLInputElement>) {
    const file = fileEvent.target.files?.[0];
    fileEvent.target.value = "";
    if (!file) {
      return;
    }

    try {
      const imported = parseEntrantsCsv(await file.text());
      setEntrants(imported);
      setAvailable(imported);
      setWinners(
        Array.from({ length: event?.winnerCount ?? 0 }, () => null),
      );
      setCurrent(null);
      setRollingEntrant(null);
      setIsRolling(false);
      setFileName(file.name);
      setMessage(`${imported.length} entrants imported and ready`);
      setError(
        event && imported.length < event.winnerCount
          ? `This list has ${imported.length} entrants for ${event.winnerCount} winner slots.`
          : "",
      );
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "This CSV could not be imported.",
      );
    }
  }

  if (!event) {
    return (
      <main className={`${styles.page} ${styles.setupPage}`}>
        <section className={styles.setupShell}>
          <div className={styles.setupIntro}>
            <div className={styles.brand}>
              <span className={styles.brandMark}>B</span>
              <span>Bib Draw</span>
            </div>
            <div>
              <p className={styles.eyebrow}>Create an event</p>
              <h1>Set the draw, then run the room.</h1>
              <p>
                Name your event and choose exactly how many winners you need.
              </p>
            </div>
          </div>

          <form className={styles.setupForm} onSubmit={createEvent} noValidate>
            <div className={styles.field}>
              <label htmlFor="event-name">Event name</label>
              <input
                id="event-name"
                value={eventName}
                onChange={(input) => setEventName(input.target.value)}
                placeholder="Enter event name"
                autoComplete="off"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="winner-count">Number of winners</label>
              <input
                id="winner-count"
                value={winnerCount}
                onChange={(input) =>
                  setWinnerCount(input.target.value.replace(/\D/g, ""))
                }
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
              />
            </div>
            {setupError ? (
              <p className={styles.error} role="alert">
                {setupError}
              </p>
            ) : null}
            <button className={styles.primaryButton} type="submit">
              Create event
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>B</span>
          <div className={styles.eventIdentity}>
            <span>Bib Draw</span>
            <strong>{event.name}</strong>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.poolCount}>
            <strong>{available.length}</strong>
            <span>in pool</span>
          </div>
          <div className={styles.headerButtons}>
            <button className={styles.resetButton} onClick={resetDraw} type="button">
              Reset draw
            </button>
            <button className={styles.resetButton} onClick={startNewEvent} type="button">
              New event
            </button>
          </div>
        </div>
      </header>

      <section className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div>
            <p className={styles.eyebrow}>Entrant list</p>
            <h1>Ready when you are.</h1>
            <p className={styles.sidebarCopy}>
              Import your entrant list to begin.
            </p>
          </div>

          <div className={styles.importPanel}>
            <div className={styles.fileMeta}>
              <span className={styles.fileBadge}>CSV</span>
              <div>
                <strong>{fileName}</strong>
                <span>{entrants.length} valid entrants</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              className={styles.fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={importCsv}
            />
            <div className={styles.importActions}>
              <button
                className={styles.importButton}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Import CSV
              </button>
              <a className={styles.sampleButton} href="sample-entrants.csv" download>
                Download sample
              </a>
            </div>
            <p className={styles.helperText}>
              Required: bib number. Optional: name.
            </p>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
          </div>

        </aside>

        <section className={styles.drawArea} aria-live={isRolling ? "off" : "polite"}>
          <div className={styles.statusRow}>
            <span>{message}</span>
          </div>

          <div className={styles.stage}>
            {drawComplete ? (
              <div className={styles.completeState}>
                <span>{filledSlots} / {winners.length}</span>
                <h2>Winner lineup complete.</h2>
                <p>Your confirmed bibs are locked into the winner slots.</p>
              </div>
            ) : isRolling && rollingEntrant ? (
              <div className={styles.rollingEntrant} key={rollingEntrant.bib}>
                <p>Rolling bibs</p>
                <strong>{rollingEntrant.bib}</strong>
                <span>{rollingEntrant.name || "Name not provided"}</span>
              </div>
            ) : current ? (
              <div className={styles.drawnEntrant} key={drawKey}>
                <p>Selected bib</p>
                <strong>{current.bib}</strong>
                <span>{current.name || "Name not provided"}</span>
              </div>
            ) : (
              <div className={styles.readyState}>
                <span className={styles.readyNumber}>?</span>
                <h2>Draw your first bib</h2>
                <p>Three winner slots are waiting.</p>
              </div>
            )}
          </div>

          <div className={styles.controls}>
            {!drawComplete && !current && !isRolling ? (
              <button
                className={styles.primaryButton}
                onClick={startDraw}
                type="button"
              >
                Draw a bib
              </button>
            ) : null}
            {!drawComplete && isRolling ? (
              <button
                className={`${styles.primaryButton} ${styles.stopButton}`}
                onClick={stopDraw}
                type="button"
              >
                Stop
              </button>
            ) : null}
            {!drawComplete && current && !isRolling ? (
              <>
                <button
                  className={styles.primaryButton}
                  onClick={confirmAndDrawNext}
                  type="button"
                >
                  Next draw
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={retake}
                  type="button"
                >
                  Absent, retake
                </button>
              </>
            ) : null}
            {drawComplete ? (
              <button
                className={styles.primaryButton}
                onClick={resetDraw}
                type="button"
              >
                Start a new draw
              </button>
            ) : null}
          </div>
        </section>
      </section>

      <section className={styles.winnersSection}>
        <div className={styles.winnersHeading}>
          <div>
            <h2>Winner slots</h2>
            <p>{progressText}</p>
          </div>
          <span>{filledSlots}/{winners.length}</span>
        </div>
        <div className={styles.winnerGrid}>
          {winners.map((winner, index) => (
            <article
              className={`${styles.winnerSlot} ${winner ? styles.filledSlot : ""}`}
              key={index}
            >
              <span className={styles.slotIndex}>{String(index + 1).padStart(2, "0")}</span>
              {winner ? (
                <div className={styles.winnerDetails}>
                  <strong>{winner.bib}</strong>
                  <span>{winner.name || "Name not provided"}</span>
                </div>
              ) : (
                <p>Waiting for a winner</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

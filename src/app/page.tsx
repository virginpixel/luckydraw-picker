"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  entriesFromText,
  Entry,
  EntryMode,
  initialDrawState,
  mockEntries,
  numberedEntries,
  parseEntriesCsv,
  useDrawStore,
} from "./draw-store";
import ThemeToggle from "./theme-toggle";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const { state, setState, hydrated } = useDrawStore();
  const [eventName, setEventName] = useState("");
  const [winnerCount, setWinnerCount] = useState("3");
  const [setupError, setSetupError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetEntries(entries: Entry[], message: string) {
    setState((current) => ({
      ...current,
      entries,
      available: entries,
      winners: Array.from(
        { length: current.event?.winnerCount ?? 0 },
        () => null,
      ),
      current: null,
      isRolling: false,
      message,
      error: "",
    }));
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

    setState((current) => ({
      ...current,
      event: { name, winnerCount: count },
      available: current.entries,
      winners: Array.from({ length: count }, () => null),
      current: null,
      isRolling: false,
      message: `${current.entries.length} entries ready to draw`,
      error: "",
    }));
    setSetupError("");
  }

  function startNewEvent() {
    setState(initialDrawState);
    setEventName("");
    setWinnerCount("3");
    setSetupError("");
  }

  function selectMode(mode: EntryMode) {
    if (mode === "csv") {
      setState((current) => ({
        ...current,
        entryMode: mode,
        fileName: "Sample entries.csv",
      }));
      resetEntries(mockEntries, `${mockEntries.length} sample entries ready`);
      return;
    }

    if (mode === "manual") {
      const entries = entriesFromText(state.manualText);
      setState((current) => ({ ...current, entryMode: mode }));
      resetEntries(entries, `${entries.length} pasted entries ready`);
      return;
    }

    const entries = numberedEntries(state.numberTotal);
    setState((current) => ({ ...current, entryMode: mode }));
    resetEntries(entries, `Numbers 1 to ${state.numberTotal} ready`);
  }

  async function importCsv(fileEvent: ChangeEvent<HTMLInputElement>) {
    const file = fileEvent.target.files?.[0];
    fileEvent.target.value = "";
    if (!file) {
      return;
    }

    try {
      const imported = parseEntriesCsv(await file.text());
      setState((current) => ({
        ...current,
        entryMode: "csv",
        entries: imported,
        available: imported,
        winners: Array.from(
          { length: current.event?.winnerCount ?? 0 },
          () => null,
        ),
        current: null,
        isRolling: false,
        fileName: file.name,
        message: `${imported.length} entries imported and ready`,
        error: "",
      }));
    } catch (importError) {
      setState((current) => ({
        ...current,
        error:
          importError instanceof Error
            ? importError.message
            : "This CSV could not be imported.",
      }));
    }
  }

  function updateManualEntries(input: ChangeEvent<HTMLTextAreaElement>) {
    const manualText = input.target.value;
    const entries = entriesFromText(manualText);
    setState((current) => ({
      ...current,
      manualText,
      entries,
      available: entries,
      winners: Array.from(
        { length: current.event?.winnerCount ?? 0 },
        () => null,
      ),
      current: null,
      isRolling: false,
      message: `${entries.length} pasted entries ready`,
      error: "",
    }));
  }

  function updateNumberTotal(total: number) {
    const safeTotal = Math.min(100, Math.max(1, total));
    const entries = numberedEntries(safeTotal);
    setState((current) => ({
      ...current,
      numberTotal: safeTotal,
      entries,
      available: entries,
      winners: Array.from(
        { length: current.event?.winnerCount ?? 0 },
        () => null,
      ),
      current: null,
      isRolling: false,
      message: `Numbers 1 to ${safeTotal} ready`,
      error: "",
    }));
  }

  if (!hydrated) {
    return <main className={`${styles.page} ${styles.loadingPage}`} />;
  }

  if (!state.event) {
    return (
      <main className={`${styles.page} ${styles.setupPage}`}>
        <section className={styles.setupShell}>
          <div className={styles.setupIntro}>
            <div className={styles.setupTopBar}>
              <div className={styles.brand}>
                <span className={styles.brandMark} aria-hidden="true">
                  <span className={styles.brandIcon} />
                </span>
                <span>Lucky Draw</span>
              </div>
              <ThemeToggle />
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
    <main className={`${styles.page} ${styles.configPage}`}>
      <header className={styles.configHeader}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <span className={styles.brandIcon} />
          </span>
          <div className={styles.eventIdentity}>
            <span>Lucky Draw</span>
            <strong>{state.event.name}</strong>
          </div>
        </div>
        <div className={styles.configHeaderActions}>
          <ThemeToggle />
          <button className={styles.resetButton} onClick={startNewEvent} type="button">
            New event
          </button>
        </div>
      </header>

      <section className={styles.configShell}>
        <div className={styles.configIntro}>
          <p className={styles.eyebrow}>Entry source</p>
          <h1>Prepare the draw.</h1>
          <p>Choose one way to build the pool, then open the draw screen.</p>
        </div>

        <div className={styles.configPanel}>
          <div className={styles.modeSelector} aria-label="Entry source">
            <button
              type="button"
              aria-pressed={state.entryMode === "numbers"}
              onClick={() => selectMode("numbers")}
            >
              Numbers
              <span>1 to 100</span>
            </button>
            <button
              type="button"
              aria-pressed={state.entryMode === "manual"}
              onClick={() => selectMode("manual")}
            >
              Paste
              <span>One per line</span>
            </button>
            <button
              type="button"
              aria-pressed={state.entryMode === "csv"}
              onClick={() => selectMode("csv")}
            >
              CSV
              <span>Number + name</span>
            </button>
          </div>

          {state.entryMode === "csv" ? (
            <div className={styles.modePanel}>
              <div className={styles.fileMeta}>
                <span className={styles.fileBadge}>CSV</span>
                <div>
                  <strong>{state.fileName}</strong>
                  <span>{state.entries.length} valid entries</span>
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
                <a
                  className={styles.sampleButton}
                  href="sample-entries.csv"
                  download
                >
                  Download sample
                </a>
              </div>
              <p className={styles.helperText}>
                Required: number. Optional: name.
              </p>
            </div>
          ) : null}

          {state.entryMode === "manual" ? (
            <div className={styles.modePanel}>
              <label className={styles.textareaLabel} htmlFor="manual-entries">
                Entries
              </label>
              <textarea
                id="manual-entries"
                className={styles.entriesTextarea}
                value={state.manualText}
                onChange={updateManualEntries}
                placeholder={"Entry 1\nEntry 2\nEntry 3"}
              />
              <p className={styles.helperText}>
                Each non-empty line becomes one entry.
              </p>
            </div>
          ) : null}

          {state.entryMode === "numbers" ? (
            <div className={styles.modePanel}>
              <div className={styles.rangeHeading}>
                <label htmlFor="number-range">Number of entries</label>
                <input
                  aria-label="Number of entries"
                  type="number"
                  min="1"
                  max="100"
                  value={state.numberTotal}
                  onChange={(input) => {
                    const total = Number(input.target.value);
                    if (Number.isInteger(total) && total >= 1 && total <= 100) {
                      updateNumberTotal(total);
                    }
                  }}
                />
              </div>
              <input
                id="number-range"
                className={styles.rangeInput}
                type="range"
                min="1"
                max="100"
                value={state.numberTotal}
                onChange={(input) => updateNumberTotal(Number(input.target.value))}
              />
              <div className={styles.rangeScale}>
                <span>1</span>
                <span>100</span>
              </div>
              <p className={styles.helperText}>
                Creates the ordered entries 1 through {state.numberTotal}.
              </p>
            </div>
          ) : null}

          {state.error ? (
            <p className={styles.error} role="alert">
              {state.error}
            </p>
          ) : null}
          <div className={styles.configSummary}>
            <div>
              <span>Entries</span>
              <strong>{state.entries.length}</strong>
            </div>
            <div>
              <span>Winners</span>
              <strong>{state.event.winnerCount}</strong>
            </div>
          </div>
          <button
            className={styles.primaryButton}
            onClick={() => router.push("/draw")}
            type="button"
            disabled={state.entries.length === 0}
          >
            Start draw
          </button>
        </div>
      </section>
    </main>
  );
}

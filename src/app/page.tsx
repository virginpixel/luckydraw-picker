"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  initialDrawState,
  parseEntrantsCsv,
  useDrawStore,
} from "./draw-store";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const { state, setState, hydrated } = useDrawStore();
  const [eventName, setEventName] = useState("");
  const [winnerCount, setWinnerCount] = useState("3");
  const [setupError, setSetupError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      available: current.entrants,
      winners: Array.from({ length: count }, () => null),
      current: null,
      isRolling: false,
      message: `${current.entrants.length} entrants ready to draw`,
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

  async function importCsv(fileEvent: ChangeEvent<HTMLInputElement>) {
    const file = fileEvent.target.files?.[0];
    fileEvent.target.value = "";
    if (!file) {
      return;
    }

    try {
      const imported = parseEntrantsCsv(await file.text());
      setState((current) => ({
        ...current,
        entrants: imported,
        available: imported,
        winners: Array.from(
          { length: current.event?.winnerCount ?? 0 },
          () => null,
        ),
        current: null,
        isRolling: false,
        fileName: file.name,
        message: `${imported.length} entrants imported and ready`,
        error:
          current.event && imported.length < current.event.winnerCount
            ? `This list has ${imported.length} entrants for ${current.event.winnerCount} winner slots.`
            : "",
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

  if (!hydrated) {
    return <main className={`${styles.page} ${styles.loadingPage}`} />;
  }

  if (!state.event) {
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
    <main className={`${styles.page} ${styles.configPage}`}>
      <header className={styles.configHeader}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>B</span>
          <div className={styles.eventIdentity}>
            <span>Bib Draw</span>
            <strong>{state.event.name}</strong>
          </div>
        </div>
        <button className={styles.resetButton} onClick={startNewEvent} type="button">
          New event
        </button>
      </header>

      <section className={styles.configShell}>
        <div className={styles.configIntro}>
          <p className={styles.eyebrow}>Entrant list</p>
          <h1>Prepare the draw.</h1>
          <p>Import the final bib list before opening the public draw screen.</p>
        </div>

        <div className={styles.configPanel}>
          <div className={styles.fileMeta}>
            <span className={styles.fileBadge}>CSV</span>
            <div>
              <strong>{state.fileName}</strong>
              <span>{state.entrants.length} valid entrants</span>
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
          {state.error ? (
            <p className={styles.error} role="alert">
              {state.error}
            </p>
          ) : null}
          <div className={styles.configSummary}>
            <div>
              <span>Entrants</span>
              <strong>{state.entrants.length}</strong>
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
            disabled={state.entrants.length === 0}
          >
            Start draw
          </button>
        </div>
      </section>
    </main>
  );
}

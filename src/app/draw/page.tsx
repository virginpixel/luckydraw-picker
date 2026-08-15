"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Entry, randomEntry, useDrawStore } from "../draw-store";
import ThemeToggle from "../theme-toggle";
import styles from "../page.module.css";

export default function DrawPage() {
  const router = useRouter();
  const { state, setState, hydrated } = useDrawStore();
  const [rollingEntry, setRollingEntry] = useState(
    randomEntry(state.available),
  );
  const [drawKey, setDrawKey] = useState(0);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const filledSlots = state.winners.filter(Boolean).length;
  const poolExhausted =
    state.available.length === 0 && !state.current && !state.isRolling;
  const drawComplete =
    state.winners.length > 0 &&
    (filledSlots === state.winners.length || poolExhausted);
  const isFinalSelection =
    Boolean(state.current) &&
    (filledSlots === state.winners.length - 1 || state.available.length === 1);
  const progressText = useMemo(
    () => `${filledSlots} ${filledSlots === 1 ? "winner" : "winners"} selected`,
    [filledSlots],
  );
  const displayedWinners = drawComplete
    ? state.winners.filter((winner): winner is Entry => Boolean(winner))
    : state.winners;

  useEffect(() => {
    if (hydrated && !state.event) {
      router.replace("/");
    }
  }, [hydrated, router, state.event]);

  useEffect(() => {
    if (!state.isRolling || state.available.length === 0) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const interval = window.setInterval(
      () => {
        setRollingEntry((previous) =>
          randomEntry(state.available, previous?.id),
        );
      },
      reducedMotion ? 120 : 24,
    );

    return () => window.clearInterval(interval);
  }, [state.available, state.isRolling]);

  function beginRolling(pool = state.available) {
    const first = randomEntry(pool);
    if (!first) {
      setState((current) => ({
        ...current,
        current: null,
        isRolling: false,
        message: `${filledSlots} ${filledSlots === 1 ? "winner" : "winners"} selected`,
        error: "",
      }));
      return false;
    }

    if (pool.length === 1) {
      setRollingEntry(first);
      setState((current) => ({
        ...current,
        current: first,
        isRolling: false,
        message: "Final entry remaining",
        error: "",
      }));
      return true;
    }

    setRollingEntry(first);
    setState((current) => ({
      ...current,
      current: null,
      isRolling: true,
      message: "Entries are rolling. Stop when you are ready",
      error: "",
    }));
    return true;
  }

  function stopDraw() {
    if (!state.isRolling || !rollingEntry) {
      return;
    }

    setState((current) => ({
      ...current,
      current: rollingEntry,
      isRolling: false,
      message: "",
    }));
    setDrawKey((key) => key + 1);
  }

  function confirmSelection() {
    if (!state.current) {
      return;
    }

    const openSlot = state.winners.findIndex((winner) => winner === null);
    if (openSlot === -1) {
      return;
    }

    const updatedWinners = [...state.winners];
    updatedWinners[openSlot] = state.current;
    const updatedAvailable = state.available.filter(
      (entry) => entry.id !== state.current?.id,
    );
    const drawEnds =
      openSlot === state.winners.length - 1 || updatedAvailable.length === 0;
    const finalEntry =
      !drawEnds && updatedAvailable.length === 1
        ? updatedAvailable[0]
        : null;
    const selectedCount = openSlot + 1;

    setState((current) => ({
      ...current,
      winners: updatedWinners,
      available: updatedAvailable,
      current: finalEntry,
      isRolling: !drawEnds && !finalEntry,
      message: drawEnds
        ? `${selectedCount} ${selectedCount === 1 ? "winner" : "winners"} selected`
        : finalEntry
          ? "Final entry remaining"
          : `Winner ${selectedCount} confirmed. Rolling the next entry`,
      error: "",
    }));

    if (finalEntry) {
      setDrawKey((key) => key + 1);
    }

    if (!drawEnds && !finalEntry) {
      setRollingEntry(randomEntry(updatedAvailable));
    }
  }

  function retake() {
    if (!state.current) {
      return;
    }

    const removedValue = state.current.value;
    const updatedAvailable = state.available.filter(
      (entry) => entry.id !== state.current?.id,
    );
    const continuing = updatedAvailable.length > 0;

    setRollingEntry(randomEntry(updatedAvailable));
    setState((current) => ({
      ...current,
      available: updatedAvailable,
      current: null,
      isRolling: continuing,
      message: continuing
        ? `${removedValue} removed. Rolling again`
        : `${filledSlots} ${filledSlots === 1 ? "winner" : "winners"} selected. No entries remain`,
      error: "",
    }));
  }

  function restartDraw() {
    setState((current) => ({
      ...current,
      available: current.entries,
      winners: Array.from(
        { length: current.event?.winnerCount ?? 0 },
        () => null,
      ),
      current: null,
      isRolling: false,
      message: `${current.entries.length} entries ready to draw`,
      error: "",
    }));
    setRollingEntry(randomEntry(state.entries));
    setConfirmRestart(false);
  }

  function resetEvent() {
    setState((current) => ({
      ...current,
      available: current.entries,
      winners: Array.from(
        { length: current.event?.winnerCount ?? 0 },
        () => null,
      ),
      current: null,
      isRolling: false,
      message: `${current.entries.length} entries ready to draw`,
      error: "",
    }));
    setRollingEntry(randomEntry(state.entries));
    setConfirmRestart(false);
  }

  if (!hydrated || !state.event) {
    return <main className={`${styles.page} ${styles.loadingPage}`} />;
  }

  return (
    <main className={`${styles.page} ${styles.drawPage}`}>
      <header className={styles.drawHeader}>
        <button
          className={styles.backButton}
          onClick={() => router.push("/")}
          type="button"
          aria-label="Back to configuration"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className={styles.drawIdentity}>
          <span>{state.event.name}</span>
          <strong>{progressText}</strong>
        </div>
        <div className={styles.drawHeaderUtilities}>
          <ThemeToggle />
          <div className={styles.drawHeaderActions}>
            <div className={styles.poolCount}>
              <strong>{state.available.length}</strong>
              <span>in pool</span>
            </div>
            <button
              className={styles.resetButton}
              onClick={resetEvent}
              type="button"
            >
              Reset event
            </button>
          </div>
        </div>
      </header>

      <section
        className={styles.publicStage}
        aria-live={state.isRolling ? "off" : "polite"}
      >
        <div className={styles.statusRow}>
          <span>{state.message}</span>
        </div>

        <div className={styles.stage}>
          {drawComplete ? (
            <div className={styles.completeState}>
              <span>{filledSlots}</span>
              <h1>{filledSlots === 1 ? "Winner selected." : "Winners selected."}</h1>
            </div>
          ) : state.isRolling && rollingEntry ? (
            <div className={styles.rollingEntrant} key={rollingEntry.id}>
              <p>Rolling entries</p>
              <strong>{rollingEntry.value}</strong>
              {rollingEntry.name ? <span>{rollingEntry.name}</span> : null}
            </div>
          ) : state.current ? (
            <div className={styles.drawnEntrant} key={drawKey}>
              <p>Selected entry</p>
              <strong>{state.current.value}</strong>
              {state.current.name ? <span>{state.current.name}</span> : null}
            </div>
          ) : (
            <div className={styles.readyState}>
              <span className={styles.readyNumber}>?</span>
              <h1>Draw your first entry</h1>
              <p>
                {state.winners.length} winner {state.winners.length === 1 ? "slot is" : "slots are"} waiting.
              </p>
            </div>
          )}
        </div>

        <div className={styles.controls}>
          {!drawComplete && !state.current && !state.isRolling ? (
            <button
              className={styles.primaryButton}
              onClick={() => beginRolling()}
              type="button"
            >
              Draw an entry
            </button>
          ) : null}
          {!drawComplete && state.isRolling ? (
            <button
              className={`${styles.primaryButton} ${styles.stopButton}`}
              onClick={stopDraw}
              type="button"
            >
              Stop
            </button>
          ) : null}
          {!drawComplete && state.current && !state.isRolling ? (
            <>
              <button
                className={styles.primaryButton}
                onClick={confirmSelection}
                type="button"
              >
                {isFinalSelection ? "Finish" : "Next draw"}
              </button>
              <button
                className={styles.secondaryButton}
                onClick={retake}
                type="button"
              >
                {state.available.length === 1
                  ? "Mark absent and finish"
                  : "Remove and retake"}
              </button>
            </>
          ) : null}
          {drawComplete && !confirmRestart ? (
            <button
              className={styles.primaryButton}
              onClick={() => setConfirmRestart(true)}
              type="button"
            >
              Start a new draw
            </button>
          ) : null}
          {drawComplete && confirmRestart ? (
            <div className={styles.restartConfirm} role="alert">
              <div>
                <strong>Start over with this entry list?</strong>
                <span>Current winners will be cleared.</span>
              </div>
              <div>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setConfirmRestart(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={restartDraw}
                  type="button"
                >
                  Start new draw
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {state.error ? (
          <p className={styles.drawError} role="alert">
            {state.error}
          </p>
        ) : null}
      </section>

      <section className={styles.winnersSection}>
        <div className={styles.winnersHeading}>
          <div>
            <h2>Winners</h2>
            <p>{progressText}</p>
          </div>
        </div>
        <div className={styles.winnerGrid}>
          {displayedWinners.map((winner, index) => (
            <article
              className={`${styles.winnerSlot} ${winner ? styles.filledSlot : ""}`}
              key={winner?.id ?? index}
            >
              <span className={styles.slotIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              {winner ? (
                <div className={styles.winnerDetails}>
                  <strong>{winner.value}</strong>
                  {winner.name ? <span>{winner.name}</span> : null}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { randomEntrant, useDrawStore } from "../draw-store";
import styles from "../page.module.css";

export default function DrawPage() {
  const router = useRouter();
  const { state, setState, hydrated } = useDrawStore();
  const [rollingEntrant, setRollingEntrant] = useState(
    randomEntrant(state.available),
  );
  const [drawKey, setDrawKey] = useState(0);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const filledSlots = state.winners.filter(Boolean).length;
  const drawComplete =
    state.winners.length > 0 && filledSlots === state.winners.length;
  const isFinalSelection =
    Boolean(state.current) && filledSlots === state.winners.length - 1;
  const progressText = useMemo(
    () => `${filledSlots} of ${state.winners.length} winner slots filled`,
    [filledSlots, state.winners.length],
  );

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
        setRollingEntrant((previous) =>
          randomEntrant(state.available, previous?.bib),
        );
      },
      reducedMotion ? 120 : 24,
    );

    return () => window.clearInterval(interval);
  }, [state.available, state.isRolling]);

  function beginRolling(pool = state.available) {
    const first = randomEntrant(pool);
    if (!first) {
      setState((current) => ({
        ...current,
        current: null,
        isRolling: false,
        error: "There are no eligible bib numbers left to draw.",
      }));
      return false;
    }

    setRollingEntrant(first);
    setState((current) => ({
      ...current,
      current: null,
      isRolling: true,
      message: "Numbers are rolling. Stop when you are ready",
      error: "",
    }));
    return true;
  }

  function stopDraw() {
    if (!state.isRolling || !rollingEntrant) {
      return;
    }

    setState((current) => ({
      ...current,
      current: rollingEntrant,
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
      (entrant) => entrant.bib !== state.current?.bib,
    );
    const finalWinner = openSlot === state.winners.length - 1;

    setState((current) => ({
      ...current,
      winners: updatedWinners,
      available: updatedAvailable,
      current: null,
      isRolling: !finalWinner,
      message: finalWinner
        ? "All winner slots are filled"
        : `Slot ${openSlot + 1} confirmed. Rolling the next draw`,
    }));

    if (!finalWinner) {
      setRollingEntrant(randomEntrant(updatedAvailable));
    }
  }

  function retake() {
    if (!state.current) {
      return;
    }

    const removedBib = state.current.bib;
    const updatedAvailable = state.available.filter(
      (entrant) => entrant.bib !== removedBib,
    );
    const continuing = updatedAvailable.length > 0;

    setRollingEntrant(randomEntrant(updatedAvailable));
    setState((current) => ({
      ...current,
      available: updatedAvailable,
      current: null,
      isRolling: continuing,
      message: continuing
        ? `Bib ${removedBib} removed. Rolling again`
        : `Bib ${removedBib} removed from the draw`,
      error: continuing
        ? ""
        : "There are no eligible bib numbers left. Import more entrants or return to configuration.",
    }));
  }

  function restartDraw() {
    setState((current) => ({
      ...current,
      available: current.entrants,
      winners: Array.from(
        { length: current.event?.winnerCount ?? 0 },
        () => null,
      ),
      current: null,
      isRolling: false,
      message: `${current.entrants.length} entrants ready to draw`,
      error: "",
    }));
    setRollingEntrant(randomEntrant(state.entrants));
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
          <strong>{filledSlots}/{state.winners.length} winners</strong>
        </div>
        <div className={styles.poolCount}>
          <strong>{state.available.length}</strong>
          <span>in pool</span>
        </div>
      </header>

      <section className={styles.publicStage} aria-live={state.isRolling ? "off" : "polite"}>
        <div className={styles.statusRow}>
          <span>{state.message}</span>
        </div>

        <div className={styles.stage}>
          {drawComplete ? (
            <div className={styles.completeState}>
              <span>{filledSlots} / {state.winners.length}</span>
              <h1>Winner lineup complete.</h1>
            </div>
          ) : state.isRolling && rollingEntrant ? (
            <div className={styles.rollingEntrant} key={rollingEntrant.bib}>
              <p>Rolling bibs</p>
              <strong>{rollingEntrant.bib}</strong>
              <span>{rollingEntrant.name || "Name not provided"}</span>
            </div>
          ) : state.current ? (
            <div className={styles.drawnEntrant} key={drawKey}>
              <p>Selected bib</p>
              <strong>{state.current.bib}</strong>
              <span>{state.current.name || "Name not provided"}</span>
            </div>
          ) : (
            <div className={styles.readyState}>
              <span className={styles.readyNumber}>?</span>
              <h1>Draw your first bib</h1>
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
              Draw a bib
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
                Absent, retake
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
                <strong>Start over with this entrant list?</strong>
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
            <h2>Winner slots</h2>
            <p>{progressText}</p>
          </div>
          <span>{filledSlots}/{state.winners.length}</span>
        </div>
        <div className={styles.winnerGrid}>
          {state.winners.map((winner, index) => (
            <article
              className={`${styles.winnerSlot} ${winner ? styles.filledSlot : ""}`}
              key={index}
            >
              <span className={styles.slotIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
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

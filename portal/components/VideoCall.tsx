'use client';

// Videocall im Portal: Bühne mit der Kundschaft, eigenes Bild, Mikrofon, Kamera, Foto, Auflegen.
// In der Demo ohne echte Verbindung (Entscheidung 35). Später WebRTC über den Videodienst.
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { de } from '@/i18n/de';

import { initials } from '../lib/view';

const t = de.portal.video;

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function VideoCall({
  title,
  customer,
  device,
  caseId,
  user,
  back,
}: {
  title: string;
  customer: string;
  device: string;
  caseId: string;
  user: string;
  back: string;
}) {
  const [seconds, setSeconds] = useState(-3);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const live = seconds >= 0;
  return (
    <main className="call" aria-label={title}>
      <header className="call-top">
        <span className="chip">{caseId}</span>
        <span className="call-title">
          <b>{customer}</b> · {device}
        </span>
        <span className="chip num" role="timer" aria-live="off">
          {live ? mmss(seconds) : t.connecting}
        </span>
      </header>
      <div className={`stage${live ? ' live' : ''}`}>
        <span className="ring" aria-hidden />
        <span className="big avatar">{initials(customer)}</span>
      </div>
      <div className={`self${cam ? '' : ' off'}`} aria-label={t.you}>
        <span className="avatar">{initials(user)}</span>
      </div>
      <nav className="call-bar" aria-label={title}>
        <button
          type="button"
          className="round"
          aria-pressed={!mic}
          onClick={() => setMic((m) => !m)}
        >
          {mic ? t.mic : t.micOff}
        </button>
        <button
          type="button"
          className="round"
          aria-pressed={!cam}
          onClick={() => setCam((c) => !c)}
        >
          {cam ? t.cam : t.camOff}
        </button>
        {/* Kein „Foto in der Fallakte“: Das Portal kennt die Einwilligung der Kundschaft in
            Screenshots nicht, und gespeichert wurde nichts (Portal-Prüfung 05.11.) */}
        <Link className="round end" href={back}>
          {t.end}
        </Link>
      </nav>
    </main>
  );
}

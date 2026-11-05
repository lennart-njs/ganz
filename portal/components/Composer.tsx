'use client';

// Antwortfeld der Fallakte: Nachricht an die Kundschaft oder interne Notiz, dazu Textbausteine,
// Rückfrage mit Antworten, Terminvorschlag, Ersatzteil, Foto anfordern und Videocall.
// Strg/Cmd + Enter sendet. „Als Nächstes“ öffnet hier Felder über das Ereignis „composer“.
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';

import { de } from '@/i18n/de';
import { formatOptions, type MessageTemplate, type QuestionTemplate } from '@/model/portal';

import type { ComposerState } from '../app/faelle/[id]/actions';

const t = de.portal.composer;
type Panel = 'rueckfrage' | 'termin' | 'ersatzteil';

export function openComposer(what: Panel | 'antworten') {
  window.dispatchEvent(new CustomEvent('composer', { detail: what }));
}

export function Composer({
  action,
  customer,
  templates,
  questions,
  slots,
  partners,
  parts,
  photoText,
  videoHref,
}: {
  action: (prev: ComposerState, form: FormData) => Promise<ComposerState>;
  customer: string;
  templates: MessageTemplate[];
  questions: QuestionTemplate[];
  slots: string[];
  partners: string[];
  parts: string[];
  photoText?: string;
  videoHref: string;
}) {
  const [mode, setMode] = useState<'nachricht' | 'notiz'>('nachricht');
  const [panel, setPanel] = useState<Panel>();
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: ComposerState, fd: FormData) => {
      const next = await action(prev, fd);
      if (next.ok) {
        // Nur das Gesendete leeren: Ein Entwurf im Textfeld bleibt, wenn eine Rückfrage, ein
        // Termin oder ein Teil rausging (Portal-Prüfung 05.11.)
        const sent = String(fd.get('kind'));
        if (sent === 'nachricht' || sent === 'notiz') setText('');
        setQuestion('');
        setOptions('');
        setPanel(undefined);
        requestAnimationFrame(() => area.current?.focus());
      }
      return next;
    },
    { n: 0 },
  );

  useEffect(() => {
    const on = (e: Event) => {
      const what = (e as CustomEvent<Panel | 'antworten'>).detail;
      if (what === 'antworten') {
        setMode('nachricht');
        setPanel(undefined);
        area.current?.focus();
      } else {
        setPanel(what);
      }
      form.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    window.addEventListener('composer', on);
    return () => window.removeEventListener('composer', on);
  }, []);

  const insert = (s: string) => {
    setPanel(undefined);
    setText((x) => (x.trim() ? `${x.trim()}\n\n${s}` : s));
    requestAnimationFrame(() => area.current?.focus());
  };

  const kind = panel ?? mode;
  const canSend = panel ? true : !!text.trim();
  const toggle = (p: Panel) => setPanel((x) => (x === p ? undefined : p));

  return (
    <form ref={form} action={formAction} className="composer" aria-label={t.label}>
      <input type="hidden" name="kind" value={kind} />
      <div className="seg" role="group" aria-label={t.label}>
        <button
          type="button"
          data-reply
          aria-pressed={mode === 'nachricht' && !panel}
          onClick={() => {
            setMode('nachricht');
            setPanel(undefined);
            area.current?.focus();
          }}
        >
          {t.message}
        </button>
        <button
          type="button"
          data-note
          aria-pressed={mode === 'notiz' && !panel}
          onClick={() => {
            setMode('notiz');
            setPanel(undefined);
            area.current?.focus();
          }}
        >
          {t.note}
        </button>
      </div>

      {panel === 'rueckfrage' ? (
        <div className="panelbox">
          <div className="field">
            <label htmlFor="c-question">{t.questionText}</label>
            <input
              id="c-question"
              name="question"
              className="input"
              list="c-questions"
              value={question}
              maxLength={500}
              required
              autoFocus
              onChange={(e) => {
                setQuestion(e.target.value);
                const tpl = questions.find((q) => q.question === e.target.value);
                if (tpl) setOptions(formatOptions(tpl.options));
              }}
            />
            <datalist id="c-questions">
              {questions.map((q) => (
                <option key={q.id} value={q.question} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="c-options">{t.questionOptions}</label>
            <textarea
              id="c-options"
              name="options"
              className="input"
              rows={3}
              value={options}
              maxLength={200}
              onChange={(e) => setOptions(e.target.value)}
            />
          </div>
        </div>
      ) : panel === 'termin' ? (
        <div className="panelbox">
          <div className="field">
            <label htmlFor="c-partner">{t.partner}</label>
            <select id="c-partner" name="partner" className="input">
              {partners.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend>{t.slots}</legend>
            <div className="choices">
              {slots.map((s, i) => (
                <label key={s} className="choice">
                  <input type="checkbox" name="slot" value={s} defaultChecked={i < 3} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : panel === 'ersatzteil' ? (
        <div className="panelbox">
          <div className="field">
            <label htmlFor="c-part">{t.partName}</label>
            <input
              id="c-part"
              name="part"
              className="input"
              list="c-parts"
              maxLength={200}
              required
              autoFocus
            />
            <datalist id="c-parts">
              {parts.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <fieldset>
            <legend className="sr">{t.part}</legend>
            <div className="choices">
              {(['bestellt', 'geliefert'] as const).map((s, i) => (
                <label key={s} className="choice">
                  <input type="radio" name="partStatus" value={s} defaultChecked={i === 0} />
                  <span>{t.partStatus[s]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="c-eta">{t.eta}</label>
            <input
              id="c-eta"
              name="eta"
              className="input"
              placeholder={t.etaPlaceholder}
              maxLength={60}
            />
          </div>
        </div>
      ) : (
        <div className={`field${mode === 'notiz' ? ' internal' : ''}`}>
          <label htmlFor="c-text" className="sr">
            {mode === 'notiz' ? t.note : t.placeholder(customer)}
          </label>
          <textarea
            id="c-text"
            ref={area}
            name="text"
            className="input"
            rows={3}
            maxLength={2000}
            placeholder={mode === 'notiz' ? t.notePlaceholder : t.placeholder(customer)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (canSend) form.current?.requestSubmit();
              }
            }}
          />
        </div>
      )}

      <div className="ctools">
        <div className="ctools-left">
          {mode === 'nachricht' ? (
            <>
              <label className="tool select">
                <span className="sr">{t.templates}</span>
                <select
                  value=""
                  onChange={(e) => {
                    const tpl = templates.find((x) => x.id === e.target.value);
                    if (tpl) insert(tpl.text);
                  }}
                >
                  <option value="" disabled>
                    {t.templates}
                  </option>
                  {templates.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="tool"
                aria-pressed={panel === 'rueckfrage'}
                onClick={() => toggle('rueckfrage')}
              >
                {t.question}
              </button>
              <button
                type="button"
                className="tool"
                aria-pressed={panel === 'termin'}
                onClick={() => toggle('termin')}
              >
                {t.termin}
              </button>
              <button
                type="button"
                className="tool"
                aria-pressed={panel === 'ersatzteil'}
                onClick={() => toggle('ersatzteil')}
              >
                {t.part}
              </button>
              {photoText ? (
                <button type="button" className="tool" onClick={() => insert(photoText)}>
                  {t.photo}
                </button>
              ) : null}
              <Link className="tool" href={videoHref}>
                {t.video}
              </Link>
            </>
          ) : null}
        </div>
        <div className="ctools-right">
          {state.message ? (
            <span className={`hint${state.ok ? '' : ' bad'}`} role="status" key={state.n}>
              {state.message}
            </span>
          ) : null}
          {panel ? (
            <button type="button" className="btn btn-2 btn-sm" onClick={() => setPanel(undefined)}>
              {t.cancel}
            </button>
          ) : null}
          <button className="btn btn-sm" type="submit" disabled={!canSend || pending}>
            {mode === 'notiz' && !panel ? t.save : t.send}
          </button>
        </div>
      </div>
    </form>
  );
}

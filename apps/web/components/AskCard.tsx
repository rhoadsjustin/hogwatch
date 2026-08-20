'use client';

import { useState } from 'react';

export type AskContext = {
  entity: 'season' | 'game' | 'matchup' | 'coach' | 'player' | 'metric' | 'record';
  entityId: string;
  metricIds: string[];
  /** What is on screen, so the answer can speak to the visible chart. */
  view?: { metricId?: string; weeks?: number[]; screen?: string };
};

type Reference = { label: string; metricId?: string; week?: number; value?: number };
type Turn = { role: 'user' | 'assistant'; content: string; references?: Reference[]; followUps?: string[] };

const apiUrl = process.env.NEXT_PUBLIC_HOGWATCH_API_URL;

/**
 * A bound question panel rather than a one-shot summariser: it sends the
 * on-screen context, keeps the thread, and shows the metrics the answer cited
 * so a reader can tie the prose back to the chart beside it.
 */
export function AskCard({ context, label = 'Ask HogWatch about this' }: { context: AskContext; label?: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const send = async (asked: string) => {
    if (!apiUrl || pending) return;
    const history = turns.map((turn) => ({ role: turn.role, content: turn.content }));
    setTurns((current) => [...current, { role: 'user', content: asked }]);
    setQuestion('');
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: context.entity,
          id: context.entityId,
          metricIds: context.metricIds,
          question: asked,
          history,
          view: context.view,
        }),
      });
      const body = await response.json().catch(() => undefined) as { data?: Turn & { answer?: string }; message?: string } | undefined;
      if (!response.ok || !body?.data) throw new Error(body?.message ?? `HogWatch could not answer that (${response.status}).`);
      const data = body.data as unknown as { answer: string; references?: Reference[]; followUps?: string[] };
      setTurns((current) => [...current, { role: 'assistant', content: data.answer, references: data.references, followUps: data.followUps }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'HogWatch could not answer that.');
    } finally {
      setPending(false);
    }
  };

  const latest = turns.at(-1);
  const suggestions = latest?.role === 'assistant' && latest.followUps?.length ? latest.followUps : undefined;

  if (!apiUrl) {
    return (
      <section className="askPanel disabled" aria-label="Ask HogWatch">
        <span className="askSpark" aria-hidden="true">✦</span>
        <div>
          <small>ASK HOGWATCH</small>
          <p>Answers are served by the HogWatch Worker. Set <code>NEXT_PUBLIC_HOGWATCH_API_URL</code> to enable them here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="askPanel" aria-label="Ask HogWatch">
      <div className="askPanelHead">
        <span className="askSpark" aria-hidden="true">✦</span>
        <div><small>ASK HOGWATCH</small><b>{label}</b></div>
      </div>

      {turns.length > 0 && (
        <ol className="askThread">
          {turns.map((turn, index) => (
            <li className={`askTurn ${turn.role}`} key={`${turn.role}-${index}`}>
              <p>{turn.content}</p>
              {turn.references?.length ? (
                <ul className="askReferences">
                  {turn.references.map((reference, referenceIndex) => (
                    <li key={`${reference.label}-${referenceIndex}`}>
                      {reference.label}
                      {reference.value !== undefined && <b> {reference.value}</b>}
                      {reference.week !== undefined && <i> · W{reference.week}</i>}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {error && <p className="askError">{error}</p>}

      <form
        className="askForm"
        onSubmit={(event) => {
          event.preventDefault();
          const asked = question.trim();
          if (asked) void send(asked);
        }}
      >
        <input
          aria-label="Ask a question about this page"
          disabled={pending}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={pending ? 'Reading the evidence…' : 'Ask about what is on this page…'}
          value={question}
        />
        <button disabled={pending || !question.trim()} type="submit">{pending ? '…' : 'Ask'}</button>
      </form>

      {suggestions && (
        <div className="askFollowUps">
          {suggestions.map((followUp) => (
            <button key={followUp} onClick={() => void send(followUp)} type="button" disabled={pending}>{followUp}</button>
          ))}
        </div>
      )}
    </section>
  );
}

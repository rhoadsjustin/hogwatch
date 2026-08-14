'use client';

import { useState } from 'react';

export type AskContext = {
  entity: 'season' | 'game' | 'coach' | 'player' | 'trend';
  entityId: string;
  metricIds: string[];
};

type AskCardProps = {
  context: AskContext;
  inFlow?: boolean;
  label?: string;
};

/**
 * Keeps the future ChatGPT handoff as compact, provider-neutral data. A host
 * integration can read `data-hogwatch-context` without parsing a prose prompt.
 */
export function AskCard({ context, inFlow = false, label = 'Ask ChatGPT about this' }: AskCardProps) {
  const [queued, setQueued] = useState(false);
  const serializedContext = JSON.stringify(context);
  const queueContext = () => {
    setQueued(true);
    window.dispatchEvent(new CustomEvent('hogwatch:ask', { detail: context }));
  };

  return (
    <button
      aria-label={label}
      className="ask"
      data-hogwatch-context={serializedContext}
      onClick={queueContext}
      style={inFlow ? { bottom: 'auto', position: 'relative', zIndex: 0 } : undefined}
      type="button"
    >
      <span className="askSpark" aria-hidden="true">✦</span>
      <span>
        <small>{queued ? 'CONTEXT READY' : 'ASK CHATGPT'}</small>
        {queued ? 'HogWatch context is ready to hand off' : label}
      </span>
      <span className="askArrow" aria-hidden="true">↗</span>
    </button>
  );
}

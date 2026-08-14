export function AskCard({ label = 'Ask ChatGPT about this' }: { label?: string }) {
  return <button className="ask" type="button"><span>✦</span><span>{label}</span><span>›</span></button>;
}

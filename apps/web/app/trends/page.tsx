import { AskCard } from '../../components/AskCard';
import { MetricCard } from '../../components/MetricCard';
import { BackLink, SectionHeading } from '../../components/PageChrome';
import { TrendLine } from '../../components/TrendLine';

const trendCards = [
  { label: 'Pressure allowed', value: '34% → 29%', detail: 'Five points better', trend: 'up' as const, tone: 'good' as const },
  { label: 'Defensive pressure', value: '31% → 37%', detail: 'Four-man heat is growing', trend: 'up' as const, tone: 'good' as const },
  { label: 'Rush success', value: '46% → 48%', detail: 'A small but real step', trend: 'up' as const, tone: 'good' as const },
  { label: 'Explosives allowed', value: '4 → 5', detail: 'Volatility is still the concern', trend: 'down' as const, tone: 'watch' as const },
];

export default function Trends() {
  return <div className="shell detailPage">
    <BackLink>Season dashboard</BackLink>
    <section className="detailMasthead"><div><span className="overline">2026 · ROLLING AND OPPONENT-ADJUSTED</span><h1>Trend <em>explorer</em></h1><p>Look for movement that holds up from one opponent to the next.</p></div><div className="filterChip">2 GAMES<br /><b>IN VIEW</b></div></section>
    <section className="trendHero"><span className="overline">SEASON READ</span><h2>The process is better. Explosives are the remaining red flag.</h2><p>Arkansas improved the protection and pressure numbers that tend to travel; the next proof point is whether those gains survive the Georgia matchup.</p></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="SIGNAL BOARD" title="Where the needle moved" /><div className="metricGrid">{trendCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="ROLLING VIEW" title="Trends, not snapshots" /><div className="trendStack"><TrendLine label="HOG Index" values={[68, 74]} tone="cardinal" /><TrendLine label="Offensive success rate" suffix="%" values={[44, 46]} /><TrendLine label="Defensive pressure" suffix="%" values={[31, 37]} tone="cardinal" /><TrendLine label="Explosives allowed" values={[4, 5]} tone="watch" /></div></section>
    <section className="trendMethod"><span className="overline">HOW TO READ THIS</span><p>Each indicator is compared to opponent context before it feeds the HOG Index. The directional labels describe the football outcome, not whether the raw number happens to rise.</p></section>
    <AskCard context={{ entity: 'trend', entityId: 'arkansas-2026-week-2', metricIds: ['hog-index', 'pressure-allowed', 'pressure-generated', 'rush-success', 'explosives-allowed'] }} label="Ask ChatGPT to explain these trends" />
  </div>;
}

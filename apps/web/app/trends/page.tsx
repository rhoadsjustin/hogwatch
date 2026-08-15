import { AskCard } from '../../components/AskCard';
import { MetricCard } from '../../components/MetricCard';
import { BackLink, SectionHeading } from '../../components/PageChrome';
import { TrendLine } from '../../components/TrendLine';
import { mockHogWatchRepository } from '@hogwatch/data';

const trendDetail = {
  'pressure-allowed': 'Five points better',
  'pressure-generated': 'Four-man heat is growing',
  'rush-success': 'A small but real step',
  'explosives-allowed': 'Volatility is still the concern',
} as const;

export default async function Trends() {
  const trendIds = ['hog-index', 'success-rate', 'pressure-generated', 'explosives-allowed'] as const;
  const [dashboard, pressureAllowed, pressureGenerated, rushSuccess, explosivesAllowed, ...trendLines] = await Promise.all([
    mockHogWatchRepository.getSeasonDashboard(),
    mockHogWatchRepository.getMetricTrend('pressure-allowed'),
    mockHogWatchRepository.getMetricTrend('pressure-generated'),
    mockHogWatchRepository.getMetricTrend('rush-success'),
    mockHogWatchRepository.getMetricTrend('explosives-allowed'),
    ...trendIds.map((metricId) => mockHogWatchRepository.getMetricTrend(metricId)),
  ]);
  const trendCards = [pressureAllowed, pressureGenerated, rushSuccess, explosivesAllowed].filter((trend): trend is NonNullable<typeof trend> => Boolean(trend));

  return <div className="shell detailPage">
    <BackLink>Season dashboard</BackLink>
    <section className="detailMasthead"><div><span className="overline">{dashboard.season} · ROLLING AND OPPONENT-ADJUSTED</span><h1>Trend <em>explorer</em></h1><p>Look for movement that holds up from one opponent to the next.</p></div><div className="filterChip">{dashboard.completedGames} GAMES<br /><b>IN VIEW</b></div></section>
    <section className="trendHero"><span className="overline">SEASON READ</span><h2>The process is better. Explosives are the remaining red flag.</h2><p>Arkansas improved the protection and pressure numbers that tend to travel; the next proof point is whether those gains survive the Georgia matchup.</p></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="SIGNAL BOARD" title="Where the needle moved" /><div className="metricGrid">{trendCards.map((metric) => {
      const first = metric.values.at(0) ?? 0;
      const latest = metric.values.at(-1) ?? 0;
      const improving = metric.goodDirection === 'up' ? latest >= first : latest <= first;
      return <MetricCard detail={trendDetail[metric.metricId as keyof typeof trendDetail]} key={metric.metricId} label={metric.metricId === 'pressure-generated' ? 'Defensive pressure' : metric.label} tone={improving ? 'good' : 'watch'} trend={improving ? 'up' : 'down'} value={`${first}${metric.suffix ?? ''} → ${latest}${metric.suffix ?? ''}`} />;
    })}</div></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="ROLLING VIEW" title="Trends, not snapshots" /><div className="trendStack">{trendLines.map((trend) => trend && <TrendLine key={trend.metricId} label={trend.metricId === 'pressure-generated' ? 'Defensive pressure' : trend.label} suffix={trend.suffix} values={trend.values} tone={trend.metricId === 'hog-index' || trend.metricId === 'pressure-generated' ? 'cardinal' : trend.metricId === 'explosives-allowed' ? 'watch' : 'good'} />)}</div></section>
    <section className="trendMethod"><span className="overline">HOW TO READ THIS</span><p>Each indicator is compared to opponent context before it feeds the HOG Index. The directional labels describe the football outcome, not whether the raw number happens to rise.</p></section>
    <AskCard context={{ entity: 'trend', entityId: 'arkansas-2026-week-2', metricIds: ['hog-index', 'pressure-allowed', 'pressure-generated', 'rush-success', 'explosives-allowed'] }} label="Ask ChatGPT to explain these trends" />
  </div>;
}

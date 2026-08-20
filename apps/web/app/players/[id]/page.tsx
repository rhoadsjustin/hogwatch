import { notFound } from 'next/navigation';
import { AskCard } from '../../../components/AskCard';
import { DataProvenance } from '../../../components/DataProvenance';
import { MetricCard } from '../../../components/MetricCard';
import { BackLink, SectionHeading } from '../../../components/PageChrome';
import { MetricChart } from '../../../components/MetricChart';
import { hogWatchRepository } from '@hogwatch/data';

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await hogWatchRepository.getPlayerReport(id);
  if (!report) notFound();
  const { player, insight, provenance } = report;

  return <div className="shell detailPage">
    <BackLink>Player stock</BackLink>
    <DataProvenance provenance={provenance} scope="player report" />
    <section className="profileMasthead playerMasthead"><div><span className="overline">#{player.number} · {player.position} · {player.classYear}</span><h1>{player.name}</h1><p>{player.height} · {player.weight} lbs · {player.hometown}</p></div><div className={`stockBadge ${insight.stock.toLowerCase()}`}><span>STOCK</span><strong>{insight.stock}</strong><small>{insight.stockNote}</small></div></section>
    <section className="playerRole"><span className="overline">ROLE ON FILM</span><h2>{insight.role}</h2><p>{insight.story}</p></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="SEASON SNAPSHOT" title="Box score, with context" /><div className="metricGrid">{Object.entries(player.stats).map(([label, value]) => <MetricCard detail={insight.details[label] ?? 'Season to date'} key={label} label={label} tone="good" trend="up" value={value} />)}</div></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="ROLE TREND" title={insight.trend.label} /><MetricChart metricId={insight.trend.metricId} label={insight.trend.label} suffix={insight.trend.suffix} values={insight.trend.values} weeks={insight.trend.weeks} tone="cardinal" /></section>
    <AskCard context={{ entity: 'player', entityId: player.id, metricIds: insight.metricIds, view: { screen: 'player report' } }} label={`Ask ChatGPT about ${player.name}`} />
  </div>;
}

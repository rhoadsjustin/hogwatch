import { notFound } from 'next/navigation';
import { AskCard } from '../../../components/AskCard';
import { MetricCard } from '../../../components/MetricCard';
import { BackLink, SectionHeading } from '../../../components/PageChrome';
import { TrendLine } from '../../../components/TrendLine';
import { getPlayer, getPlayerInsight } from '../../../lib/data';

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = getPlayer(id);
  const insight = getPlayerInsight(id);
  if (!player || !insight) notFound();

  return <div className="shell detailPage">
    <BackLink>Player stock</BackLink>
    <section className="profileMasthead playerMasthead"><div><span className="overline">#{player.number} · {player.position} · {player.classYear}</span><h1>{player.name}</h1><p>{player.height} · {player.weight} lbs · {player.hometown}</p></div><div className={`stockBadge ${insight.stock.toLowerCase()}`}><span>STOCK</span><strong>{insight.stock}</strong><small>{insight.stockNote}</small></div></section>
    <section className="playerRole"><span className="overline">ROLE ON FILM</span><h2>{insight.role}</h2><p>{insight.story}</p></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="SEASON SNAPSHOT" title="Box score, with context" /><div className="metricGrid">{Object.entries(player.stats).map(([label, value]) => <MetricCard detail={insight.details[label] ?? 'Season to date'} key={label} label={label} tone="good" trend="up" value={value} />)}</div></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="ROLE TREND" title={insight.trendLabel} /><TrendLine label={insight.trendLabel} suffix={insight.suffix} values={insight.weeklyValues} tone="cardinal" /></section>
    <AskCard context={{ entity: 'player', entityId: player.id, metricIds: insight.metricIds }} label={`Ask ChatGPT about ${player.name}`} />
  </div>;
}

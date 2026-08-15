import { notFound } from 'next/navigation';
import { AskCard } from '../../../components/AskCard';
import { MetricCard } from '../../../components/MetricCard';
import { BackLink, SectionHeading } from '../../../components/PageChrome';
import { TrendLine } from '../../../components/TrendLine';
import { mockHogWatchRepository } from '@hogwatch/data';

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await mockHogWatchRepository.getCoachReport(id);
  if (!report) notFound();
  const { coach, trend, implication } = report;

  return <div className="shell detailPage">
    <BackLink>Staff scorecard</BackLink>
    <section className="profileMasthead"><div><span className="overline">{coach.role}</span><h1>{coach.name}</h1><p>{coach.note}</p></div><div className="letterGrade"><span>SEASON GRADE</span><strong>{coach.grade}</strong></div></section>
    <section className="coachPulse"><span className="overline">COACHING IMPLICATION</span><h2>{implication}</h2></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="SCORECARD" title="What this grade is measuring" /><div className="metricGrid">{coach.scorecard.map((item) => <MetricCard detail={item.grade} key={item.label} label={item.label} tone={item.score >= 80 ? 'good' : item.score < 75 ? 'watch' : 'neutral'} trend={item.score >= 80 ? 'up' : 'flat'} value={item.score} />)}</div></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="WEEKLY TREND" title="Opponent-adjusted coaching score" /><TrendLine label={trend.label} values={trend.values} /></section>
    <AskCard context={{ entity: 'coach', entityId: coach.id, metricIds: coach.scorecard.map((item) => item.label.toLowerCase().replaceAll(' ', '-')) }} label={`Ask ChatGPT about ${coach.name}`} />
  </div>;
}

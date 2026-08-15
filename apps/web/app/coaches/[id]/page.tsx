import { notFound } from 'next/navigation';
import { AskCard } from '../../../components/AskCard';
import { BackLink, SectionHeading } from '../../../components/PageChrome';
import { Scorecard } from '../../../components/Scorecard';
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
    <section className="sectionBlock compact"><SectionHeading eyebrow="SCORECARD" title="What this grade is measuring" /><Scorecard items={coach.scorecard} label={`${coach.name} scorecard`} /></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="WEEKLY TREND" title="Opponent-adjusted coaching score" /><TrendLine label={trend.label} values={trend.values} /></section>
    <AskCard context={{ entity: 'coach', entityId: coach.id, metricIds: coach.scorecard.map((item) => item.label.toLowerCase().replaceAll(' ', '-')) }} label={`Ask ChatGPT about ${coach.name}`} />
  </div>;
}

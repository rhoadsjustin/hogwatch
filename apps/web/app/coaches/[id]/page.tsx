import { notFound } from 'next/navigation';
import { AskCard } from '../../../components/AskCard';
import { MetricCard } from '../../../components/MetricCard';
import { BackLink, SectionHeading } from '../../../components/PageChrome';
import { TrendLine } from '../../../components/TrendLine';
import { getCoach } from '../../../lib/data';

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coach = getCoach(id);
  if (!coach) notFound();
  const trend = coach.id === 'roberts' ? [72, 77, 81, 85] : coach.id === 'cramsey' ? [68, 71, 74, 77] : [70, 73, 75, 78];

  return <div className="shell detailPage">
    <BackLink>Staff scorecard</BackLink>
    <section className="profileMasthead"><div><span className="overline">{coach.role}</span><h1>{coach.name}</h1><p>{coach.note}</p></div><div className="letterGrade"><span>SEASON GRADE</span><strong>{coach.grade}</strong></div></section>
    <section className="coachPulse"><span className="overline">COACHING IMPLICATION</span><h2>{coach.id === 'roberts' ? 'The front is winning without borrowing numbers.' : coach.id === 'cramsey' ? 'The line is giving the offense a chance to stay on schedule.' : 'The operation is trending toward cleaner football.'}</h2></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="SCORECARD" title="What this grade is measuring" /><div className="metricGrid">{coach.scorecard.map((item) => <MetricCard detail={item.grade} key={item.label} label={item.label} tone={item.score >= 80 ? 'good' : item.score < 75 ? 'watch' : 'neutral'} trend={item.score >= 80 ? 'up' : 'flat'} value={item.score} />)}</div></section>
    <section className="sectionBlock compact"><SectionHeading eyebrow="WEEKLY TREND" title="Opponent-adjusted coaching score" /><TrendLine label={`${coach.name} score`} values={trend} /></section>
    <AskCard context={{ entity: 'coach', entityId: coach.id, metricIds: coach.scorecard.map((item) => item.label.toLowerCase().replaceAll(' ', '-')) }} label={`Ask ChatGPT about ${coach.name}`} />
  </div>;
}

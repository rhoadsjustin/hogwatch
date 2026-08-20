import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, Share, Text, TextInput, View } from 'react-native';

import { colors, radius } from '@/theme';
import type { HogWatchChatClient, HogWatchChatReference } from '@/data/worker-client';
import {
  METRIC_METADATA,
  MINIMUM_TREND_POINTS,
  PREDICTION_CONFIDENCE_LABELS,
  metricChartDomain,
  metricPercentile,
  type AnalyticsProvenance,
  type GamePrediction,
  type MatchupPreview,
  type MetricId,
  type PredictionRecord,
  type TeamMetricProfile,
} from '@hogwatch/core';

export function Card({ children, tone = 'light' }: PropsWithChildren<{ tone?: 'light' | 'dark' | 'cardinal' }>) {
  const backgroundColor = tone === 'dark' ? colors.charcoal : tone === 'cardinal' ? colors.cardinal : colors.surface;
  return (
    <View style={{ backgroundColor, borderCurve: 'continuous', borderRadius: radius.card, padding: 18, gap: 10, boxShadow: tone === 'light' ? '0 5px 20px rgba(22, 19, 18, 0.06)' : undefined }}>
      {children}
    </View>
  );
}

export function Eyebrow({ children, light = false }: PropsWithChildren<{ light?: boolean }>) {
  return <Text style={{ color: light ? '#F6D9DE' : colors.cardinal, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }}>{children}</Text>;
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
      <View style={{ gap: 4, flex: 1 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text style={{ color: colors.ink, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5 }}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Pill({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'good' | 'watch' | 'cardinal' }>) {
  const palette = {
    neutral: { backgroundColor: colors.soft, color: colors.muted },
    good: { backgroundColor: '#DCF2E8', color: colors.positive },
    watch: { backgroundColor: '#FBE9D5', color: colors.warning },
    cardinal: { backgroundColor: '#F7E0E5', color: colors.cardinalDark },
  }[tone];
  return <View style={{ alignSelf: 'flex-start', borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 9, paddingVertical: 5, backgroundColor: palette.backgroundColor }}><Text style={{ color: palette.color, fontSize: 11, fontWeight: '800' }}>{children}</Text></View>;
}

/**
 * Says whether a surface is reading live data or fixtures. HogWatch mixes the
 * two, so no screen should leave a reader guessing which is which.
 */
export function Provenance({ provenance, scope }: { provenance: AnalyticsProvenance; scope?: string }) {
  const fixture = provenance.source === 'mock';
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.soft, borderRadius: radius.small, borderCurve: 'continuous', padding: 13 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, marginTop: 5, backgroundColor: fixture ? colors.warning : colors.positive }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }}>{fixture ? 'FIXTURE DATA' : 'LIVE DATA'}{scope ? ` · ${scope.toUpperCase()}` : ''}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{provenance.coverage}</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{provenance.provider}</Text>
      </View>
    </View>
  );
}

export function ProvenanceTag({ basis }: { basis: 'fixture' | 'live' | 'modelled' }) {
  return <Pill tone={basis === 'live' ? 'good' : 'watch'}>{basis.toUpperCase()}</Pill>;
}

const CHART_HEIGHT = 104;

/**
 * One chart primitive with a fixed per-metric domain and the FBS average
 * marked, so a two-point series cannot autoscale itself into a breakout.
 * Below four observations the points are plotted in place rather than joined,
 * because a line between two dots asserts a direction the data cannot support.
 */
export function MetricChart({ metricId, values, weeks, label, suffix, tone = 'cardinal' }: {
  metricId: MetricId;
  values: readonly number[];
  weeks?: readonly number[];
  label?: string;
  suffix?: string;
  tone?: 'cardinal' | 'positive' | 'warning';
}) {
  const metadata = METRIC_METADATA[metricId];
  const domain = metricChartDomain(metricId);
  const unit = suffix ?? metadata.suffix ?? '';
  const color = tone === 'positive' ? colors.positive : tone === 'warning' ? colors.warning : colors.cardinal;
  const weekLabels = weeks ?? values.map((_, index) => index + 1);
  const latest = values.at(-1);
  const first = values.at(0);
  const delta = latest !== undefined && first !== undefined ? Math.round((latest - first) * 10) / 10 : 0;
  const favourable = metadata.goodDirection === 'up' ? delta >= 0 : delta <= 0;
  const enoughForTrend = values.length >= MINIMUM_TREND_POINTS;
  const fraction = (value: number) => {
    const span = domain.max - domain.min || 1;
    return Math.min(1, Math.max(0, (Math.min(domain.max, Math.max(domain.min, value)) - domain.min) / span));
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', flex: 1 }}>{label ?? metadata.label}</Text>
        <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{latest}{unit}</Text>
      </View>

      <View
        accessibilityRole="image"
        accessibilityLabel={`${label ?? metadata.label}: ${values.map((value, index) => `week ${weekLabels[index]} ${value}${unit}`).join(', ')}. FBS average ${domain.reference}${unit}. Axis fixed from ${domain.min} to ${domain.max}.`}
        style={{ height: CHART_HEIGHT, backgroundColor: colors.soft, borderRadius: radius.small, borderCurve: 'continuous', overflow: 'hidden' }}
      >
        <View style={{ position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line, top: (1 - fraction(domain.reference)) * CHART_HEIGHT }} />
        <View style={{ flexDirection: 'row', flex: 1, alignItems: 'stretch' }}>
          {values.map((value, index) => {
            const isLatest = index === values.length - 1;
            const top = (1 - fraction(value)) * (CHART_HEIGHT - 12);
            return (
              <View key={`${value}-${index}`} style={{ flex: 1, position: 'relative' }}>
                {enoughForTrend && (
                  <View style={{ position: 'absolute', left: '50%', width: 2, top: top + 6, bottom: 0, backgroundColor: `${color}33` }} />
                )}
                <View style={{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center' }}>
                  <View style={{ width: isLatest ? 12 : 9, height: isLatest ? 12 : 9, borderRadius: 6, backgroundColor: isLatest ? color : `${color}88` }} />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted, fontSize: 10 }}>{domain.min}{unit}</Text>
        <Text style={{ color: colors.muted, fontSize: 10 }}>FBS avg {domain.reference}{unit}</Text>
        <Text style={{ color: colors.muted, fontSize: 10 }}>{domain.max}{unit}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>{weekLabels.map((week) => `W${week}`).join(' · ')}</Text>
        {latest !== undefined && (
          <Text style={{ color: favourable ? colors.positive : colors.warning, fontSize: 12, fontWeight: '800' }}>
            {delta > 0 ? '+' : ''}{delta}{unit} · {metricPercentile(metricId, latest)}th pct
          </Text>
        )}
      </View>

      {!enoughForTrend && (
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
          {values.length} game{values.length === 1 ? '' : 's'} — plotted in place, not joined into a trend.
        </Text>
      )}
    </Card>
  );
}

/** The projection with its uncertainty attached, and its record once scored. */
export function PredictionCard({ prediction, opponentShort = 'OPP' }: { prediction: GamePrediction; opponentShort?: string }) {
  const lean = prediction.winProbability >= 50 ? 'ARKANSAS LEAN' : 'UPSET PATH';
  const { low, high } = prediction.likelyMargin;
  const span = high - low || 1;
  const clampPercent = (value: number): `${number}%` => `${Math.min(100, Math.max(0, ((value - low) / span) * 100))}%`;

  return (
    <Card tone="dark">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow light>HOGWATCH PREDICTION</Eyebrow>
          <Text style={{ color: '#FFFFFF', fontSize: 22, lineHeight: 27, fontWeight: '900' }}>{lean}</Text>
          <Text style={{ color: '#D7D2D0', fontSize: 12, lineHeight: 18 }}>{PREDICTION_CONFIDENCE_LABELS[prediction.confidence]} · margin in points, σ {prediction.marginStandardDeviation}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800' }}>WIN CHANCE</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 37, lineHeight: 40, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{prediction.winProbability}%</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FFFFFF24', borderBottomWidth: 1, borderBottomColor: '#FFFFFF24' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{prediction.projectedArkansasScore}</Text>
        <Text style={{ color: '#D7D2D0', fontSize: 14, fontWeight: '800' }}>ARK</Text>
        <Text style={{ color: '#937D83', fontSize: 18 }}>—</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{prediction.projectedOpponentScore}</Text>
        <Text style={{ color: '#D7D2D0', fontSize: 14, fontWeight: '800' }}>{opponentShort}</Text>
      </View>

      <View style={{ gap: 7 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800' }}>LIKELY MARGIN · CENTRAL 60%</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{low > 0 ? '+' : ''}{low} to {high > 0 ? '+' : ''}{high}</Text>
        </View>
        <View
          accessibilityRole="image"
          accessibilityLabel={`Six outcomes in ten land between ${low} and ${high} points, centred on ${prediction.projectedMargin}`}
          style={{ height: 14, borderRadius: radius.pill, backgroundColor: '#FFFFFF1F', overflow: 'visible' }}
        >
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius.pill, backgroundColor: '#D73B5455' }} />
          <View style={{ position: 'absolute', top: -3, bottom: -3, width: 1, backgroundColor: '#D7D2D0', left: clampPercent(0) }} />
          <Text style={{ position: 'absolute', top: 17, left: clampPercent(0), color: '#D7D2D0', fontSize: 10, transform: [{ translateX: -10 }] }}>tied</Text>
          <View style={{ position: 'absolute', top: -5, bottom: -5, width: 3, borderRadius: 2, backgroundColor: '#FFFFFF', left: clampPercent(prediction.projectedMargin) }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#B4A8AB', fontSize: 10 }}>{opponentShort} by {Math.abs(low)}</Text>
          <Text style={{ color: '#B4A8AB', fontSize: 10 }}>ARK by {Math.abs(high)}</Text>
        </View>
      </View>

      <Text style={{ color: '#E0DBD9', fontSize: 14, lineHeight: 20 }}>{prediction.summary}</Text>

      <View style={{ gap: 8 }}>
        {prediction.factors.map((factor) => (
          <View key={factor.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800', flex: 1 }}>{factor.label}</Text>
            <Text style={{ color: factor.tone === 'edge' ? '#A8D5A5' : factor.tone === 'watch' ? '#E6BD68' : '#D7D2D0', fontSize: 12, fontWeight: '700', textAlign: 'right' }}>{factor.detail}</Text>
          </View>
        ))}
      </View>

      {prediction.outcome && (
        <View style={{ borderWidth: 1, borderColor: prediction.outcome.calledWinnerCorrectly ? '#2F5238' : '#5C4A2A', borderRadius: radius.small, borderCurve: 'continuous', padding: 12, gap: 4 }}>
          <Text style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800' }}>HOW THE CALL AGED</Text>
          <Text style={{ color: '#E0DBD9', fontSize: 13, lineHeight: 19 }}>
            {prediction.outcome.calledWinnerCorrectly ? 'Called the winner.' : 'Called the wrong winner.'} Projected {prediction.projectedMargin > 0 ? '+' : ''}{prediction.projectedMargin}, actual {prediction.outcome.actualMargin > 0 ? '+' : ''}{prediction.outcome.actualMargin} — off by {Math.abs(prediction.outcome.marginError)} points. Brier {prediction.outcome.brierScore}.
          </Text>
        </View>
      )}
    </Card>
  );
}

function UnitBar({ who, metric, highlight }: { who: string; metric: TeamMetricProfile; highlight: boolean }) {
  const metadata = METRIC_METADATA[metric.metricId];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800', width: 42 }}>{who}</Text>
      <View style={{ flex: 1, height: 14, borderRadius: 4, backgroundColor: colors.soft, overflow: 'visible' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${metric.percentile}%`, borderRadius: 4, backgroundColor: highlight ? colors.cardinal : colors.muted }} />
        <View style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, backgroundColor: colors.line }} />
      </View>
      <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '700', width: 62, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
        {metric.value}{metadata.suffix ?? ''}{metric.basis === 'modelled' ? '~' : ''}
      </Text>
    </View>
  );
}

/** The matchup as positional collisions on a shared national-percentile axis. */
export function MatchupPanel({ preview }: { preview: MatchupPreview }) {
  const modelled = preview.opponent.metrics.filter((metric) => metric.basis === 'modelled').length;
  return (
    <View style={{ gap: 12 }}>
      <SectionHeader eyebrow="WHERE THIS GAME IS WON" title={`Arkansas vs. ${preview.opponent.name}`} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, flex: 1 }}>Both teams on the same national-percentile axis. Longer is better football, whichever way the raw number runs.</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>NEUTRAL FIELD</Text>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              ARK {preview.arkansas.rating.power > 0 ? '+' : ''}{preview.arkansas.rating.power}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              {preview.opponent.shortName} {preview.opponent.rating.power > 0 ? '+' : ''}{preview.opponent.rating.power}
            </Text>
          </View>
        </View>

        <View style={{ gap: 16, marginTop: 4 }}>
          {preview.edges.map((edge) => (
            <View key={edge.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '800', flex: 1 }}>{edge.label}</Text>
                <Text style={{ color: edge.edge === 'arkansas' ? colors.positive : edge.edge === 'opponent' ? colors.warning : colors.muted, fontSize: 11, fontWeight: '800' }}>
                  {edge.edge === 'even' ? 'EVEN' : edge.edge === 'arkansas' ? 'ARK EDGE' : `${preview.opponent.shortName} EDGE`}
                </Text>
              </View>
              <UnitBar who="ARK" metric={edge.arkansas} highlight />
              <UnitBar who={preview.opponent.shortName} metric={edge.opponent} highlight={false} />
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Eyebrow>SWING FACTORS</Eyebrow>
        {preview.swingFactors.map((edge) => (
          <View key={edge.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' }}>{edge.shortLabel}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'right', flex: 1 }}>
              {edge.edge === 'even' ? 'level' : `${edge.edge === 'arkansas' ? 'Arkansas' : preview.opponent.shortName} by ${Math.abs(edge.gap)}`}
            </Text>
          </View>
        ))}
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
          {modelled} of {preview.opponent.metrics.length} {preview.opponent.name} values are modelled from composite grades, marked ~. {preview.game.week > 1 ? `Arkansas values are measured through Week ${preview.game.week - 1} where available.` : 'Arkansas has no completed games yet, so its values are modelled too.'}
        </Text>
      </Card>
    </View>
  );
}

/** The model's own report card, so its calls can be checked rather than trusted. */
export function PredictionRecordCard({ record }: { record: PredictionRecord }) {
  const beatsCoinFlip = record.gamesScored > 0 && record.brierScore < record.coinFlipBrierScore;
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Eyebrow>MODEL RECORD</Eyebrow>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '900' }}>How the calls have aged</Text>
        </View>
        <Pill tone={record.gamesScored === 0 ? 'neutral' : beatsCoinFlip ? 'good' : 'watch'}>
          {record.gamesScored === 0 ? 'NO GAMES YET' : beatsCoinFlip ? 'BEATS A COIN FLIP' : 'NO BETTER THAN A COIN FLIP'}
        </Pill>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          ['CORRECT', `${record.correctCalls}/${record.gamesScored}`],
          ['MARGIN MISS', `${record.meanAbsoluteMarginError}`],
          ['BRIER', `${record.brierScore}`],
        ].map(([label, value]) => (
          <View key={label} style={{ flex: 1, backgroundColor: colors.soft, borderRadius: radius.small, borderCurve: 'continuous', padding: 11, gap: 3 }}>
            <Text style={{ color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }}>{label}</Text>
            <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{record.note}</Text>
      {record.entries.map((entry) => (
        <View key={entry.gameId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9 }}>
          <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700', flex: 1 }}>W{entry.week} · {entry.opponent}</Text>
          <Text style={{ color: entry.calledWinnerCorrectly ? colors.positive : colors.warning, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {entry.winProbability}% {entry.calledWinnerCorrectly ? '✓' : '✗'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, fontVariant: ['tabular-nums'], width: 96, textAlign: 'right' }}>
            {entry.projectedMargin > 0 ? '+' : ''}{entry.projectedMargin} → {entry.actualMargin > 0 ? '+' : ''}{entry.actualMargin}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export function MetricDelta({ delta, goodDirection, sinceLabel = 'vs last week' }: { delta?: number; goodDirection?: 'up' | 'down'; sinceLabel?: string }) {
  if (delta === undefined || !goodDirection) return null;
  const favorable = goodDirection === 'up' ? delta >= 0 : delta <= 0;
  const arrow = delta === 0 ? '—' : delta > 0 ? '↑' : '↓';
  return <Text style={{ color: favorable ? colors.positive : colors.warning, fontSize: 13, fontWeight: '800' }}>{arrow} {Math.abs(delta).toFixed(0)} {sinceLabel}</Text>;
}

type AskTurn = { role: 'user' | 'assistant'; content: string; references?: HogWatchChatReference[]; followUps?: string[] };

/**
 * A bound question panel: it sends what is on screen, keeps the thread, and
 * shows the metrics the answer cited so the prose ties back to the chart.
 */
export function AskPanel({ entity, id, metricIds, chatClient, view, label = 'Ask HogWatch about this' }: {
  entity: 'season' | 'game' | 'matchup' | 'coach' | 'player' | 'metric' | 'record';
  id: string;
  metricIds: readonly string[];
  chatClient?: HogWatchChatClient;
  view?: { metricId?: string; weeks?: readonly number[]; screen?: string };
  label?: string;
}) {
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const send = async (asked: string) => {
    if (pending || !asked.trim()) return;
    if (!chatClient) {
      await Share.share({ message: `Use this HogWatch context to explain the football story: ${JSON.stringify({ app: 'HogWatch', entity, id, metricIds })}` });
      return;
    }
    const history = turns.map((turn) => ({ role: turn.role, content: turn.content }));
    setTurns((current) => [...current, { role: 'user', content: asked }]);
    setQuestion('');
    setPending(true);
    setError(undefined);
    try {
      const result = await chatClient.ask({ entity, id, metricIds, question: asked, history, view });
      setTurns((current) => [...current, { role: 'assistant', content: result.answer, references: result.references, followUps: result.followUps }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'HogWatch could not answer that.');
    } finally {
      setPending(false);
    }
  };

  const latest = turns.at(-1);
  const suggestions = latest?.role === 'assistant' && latest.followUps?.length ? latest.followUps : undefined;

  return (
    <View style={{ gap: 11 }}>
      <SectionHeader eyebrow="ASK HOGWATCH" title={label} />
      {turns.map((turn, index) => (
        <Card key={`${turn.role}-${index}`} tone={turn.role === 'assistant' ? 'dark' : 'light'}>
          <Text selectable style={{ color: turn.role === 'assistant' ? '#FFFFFF' : colors.muted, fontSize: 14, lineHeight: 21, fontWeight: turn.role === 'assistant' ? '700' : '400', fontStyle: turn.role === 'user' ? 'italic' : 'normal' }}>
            {turn.content}
          </Text>
          {turn.references?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {turn.references.map((reference, referenceIndex) => (
                <View key={`${reference.label}-${referenceIndex}`} style={{ borderWidth: 1, borderColor: '#FFFFFF33', borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 9, paddingVertical: 4 }}>
                  <Text style={{ color: '#E0DBD9', fontSize: 11, fontWeight: '700' }}>
                    {reference.label}{reference.value !== undefined ? ` ${reference.value}` : ''}{reference.week !== undefined ? ` · W${reference.week}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ))}

      {error && <Card><Text style={{ color: colors.warning, fontSize: 14, lineHeight: 20, fontWeight: '700' }}>{error}</Text></Card>}

      {chatClient ? (
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <TextInput
            accessibilityLabel="Ask a question about this screen"
            editable={!pending}
            onChangeText={setQuestion}
            onSubmitEditing={() => void send(question)}
            placeholder={pending ? 'Reading the evidence…' : 'Ask about this screen…'}
            placeholderTextColor={colors.muted}
            returnKeyType="send"
            style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.small, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.ink }}
            value={question}
          />
          <Pressable
            accessibilityRole="button"
            disabled={pending || !question.trim()}
            onPress={() => void send(question)}
            style={({ pressed }) => ({ opacity: pressed || pending || !question.trim() ? 0.6 : 1, justifyContent: 'center', backgroundColor: colors.ink, borderRadius: radius.small, borderCurve: 'continuous', paddingHorizontal: 18 })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Ask</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => void send(label)}
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, backgroundColor: colors.ink, borderRadius: radius.small, borderCurve: 'continuous', paddingHorizontal: 15, paddingVertical: 13, alignItems: 'center' })}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Share this context with ChatGPT</Text>
        </Pressable>
      )}

      {suggestions && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((followUp) => (
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              key={followUp}
              onPress={() => void send(followUp)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 8 })}
            >
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{followUp}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function EmptyState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <Card>
      <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{detail}</Text>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: radius.small, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 11 })}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Try again</Text>
        </Pressable>
      )}
    </Card>
  );
}

export function LoadingState({ label = 'Reading the latest HogWatch report…' }: { label?: string }) {
  return <View style={{ paddingVertical: 40, alignItems: 'center' }}><Text style={{ color: colors.muted, fontSize: 14 }}>{label}</Text></View>;
}

export type { HogWatchChatClient };

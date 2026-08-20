# Data-provider contract

HogWatch deliberately does not select a statistics vendor. A future adapter is
the only code allowed to understand that vendor's transport, credentials, and
field names. It maps each fetched result to `HogWatchDataProvider` and
`ProviderSeasonSnapshot` in `@hogwatch/data`; web routes and MCP tools keep
using `HogWatchRepository`.

## Required raw data

For every completed Arkansas game, an adapter needs the game ID, week, date,
opponent, home/away designation, final score, and the following per-game
metrics. Rates must be supplied as percentages on a 0–100 scale, not 0–1.

| Canonical metric ID | Raw data needed | Direction |
| --- | --- | --- |
| `success-rate` | Arkansas offensive successful plays / offensive plays | Higher is better |
| `defensive-success-rate` | Opponent successful plays / opponent offensive plays | Lower is better |
| `pressure-allowed` | Arkansas dropbacks pressured / Arkansas dropbacks | Lower is better |
| `pressure-generated` | Opponent dropbacks pressured / opponent dropbacks | Higher is better |
| `four-man-pressure` | Pressures created with a four-man rush / opponent dropbacks | Higher is better |
| `explosives`, `explosives-allowed` | Offensive and defensive explosive-play counts using one documented threshold | Higher, lower |
| `rush-success`, `yards-before-contact` | Arkansas rush success rate and yards before first contact | Higher is better |
| `red-zone-touchdown-rate` | Arkansas red-zone TDs / red-zone trips | Higher is better |
| `turnover-worthy-play-rate` | Arkansas turnover-worthy plays / dropbacks | Lower is better |
| `missed-tackles` | Arkansas defensive missed-tackle count | Lower is better |
| `penalty-rate`, `pre-snap-penalty-rate` | Total and pre-snap Arkansas penalties / plays | Lower is better |
| `special-teams-score` | Normalized special-teams component score and its source inputs | Higher is better |
| `second-half-success-rate` | Arkansas second-half successful plays / second-half plays | Higher is better |

The adapter also supplies player roster/identity data, player game statistics,
coach scorecard inputs, and the four HOG Index component scores. Every value
must retain its raw provider field name in `NormalizedMetricValue.sourceField`
so ingestion logs can be audited without exposing vendor payloads to clients.

## Opponent team profiles

A matchup preview compares two teams, so an adapter must supply the opponent as
a team, not as a name. For every scheduled opponent, provide:

| Field | Meaning |
| --- | --- |
| `name`, `shortName` | Display strings. The canonical ID is derived with `toHogWatchId(name)`; never invent your own slug. |
| `grades.total` | Composite team strength on the HOG 0–100 scale. |
| `grades.offense`, `grades.defense` | Side-of-the-ball strength on the same scale. |
| `grades.units` | Optional per-metric grades where a unit differs from its side of the ball (an elite pass rush on an average defence). |
| `metrics` | Any canonical metric the vendor actually measures for that team, in the same units and perspective as the Arkansas table above. |

Anything not supplied under `metrics` is modelled from the grades with
`metricValueFromUnitGrade` and reported to clients with `basis: 'modelled'`.
Presentation surfaces must keep that distinction visible — a modelled value and
a measured value are not interchangeable evidence.

Grades feed `ratingFromHogIndex`, which converts them to points above an
average FBS team. The projection subtracts two point-denominated ratings, so a
provider that supplies ratings on any other scale will produce margins in the
wrong unit.

## Opponent adjustment and rolling windows

For each opponent-adjusted metric, provide the opponent's pre-game average in
the **same perspective** as the Arkansas observation plus the matching league
average and sample size. For example, offensive success rate uses the success
rate the opposing defense usually allows; pressure allowed uses the pressure
rate the opposing rush usually creates.

`@hogwatch/core` applies the transparent initial formula:

```text
adjusted = raw - (opponent average - league average)
```

It preserves the metric's unit and is intentionally not a predictive model.
Separately, `METRIC_DISTRIBUTIONS` holds the reference FBS mean and standard
deviation for every canonical metric. It is the single source of truth for
chart domains and for direction-aware percentiles, and a provider with real
league distributions should replace it wholesale rather than layering on top.
`calculateRollingAverage` produces a trailing average, using the available
games for early-season windows. Provider implementations should state their
baseline source and game cutoff in `AnalyticsProvenance.coverage`.

## Implementation checklist

1. Keep API calls and credentials inside a vendor-specific adapter.
2. Normalize raw fields to `MetricId` values before any repository method.
3. Reject duplicate canonical values for a game rather than silently choosing one.
4. Populate `opponentMetricBaselines` only from pre-game data; never leak
   post-game information into an adjustment.
5. Derive every game and team ID with `toHogWatchId` so the schedule provider,
   the fixture repository, and the stats vendor resolve the same opponent.
6. Label modelled values with `basis: 'modelled'`; never present them as
   measured.
7. Replace the composition root's mock repository only after adapter contract
   tests cover fixture, missing-data, and freshness behavior.

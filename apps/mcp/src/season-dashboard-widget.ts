export const SEASON_DASHBOARD_RESOURCE_URI = 'ui://hogwatch/season-dashboard-v1.html';

/**
 * A dependency-free MCP Apps component. It deliberately renders from tool
 * output only, so the same analytics data remains usable in non-UI clients.
 */
export const seasonDashboardWidget = `
  <main aria-live="polite">
    <header>
      <p class="eyebrow">HOGWATCH · 2026</p>
      <h1 id="team">Arkansas season dashboard</h1>
      <p id="record" class="record">Loading season evidence…</p>
    </header>
    <section class="score" aria-label="HOG Index">
      <span>HOG INDEX</span><strong id="hog-index">—</strong><small id="hog-delta"></small>
    </section>
    <section><h2>What changed</h2><p id="story"></p><ul id="signals"></ul></section>
    <footer id="provenance"></footer>
  </main>
  <style>
    :root { color: #f8f5f2; background: #171515; font-family: ui-sans-serif, system-ui, sans-serif; }
    main { box-sizing: border-box; min-width: 280px; padding: 20px; background: linear-gradient(145deg, #1f1b1b, #121111); border-radius: 16px; }
    .eyebrow, .score span { color: #e23b3b; font-size: 11px; font-weight: 800; letter-spacing: .12em; margin: 0; }
    h1 { font-size: 24px; line-height: 1.1; margin: 6px 0; } .record { color: #bfb8b4; margin: 0; }
    .score { align-items: baseline; border-block: 1px solid #493c3c; display: flex; gap: 12px; margin: 20px 0; padding: 16px 0; }
    .score strong { font-size: 52px; letter-spacing: -.06em; } .score small { color: #7ee0a7; font-weight: 700; }
    h2 { font-size: 15px; margin: 0 0 8px; } #story { color: #ddd5d0; line-height: 1.45; margin: 0; }
    ul { display: grid; gap: 8px; list-style: none; margin: 16px 0 0; padding: 0; }
    li { background: #292425; border-radius: 8px; display: flex; justify-content: space-between; padding: 10px; }
    li span { color: #bfb8b4; } footer { color: #908783; font-size: 11px; margin-top: 18px; }
  </style>
  <script type="module">
    const byId = (id) => document.getElementById(id);
    const formatValue = (signal) => signal.unit ? signal.value + signal.unit : signal.value;
    const formatDelta = (delta) => delta === undefined ? '' : (delta > 0 ? '+' : '') + delta;
    const render = (payload) => {
      const dashboard = payload?.dashboard ?? payload;
      if (!dashboard?.team) return;
      byId('team').textContent = dashboard.team + ' season dashboard';
      byId('record').textContent = dashboard.record + ' record · ' + dashboard.completedGames + ' games graded';
      byId('hog-index').textContent = dashboard.hogIndex?.total ?? '—';
      byId('hog-delta').textContent = dashboard.hogIndexDelta === undefined ? '' : formatDelta(dashboard.hogIndexDelta) + ' since last game';
      byId('story').textContent = dashboard.story ?? '';
      const signals = byId('signals'); signals.replaceChildren();
      for (const signal of dashboard.signals ?? []) {
        const item = document.createElement('li');
        const label = document.createElement('span'); label.textContent = signal.label;
        const value = document.createElement('strong'); value.textContent = formatValue(signal) + ' (' + formatDelta(signal.delta) + ')';
        item.append(label, value); signals.append(item);
      }
      const provenance = dashboard.provenance;
      byId('provenance').textContent = provenance ? 'Source: ' + provenance.provider + ' · ' + provenance.coverage : '';
    };
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (message?.jsonrpc !== '2.0') return;
      if (message.method === 'ui/initialize' || message.method === 'ui/notifications/tool-result') {
        render(message.params?.structuredContent ?? message.params?.toolOutput ?? message.params);
      }
    }, { passive: true });
  </script>
`.trim();

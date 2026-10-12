export const scenarios = [
  {
    id: 'launch', title: 'Launch an autonomous product', category: 'PRODUCT STRATEGY',
    question: 'When should we put autonomy into production?',
    summary: 'Explore the tension between capability, trust, and the cost of moving too soon.',
    decision: 'Launch strategy',
    assumptions: [
      { id: 'adoption', title: 'User adoption', value: '62%', confidence: 'Medium', description: 'The share of eligible users expected to adopt the product in the first quarter.', evidence: 'Example assumption. Replace with pilot activation and retention data.', unit: '%', baseline: 62, min: 0, max: 100 },
      { id: 'reliability', title: 'System reliability', value: '94%', confidence: 'Low', description: 'The expected proportion of tasks completed correctly without human intervention.', evidence: 'Example assumption. Validate against representative tasks, including failure cases.', unit: '%', baseline: 94, min: 50, max: 100 },
      { id: 'cost', title: 'Operating cost', value: '$0.18', confidence: 'Medium', description: 'The inference and infrastructure cost per attempted task. Every attempt incurs cost, including failures.', evidence: 'Example assumption. Measure cost per attempted task; this model excludes retries.', unit: '$/attempt', baseline: 0.18, min: 0.01, max: 1 },
      { id: 'trust', title: 'Human oversight', value: '30%', confidence: 'High', description: 'The share of tasks routed through a human review before taking action.', evidence: 'Example policy choice. Test whether review capacity meets peak demand.', unit: '%', baseline: 30, min: 0, max: 100 }
    ],
    outcomes: [ { id: 'accelerate', title: 'Accelerate', subtitle: 'Broad release', value: 'High upside', detail: 'Prioritize reach. Exposure to reliability failures grows with adoption.', color: 'mint' }, { id: 'pilot', title: 'Controlled pilot', subtitle: 'Learn before scaling', value: 'Balanced exposure', detail: 'A small cohort makes failure modes easier to detect and contain.', color: 'violet' }, { id: 'defer', title: 'Strengthen first', subtitle: 'Invest in reliability', value: 'Lower exposure', detail: 'Delay launch to improve reliability; account for the opportunity cost.', color: 'amber' } ]
  },
  {
    id: 'resilience', title: 'Design a resilient system', category: 'SYSTEM ARCHITECTURE',
    question: 'Where should we invest our resilience budget?',
    summary: 'Map the relationship between demand, recovery, and the price of availability.', decision: 'Resilience strategy',
    assumptions: [
      { id: 'load', title: 'Peak demand', value: '3.2×', confidence: 'Medium', description: 'Peak traffic relative to the average load.', evidence: 'Example assumption. Use observed seasonal demand and stress tests.', unit: '×', baseline: 3.2, min: 1, max: 10 },
      { id: 'recovery', title: 'Recovery time', value: '12 min', confidence: 'Low', description: 'Time needed to restore service after a critical incident.', evidence: 'Example assumption. Measure during recovery drills.', unit: 'min', baseline: 12, min: 1, max: 120 },
      { id: 'budget', title: 'Monthly budget', value: '$8k', confidence: 'High', description: 'Infrastructure budget available each month.', evidence: 'Example constraint. Replace with approved spending limits.', unit: '$k', baseline: 8, min: 1, max: 50 },
      { id: 'risk', title: 'Failure frequency', value: '2 / yr', confidence: 'Low', description: 'Expected critical incidents per year.', evidence: 'Example assumption. Estimate from incident history and dependency risk.', unit: '/yr', baseline: 2, min: 0, max: 20 }
    ],
    outcomes: [ { id: 'accelerate', title: 'Multi-region', subtitle: 'Redundancy first', value: 'Higher availability', detail: 'Regional redundancy can reduce outage exposure at greater operating cost.', color: 'mint' }, { id: 'pilot', title: 'Fast recovery', subtitle: 'Restore with confidence', value: 'Balanced investment', detail: 'Invest in tested backups, runbooks, and recovery automation.', color: 'violet' }, { id: 'defer', title: 'Optimize capacity', subtitle: 'Absorb the spikes', value: 'Demand protection', detail: 'Prioritize headroom, graceful degradation, and capacity controls.', color: 'amber' } ]
  },
  {
    id: 'transition', title: 'Navigate an AI transition', category: 'ORGANIZATION DESIGN',
    question: 'How do we change the way a team works?',
    summary: 'Examine productivity gains alongside learning costs and team readiness.', decision: 'Transition strategy',
    assumptions: [
      { id: 'readiness', title: 'Team readiness', value: '48%', confidence: 'Medium', description: 'The share of the team comfortable using AI tools in their daily work.', evidence: 'Example assumption. Validate with task-based assessments.', unit: '%', baseline: 48, min: 0, max: 100 },
      { id: 'gain', title: 'Time savings', value: '24%', confidence: 'Low', description: 'Expected time saved on eligible tasks after quality review.', evidence: 'Example assumption. Measure complete workflows, including corrections.', unit: '%', baseline: 24, min: 0, max: 80 },
      { id: 'training', title: 'Learning investment', value: '6 hrs', confidence: 'High', description: 'Protected learning hours per person per month.', evidence: 'Example policy choice. Check manager support and scheduling capacity.', unit: 'hrs', baseline: 6, min: 0, max: 40 },
      { id: 'coverage', title: 'Task coverage', value: '40%', confidence: 'Medium', description: 'The share of work eligible for AI assistance.', evidence: 'Example assumption. Map real tasks and identify review obligations.', unit: '%', baseline: 40, min: 0, max: 100 }
    ],
    outcomes: [ { id: 'accelerate', title: 'Team-wide rollout', subtitle: 'Move together', value: 'Fast adoption', detail: 'A common rollout creates momentum but requires substantial support.', color: 'mint' }, { id: 'pilot', title: 'Champion network', subtitle: 'Learn through peers', value: 'Distributed learning', detail: 'A trained group builds practical examples and supports colleagues.', color: 'violet' }, { id: 'defer', title: 'Workflow lab', subtitle: 'Redesign the work', value: 'Deeper preparation', detail: 'Test a few complete workflows before expanding adoption.', color: 'amber' } ]
  }
];
export function defaultState() { return { version: 1, scenarioId: 'launch', selectedId: 'reliability', zoom: 1 }; }
export function normalizeState(candidate) {
  const state = defaultState();
  if (!candidate || candidate.version !== 1) return state;
  const scenario = scenarios.find(s => s.id === candidate.scenarioId);
  if (!scenario) return state;
  state.scenarioId = scenario.id;
  const ids = [ 'decision', ...scenario.assumptions.map(a => a.id), ...scenario.outcomes.map(o => o.id) ];
  state.selectedId = ids.includes(candidate.selectedId) ? candidate.selectedId : scenario.assumptions[0].id;
  state.zoom = typeof candidate.zoom === 'number' && Number.isFinite(candidate.zoom) ? Math.max(0.8, Math.min(1.4, candidate.zoom)) : 1;
  return state;
}
export function readState(storage) {
  try { return normalizeState(JSON.parse(storage.getItem('signal-atlas:v1'))); } catch { return defaultState(); }
}
export function writeState(storage, state) {
  try { storage.setItem('signal-atlas:v1', JSON.stringify(normalizeState(state))); return true; } catch { return false; }
}

import { nowIso } from './dates.js';

let JsPdfCtor = null;

const loadJsPdf = async () => {
  if (JsPdfCtor) return JsPdfCtor;
  const mod = await import('jspdf');
  JsPdfCtor = mod.jsPDF || mod.default;
  return JsPdfCtor;
};

const PADDING = 10;

const asTable = (breakdown) => {
  const header = '| Heuristic | Weight | Score | Weighted | Summary |\n| --- | --- | --- | --- | --- |';
  const rows = breakdown.map((item) => {
    const summary = item.summary.replace(/\n/g, ' ');
    return `| ${item.label} | ${item.weight}% | ${item.score.toFixed(1)} | ${item.weightedScore.toFixed(
      1
    )} | ${summary} |`;
  });
  return [header, ...rows].join('\n');
};

const formatDiagnostics = (diagnostics) => {
  if (!diagnostics.length) {
    return '\nNo blocking diagnostics.\n';
  }
  return diagnostics.map((line) => `- ${line}`).join('\n');
};

const formatRefinements = (rubric) => {
  if (!rubric?.refinements?.length) {
    return '\n- Stabilize language with peer review before release.';
  }
  return rubric.refinements.map((line) => `- ${line}`).join('\n');
};

export const createPlatoMarkdown = (room, evaluations) => {
  const generated = nowIso();
  const scenarioBlock = room.scenarios
    .map(
      (scenario, index) =>
        `${index + 1}. **${scenario.title}** — goal: ${scenario.goal || 'n/a'} (stress: ${
          scenario.stressTest || 'n/a'
        })`
    )
    .join('\n');

  const namesBlock = evaluations
    .map((evaluation) => {
      const title = `### ${evaluation.label} — ${evaluation.total.toFixed(1)} / 100`;
      const rubric = `**Rubric:** ${evaluation.rubric.summary}`;
      const table = asTable(evaluation.breakdown);
      const diagnostics = `#### Diagnostics\n${formatDiagnostics(evaluation.diagnostics)}`;
      const refinements = `#### Refinements\n${formatRefinements(evaluation.rubric)}`;
      return [title, rubric, table, diagnostics, refinements].join('\n\n');
    })
    .join('\n\n');

  return `# PLATO: ${room.title}\nGenerated ${generated}\n\n## P — Purpose\n${
    room.notes || 'Document qualitative goals here.'
  }\n\n## L — Linguistic Trials\n${scenarioBlock || 'Define at least one scenario to align on expectations.'}\n\n## A — Analysis Grid\n${
    namesBlock || 'Add candidate names to compute heuristic-weighted analysis.'
  }\n\n## T — Test Diagnostics\n${
    evaluations
      .flatMap((evaluation) =>
        evaluation.diagnostics.length
          ? evaluation.diagnostics.map((line) => `- ${evaluation.label}: ${line}`)
          : [`- ${evaluation.label}: ready for validation circle.`]
      )
      .join('\n') || 'Run heuristics to populate diagnostics.'
  }\n\n## O — Outcomes & Next Steps\n${
    evaluations
      .map((evaluation) => `- ${evaluation.label}: ${evaluation.rubric.summary}`)
      .join('\n') || 'No candidates assessed yet.'
  }\n`;
};

export const triggerJsonDownload = (room) => {
  const blob = new Blob([JSON.stringify(room, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${room.title || 'namecraft-room'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportRoomPdf = async (room, evaluations) => {
  if (typeof window === 'undefined') {
    throw new Error('PDF export is available in the browser only.');
  }
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  let y = PADDING * 1.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`PLATO: ${room.title}`, PADDING, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y += 18;
  doc.text(`Generated ${nowIso()}`, PADDING, y);
  y += 24;

  const paragraph = (label, body) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(label, PADDING, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const split = doc.splitTextToSize(body, 520);
    doc.text(split, PADDING, y);
    y += split.length * 14 + 12;
  };

  paragraph('P — Purpose', room.notes || 'Document qualitative goals here.');
  const scenarios = room.scenarios
    .map(
      (scenario, index) =>
        `${index + 1}. ${scenario.title}: ${scenario.goal || 'goal?'} / stress: ${
          scenario.stressTest || 'n/a'
        }`
    )
    .join('\n');
  paragraph('L — Linguistic Trials', scenarios || 'Define at least one scenario.');

  evaluations.forEach((evaluation) => {
    const header = `${evaluation.label} — ${evaluation.total.toFixed(1)} / 100`;
    paragraph(header, evaluation.rubric.summary);
    evaluation.breakdown.forEach((item) => {
      const line = `${item.label} (${item.weight}%): score ${item.score.toFixed(
        1
      )}, weighted ${item.weightedScore.toFixed(1)} — ${item.summary}`;
      paragraph('•', line);
    });
    if (evaluation.diagnostics.length) {
      paragraph('Diagnostics', evaluation.diagnostics.join('\n'));
    }
  });

  doc.save(`${room.title || 'namecraft-room'}.pdf`);
};

export const copyPlatoToClipboard = async (markdown) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(markdown);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = markdown;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

// Optional GitHub commit flow (disabled by default):
// Use the GitHub REST API `PUT /repos/{owner}/{repo}/contents/{path}` with a
// personal access token stored in localStorage under `namecraft::gh-pat`.
// Provide UI opt-in and never send requests without explicit user action.
export const getPatInstructions = () =>
  'To enable optional GitHub exports, store a fine-grained PAT in localStorage under namecraft::gh-pat and wire a custom handler.';

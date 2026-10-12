import { INPUTS, CONSTANT_FIELDS } from './simulation.js';
import { defaultModel, validateModel, parseModel, readLibrary, saveToLibrary, buildBrief, briefText, MAX_FILE_BYTES } from './workbench.js';
const $ = id => document.getElementById(id);
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function createWorkbench({ storage, getModel, getResult, applyModel, onDraft, canUseModel }) {
  let library = readLibrary(storage);
  let dirty = false;
  let importSequence = 0;
  const form = $('model-form');
  for (const field of CONSTANT_FIELDS) {
    const label = document.createElement('label'); label.className = 'model-field';
    const span = document.createElement('span'); span.textContent = field.label;
    const input = document.createElement('input'); input.id = `constant-${field.id}`; input.type = 'number'; input.min = field.min; input.max = field.max; input.step = field.step; input.required = true;
    label.append(span, input); $('model-constants').append(label);
  }
  for (const input of INPUTS) {
    const block = document.createElement('div'); block.className = 'evidence-editor';
    // All interpolated labels/IDs are fixed schema constants, never imported text.
    block.innerHTML = `<div class="evidence-editor-heading"><label for="evidence-${input.id}">${input.label}</label><label for="confidence-${input.id}" class="confidence-editor">Confidence<select id="confidence-${input.id}"><option>Low</option><option>Medium</option><option>High</option></select></label></div><textarea id="evidence-${input.id}" maxlength="3000" rows="3" placeholder="What supports this assumption? Record a source, observation, and date."></textarea>`;
    $('model-evidence').append(block);
  }
  function status(message) { $('workbench-status').textContent = message; }
  function setDirty(value) { if (value) importSequence++; dirty = value; $('model-save').disabled = value; $('model-export').disabled = value; onDraft(value); refreshExport(); }
  function fillForm() {
    const model = getModel();
    $('model-title').value = model.title; $('model-question').value = model.question;
    for (const f of CONSTANT_FIELDS) $(`constant-${f.id}`).value = model.constants[f.id];
    for (const i of INPUTS) { $(`evidence-${i.id}`).value = model.evidence[i.id].note; $(`confidence-${i.id}`).value = model.evidence[i.id].confidence; }
    setDirty(false);
  }
  form.addEventListener('input', () => { setDirty(true); status('Draft edits pending. Apply the model before running, saving, or exporting.'); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const draft = getModel();
      draft.title = $('model-title').value; draft.question = $('model-question').value;
      for (const f of CONSTANT_FIELDS) draft.constants[f.id] = Number($(`constant-${f.id}`).value);
      for (const i of INPUTS) draft.evidence[i.id] = {note:$(`evidence-${i.id}`).value, confidence:$(`confidence-${i.id}`).value};
      applyModel(validateModel(draft)); fillForm();
      status('Model applied. Run again to generate results for this model.');
    } catch (error) { status(error.message); }
  });
  $('model-discard').addEventListener('click', () => { importSequence++; fillForm(); status('Draft edits discarded. The applied model is unchanged; run again to generate results.'); });
  $('model-new').addEventListener('click', () => { importSequence++; applyModel(defaultModel()); fillForm(); status('New model started from the launch example. Your saved library is unchanged.'); });
  function renderLibrary() {
    $('model-library').replaceChildren();
    if (!library.length) { const option = document.createElement('option'); option.textContent = 'No saved models yet'; $('model-library').append(option); }
    library.forEach((model, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = model.title; $('model-library').append(option); });
    $('model-load').disabled = !library.length; $('model-library').disabled = !library.length;
  }
  $('model-save').addEventListener('click', () => {
    try { const model = getModel(); library = saveToLibrary(storage, library, model); renderLibrary(); $('model-library').value = String(library.length - 1); status('Saved locally. Saving the same title replaces its previous saved version.'); } catch(error) {status(error.message);}
  });
  $('model-load').addEventListener('click', () => {
    const model = library[Number($('model-library').value)];
    if (!model) return;
    importSequence++; applyModel(validateModel(model)); fillForm(); status('Saved model loaded. Run to regenerate its results.');
  });
  $('model-export').addEventListener('click', () => {
    try { download(JSON.stringify(validateModel(getModel()), null, 2), 'signal-atlas-model.json', 'application/json'); status('Model JSON exported. It includes inputs, seed, constants, and evidence.'); } catch(error) {status(error.message);}
  });
  $('model-import-button').addEventListener('click', () => $('model-import').click());
  $('model-import').addEventListener('change', async () => {
    const file = $('model-import').files?.[0]; if (!file) return;
    const sequence = ++importSequence;
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('Model file must be at most 64 KiB.');
      const imported = parseModel(await file.text());
      if (sequence !== importSequence) return;
      applyModel(imported); fillForm(); status('Validated model imported. Save locally to add it to your library; run to calculate results.');
    } catch(error) { if (sequence === importSequence) status(`Import rejected: ${error.message} Your previous model is unchanged.`); }
    finally { if (sequence === importSequence) $('model-import').value = ''; }
  });
  function refreshExport() { const blocked = dirty || !canUseModel(); $('brief-export').disabled = blocked || !getResult(); $('model-save').disabled = blocked; $('model-export').disabled = blocked; }
  $('brief-export').addEventListener('click', () => {
    try { const brief = buildBrief(getModel(), getResult()); download(briefText(brief), 'signal-atlas-decision-brief.txt', 'text/plain;charset=utf-8'); status('Decision brief exported with verified results and a reproducible model snapshot.'); } catch(error) {status(error.message);}
  });
  renderLibrary(); fillForm();
  return { refresh: refreshExport, cancelPendingImport: () => { importSequence++; } };
}

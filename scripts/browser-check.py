"""Optional real-browser release checks. Requires Python Playwright and Chromium."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://localhost:3000')
parser.add_argument('--browser-path', default='/usr/bin/chromium')
parser.add_argument('--axe-path', help='Optional local axe-core JavaScript file for WCAG A/AA audit')
parser.add_argument('--output', default='/tmp/signal-atlas-browser-qa')
args = parser.parse_args()
out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
checks = []
def passed(name):
    checks.append(name); print('PASS ' + name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.browser_path, headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True)
    page = context.new_page(); errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.url); expect(page.locator('[data-node="reliability"]')).to_be_visible()
    expect(page.locator('#simulation-run')).to_be_enabled()
    page.locator('.model-editor > summary').click()
    page.locator('#model-title').fill('Release pilot decision')
    page.locator('#model-question').fill('Should we launch to our pilot customers this quarter?')
    page.locator('#constant-valuePerSuccess').fill('2')
    payload = '<img src=x onerror="window.atlasInjected=true"> Pilot: 98/100 tasks, 2026-10-12.'
    page.locator('#evidence-reliability').fill(payload)
    page.locator('#confidence-reliability').select_option('High')
    expect(page.locator('#simulation-run')).to_be_disabled()
    expect(page.locator('#model-save')).to_be_disabled()
    expect(page.locator('#model-export')).to_be_disabled()
    expect(page.locator('#brief-export')).to_be_disabled()
    passed('Draft edits block runs, saving, and exports')
    page.locator('#model-form button[type=submit]').click()
    expect(page.locator('#question')).to_have_text('Should we launch to our pilot customers this quarter?')
    expect(page.locator('#inspector-evidence')).to_have_text(payload)
    assert page.evaluate('window.atlasInjected') is None
    assert page.locator('#inspector-evidence img').count() == 0
    expect(page.locator('#simulation-run')).to_be_enabled()
    page.locator('#simulation-run').click()
    expect(page.locator('#simulation-results')).to_be_visible()
    assert page.locator('#comparison-body tr').count() == 3
    assert page.locator('#sensitivity-body tr').count() == 4
    results = page.locator('#comparison-body').inner_text()
    passed('Edit → apply → run; evidence renders as text and custom economics produce results')
    page.locator('#model-save').click()
    expect(page.locator('#model-library option')).to_have_text('Release pilot decision')
    with page.expect_download() as event: page.locator('#model-export').click()
    event.value.save_as(out / 'model.json')
    model = json.loads((out / 'model.json').read_text())
    assert model['constants']['valuePerSuccess'] == 2
    assert model['evidence']['reliability']['note'] == payload
    page.locator('#model-new').click()
    expect(page.locator('#simulation-results')).to_be_hidden()
    page.locator('#model-import').set_input_files(out / 'model.json')
    expect(page.locator('#workbench-status')).to_contain_text('Validated model imported')
    expect(page.locator('#model-current-name')).to_contain_text('Release pilot decision')
    page.locator('#simulation-run').click()
    assert page.locator('#comparison-body').inner_text() == results
    with page.expect_download() as event: page.locator('#brief-export').click()
    event.value.save_as(out / 'brief.txt')
    brief = (out / 'brief.txt').read_text()
    assert 'CALCULATED RESULTS' in brief and 'LIMITATIONS' in brief
    assert payload in brief
    assert json.loads(brief.split('REPRODUCIBLE MODEL JSON\n')[1]) == model
    page.locator('#model-import').set_input_files(out / 'model.json')
    expect(page.locator('#workbench-status')).to_contain_text('Validated model imported')
    page.locator('#simulation-run').click()
    passed('Save → JSON download → import → deterministic rerun → brief download; same-file reimport')
    for source in ['{broken', json.dumps({**model, 'schemaVersion': 99}), 'x' * 65537]:
        before = page.locator('#model-current-name').inner_text()
        page.locator('#model-import').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':source.encode()})
        expect(page.locator('#workbench-status')).to_contain_text('Import rejected')
        assert page.locator('#model-current-name').inner_text() == before
        assert page.locator('#comparison-body').inner_text() == results
        expect(page.locator('#simulation-results')).to_be_visible()
    passed('Malformed, unsupported, and oversized imports preserve the model and current results')
    for invalid_seed in ['-1', '', '1.5', '4294967296']:
        page.locator('#simulation-seed').fill(invalid_seed)
        expect(page.locator('#simulation-run')).to_be_disabled()
    expect(page.locator('#model-save')).to_be_disabled()
    expect(page.locator('#brief-export')).to_be_disabled()
    expect(page.locator('#simulation-results')).to_be_hidden()
    page.locator('#simulation-seed').fill('0')
    page.locator('#simulation-run').click()
    page.locator('#input-adoption').focus(); page.keyboard.press('ArrowRight')
    expect(page.locator('#simulation-results')).to_be_hidden()
    expect(page.locator('#brief-export')).to_be_disabled()
    page.locator('#simulation-run').click()
    passed('Invalid seed blocks actions; zero seed runs; keyboard slider edits invalidate stale results')
    page.locator('#model-load').click(); page.locator('#simulation-run').click()
    assert page.locator('#comparison-body').inner_text() == results
    page.reload(); expect(page.locator('#model-current-name')).to_contain_text('Release pilot decision')
    expect(page.locator('#simulation-results')).to_be_hidden()
    page.locator('#simulation-run').click()
    assert page.locator('#comparison-body').inner_text() == results
    passed('Saved-model loading and reload persistence preserve the model and reproducibility')
    page.locator('[data-node="trust"]').focus(); page.keyboard.press('Enter')
    expect(page.locator('#inspector-content h2')).to_have_text('Human oversight')
    assert page.evaluate('document.activeElement.getAttribute("data-node")') == 'trust'
    page.locator('#roadmap-open').click(); expect(page.locator('#roadmap')).to_be_visible()
    page.keyboard.press('Escape'); expect(page.locator('#roadmap')).to_be_hidden()
    assert page.evaluate('document.activeElement.id') == 'roadmap-open'
    for title in ['Design a resilient system','Navigate an AI transition']:
        page.get_by_role('button', name=title, exact=False).click()
        expect(page.locator('#simulation-unsupported')).to_be_visible()
        expect(page.locator('#simulation-supported')).to_be_hidden()
        expect(page.locator('#workbench-section')).to_be_hidden()
    page.get_by_role('button', name='Launch an autonomous product', exact=False).click()
    passed('Keyboard node activation, modal Escape/focus return, and unsupported scenario labels')
    page.locator('.model-editor > summary').click() if not page.locator('.model-editor').evaluate('(e)=>e.open') else None
    page.locator('#model-title').fill('Discard me'); page.locator('#model-discard').click()
    expect(page.locator('#model-title')).to_have_value('Release pilot decision')
    expect(page.locator('#simulation-run')).to_be_enabled()
    passed('Discard restores the applied model and re-enables running')
    page.locator('#simulation-run').click()
    for width in [320,360,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Page overflows at {width}px'
        expect(page.locator('#simulation-run')).to_be_visible()
        if width <= 390:
            page.locator('#node-select').select_option('trust')
            expect(page.locator('#inspector-content h2')).to_have_text('Human oversight')
        if args.axe_path:
            if not page.evaluate('Boolean(window.axe)'): page.add_script_tag(path=args.axe_path)
            audit = page.evaluate("async () => await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
            (out / f'axe-{width}.json').write_text(json.dumps(audit,indent=2))
            assert not audit['violations'], [(v['id'],[n['target'] for n in v['nodes']]) for v in audit['violations']]
        page.screenshot(path=str(out / f'viewport-{width}.png'), full_page=True)
    passed('320/360/390/768/1440px layouts have no page overflow; mobile node picker works; screenshots captured')
    if args.axe_path: passed('axe-core WCAG A/AA audit: zero violations at all five viewport widths')
    page.goto(args.url)
    page.keyboard.press('Tab'); assert page.evaluate('document.activeElement.className') == 'skip'
    page.keyboard.press('Enter'); assert page.evaluate('document.activeElement.id') == 'workspace'
    page.locator('#start-exploring').click(); assert page.evaluate('document.activeElement.id') == 'simulation-run'
    passed('Skip link targets the workspace; quick-start action focuses the launch run control')
    assert not errors, errors
    passed('No browser runtime errors in main flow')
    context.close()
    corrupt = browser.new_context()
    corrupt.add_init_script("for (const key of ['signal-atlas:v1','signal-atlas:simulation:v1','signal-atlas:active-model:v1','signal-atlas:library:v1']) localStorage.setItem(key,'{broken');")
    cp = corrupt.new_page(); cp.goto(args.url); cp.locator('#simulation-run').click()
    expect(cp.locator('#simulation-results')).to_be_visible()
    expect(cp.locator('#model-library option')).to_have_text('No saved models yet')
    passed('Corrupt storage recovers to a usable default model')
    corrupt.close()
    denied = browser.new_context()
    denied.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}});")
    dp = denied.new_page(); dp.goto(args.url); dp.locator('#simulation-run').click()
    expect(dp.locator('#simulation-results')).to_be_visible()
    expect(dp.locator('#simulation-storage')).to_contain_text('Session only')
    dp.locator('#model-save').click(); expect(dp.locator('#workbench-status')).to_contain_text('storage is unavailable')
    with dp.expect_download() as event: dp.locator('#model-export').click()
    event.value.save_as(out / 'denied-storage-model.json')
    passed('Denied storage remains usable, reports saving failure, and allows model download')
    denied.close(); browser.close()
(out / 'report.json').write_text(json.dumps({'browser':'Chromium via Python Playwright','checks':checks}, indent=2))
print(f'{len(checks)} browser check groups passed; artifacts: {out}')

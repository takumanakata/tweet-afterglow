// ============================================================
//  TWEET AFTERGLOW — browser console deleter
//
//  1. Open x.com in your browser and log in
//  2. Open DevTools -> Console   (Chrome: Cmd/Ctrl + Option/Alt + J)
//  3. Paste this whole file, press Enter  (Chrome may ask you to type "allow pasting" first)
//  4. A panel appears bottom-right -> "Load list" -> pick data/delete_list.json
//     (exported from review.html)
//  5. Tick DRY RUN and START once to check, then untick and START for real
//
//  Progress is saved in localStorage, so closing the tab and pasting again
//  resumes where it stopped. Failures are retried, then exported as JSON.
// ============================================================

(function () {
  'use strict';

  // ─── settings ──────────────────────────────────────────────
  const DELAY_MS      = 1200;   // base wait after each success (ms), plus random jitter
  const JITTER_MS     = 600;
  const MAX_RETRY     = 3;      // retries per tweet
  const RETRY_WAIT_MS = 8000;
  const RATE_FALLBACK = 5 * 60; // seconds to wait on 429 when no reset header is given
  const FATAL_AUTH    = 3;      // stop after this many consecutive 401/403
  const FATAL_404     = 3;      // stop after this many consecutive 404 (endpoint changed?)

  const BEARER    = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
  const QUERY_ID  = 'VaenaVgh5q5ih7kvyVjgtg';   // DeleteTweet GraphQL id; if 404s pile up, X changed it
  const ENDPOINT  = `${location.origin}/i/api/graphql/${QUERY_ID}/DeleteTweet`;

  // Legacy mode: if you load tweets.js directly instead of delete_list.json,
  // every tweet older than this id is deleted. Set to null to disable legacy mode.
  const LEGACY_PIVOT_ID = null;

  // ─── state ─────────────────────────────────────────────────
  let items = [], listKey = '', done = new Set(), failed = [];
  let stopFlag = false, running = false, dryRun = false;
  let nDeleted = 0, nGone = 0, nFailed = 0;

  const sleep  = ms => new Promise(r => setTimeout(r, ms));
  const nowStr = () => new Date().toTimeString().slice(0, 8);

  const existing = document.getElementById('__ta_panel__');
  if (existing) existing.remove();

  // ─── UI ────────────────────────────────────────────────────
  const $ = (tag, style, text) => {
    const el = document.createElement(tag);
    if (style) el.style.cssText = style;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const panel = $('div', `
    position:fixed; bottom:20px; right:20px; width:440px; z-index:2147483647;
    background:#0a0a0a; border:1px solid #005c1e;
    font-family:Consolas,Menlo,monospace; font-size:12px; color:#00ff41;
    box-shadow:0 0 24px rgba(0,255,65,0.15);
  `);
  panel.id = '__ta_panel__';

  const title = $('div', `background:#002800; padding:10px 14px; font-size:14px; font-weight:bold;
    border-bottom:1px solid #005c1e; letter-spacing:1px; display:flex; justify-content:space-between;`);
  title.appendChild($('span', '', 'TWEET AFTERGLOW'));
  const closeBtn = $('span', 'cursor:pointer; color:#1a6b2e;', '✕');
  closeBtn.onclick = () => { if (!running || confirm('A run is in progress. Closing stops it. Close?')) panel.remove(); };
  title.appendChild(closeBtn);
  panel.appendChild(title);

  panel.appendChild($('div', 'padding:6px 14px 0; font-size:11px; font-style:italic; color:#1a6b2e;',
    'The words fade. The one who wrote them stays.'));

  const statusRow = $('div', 'padding:8px 14px 0; color:#00aa33; font-size:11px;', 'STATUS  IDLE');
  panel.appendChild(statusRow);
  const countRow = $('div', 'padding:4px 14px; color:#00aa33; font-size:11px; white-space:pre;', 'Load data/delete_list.json to begin');
  panel.appendChild(countRow);

  const barOuter = $('div', 'margin:6px 14px; background:#001100; height:6px; border:1px solid #003300;');
  const barInner = $('div', 'height:100%; width:0%; background:#00ff41; transition:width .3s;');
  barOuter.appendChild(barInner);
  panel.appendChild(barOuter);

  const optRow = $('div', 'padding:4px 14px 0; display:flex; align-items:center; gap:14px; font-size:11px; color:#1a6b2e;');
  const dryLabel = $('label', 'cursor:pointer; display:flex; align-items:center; gap:4px;');
  const dryChk = $('input'); dryChk.type = 'checkbox';
  dryLabel.appendChild(dryChk); dryLabel.appendChild($('span', '', 'DRY RUN (simulate, delete nothing)'));
  optRow.appendChild(dryLabel);
  const resetLink = $('span', 'cursor:pointer; text-decoration:underline; margin-left:auto;', 'Reset progress');
  optRow.appendChild(resetLink);
  panel.appendChild(optRow);

  const btnRow = $('div', 'padding:8px 14px; display:flex; gap:8px;');
  const mkBtn = (text, color) => {
    const b = $('button', `flex:1; padding:7px; background:#001100; color:${color}; border:1px solid ${color};
      cursor:pointer; font-family:inherit; font-size:12px; font-weight:bold;`, text);
    b.onmouseenter = () => b.style.background = '#002200';
    b.onmouseleave = () => b.style.background = '#001100';
    return b;
  };
  const setEnabled = (b, on) => { b.disabled = !on; b.style.opacity = on ? '1' : '0.4'; };
  const fileBtn   = mkBtn('📂 Load list', '#00ff41');
  const startBtn  = mkBtn('▶ START', '#00ff41');
  const stopBtn   = mkBtn('■ STOP', '#ff4141');
  const exportBtn = mkBtn('⬇ Results', '#ffb700');
  setEnabled(startBtn, false); setEnabled(stopBtn, false); setEnabled(exportBtn, false);
  [fileBtn, startBtn, stopBtn, exportBtn].forEach(b => btnRow.appendChild(b));
  panel.appendChild(btnRow);

  const logBox = $('div', `margin:0 14px 14px; background:#020d04; border:1px solid #003300;
    height:180px; overflow-y:auto; padding:6px; font-size:10px; color:#00ff41;`);
  panel.appendChild(logBox);
  document.body.appendChild(panel);

  function log(text, color = '#00ff41') {
    const line = $('div', `color:${color}; margin-bottom:2px; word-break:break-all;`, `${nowStr()}  ${text}`);
    logBox.appendChild(line);
    while (logBox.childElementCount > 400) logBox.removeChild(logBox.firstChild);
    logBox.scrollTop = logBox.scrollHeight;
  }
  function updateStatus(text, color = '#00aa33') { statusRow.textContent = text; statusRow.style.color = color; }
  function updateCount() {
    const total = items.length;
    const finished = done.size + (running && dryRun ? nDeleted : 0);
    countRow.textContent =
      `DELETED ${nDeleted.toLocaleString()}  ALREADY GONE ${nGone.toLocaleString()}  FAILED ${nFailed.toLocaleString()}\n` +
      `DONE ${finished.toLocaleString()} / ${total.toLocaleString()}   REMAINING ${(total - finished).toLocaleString()}`;
    barInner.style.width = total ? `${(finished / total) * 100}%` : '0%';
  }

  // ─── progress persistence ──────────────────────────────────
  function loadProgress() {
    try { const raw = localStorage.getItem(listKey); done = new Set(raw ? raw.split(',').filter(Boolean) : []); }
    catch { done = new Set(); }
  }
  let saveTimer = null;
  function saveProgress() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(listKey, [...done].join(',')); }
      catch (e) { log(`⚠ could not save progress: ${e.message}`, '#ffb700'); }
    }, 500);
  }
  resetLink.onclick = () => {
    if (!listKey) return;
    if (!confirm('Forget which tweets in this list are already done and start over?')) return;
    localStorage.removeItem(listKey);
    done = new Set(); nDeleted = nGone = nFailed = 0; failed = [];
    updateCount(); log('↺ progress reset', '#ffb700');
  };

  // ─── load list ─────────────────────────────────────────────
  fileBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,.js';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      log(`📂 loading ${file.name}`);
      try {
        const text = await file.text();
        if (/^\s*window\.YTD\.tweets/.test(text)) {
          if (LEGACY_PIVOT_ID == null) throw new Error('This is tweets.js. Export delete_list.json from review.html, or set LEGACY_PIVOT_ID in this script.');
          const json = text.replace(/^window\.YTD\.tweets\.\w+\s*=\s*/, '').replace(/;\s*$/, '').trim();
          const all  = JSON.parse(json).map(x => x.tweet || x);
          items = all.filter(t => BigInt(t.id) < BigInt(LEGACY_PIVOT_ID))
                     .map(t => ({ id: t.id, date: (t.created_at || '').slice(4, 10) + (t.created_at || '').slice(-5), text: t.full_text || '', c: 'legacy' }));
          listKey = `__ta_done__legacy_${LEGACY_PIVOT_ID}`;
          log(`⚠ legacy mode: every tweet older than ${LEGACY_PIVOT_ID} will be deleted (${items.length.toLocaleString()} tweets)`, '#ffb700');
        } else {
          const data = JSON.parse(text);
          if (!Array.isArray(data.ids)) throw new Error('not a delete_list.json (no "ids" array)');
          items = data.ids.map(x => typeof x === 'string' ? { id: x, date: '', text: '', c: '' } : x);
          listKey = `__ta_done__${data.generated || 'nogen'}_${items.length}`;
          log(`✅ loaded delete_list.json — ${items.length.toLocaleString()} tweets (exported ${data.generated || '?'})`);
          if (data.keep_count != null) log(`   ${Number(data.keep_count).toLocaleString()} kept tweets will not be touched`, '#1a6b2e');
        }
        items.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
        loadProgress();
        const remaining = items.filter(x => !done.has(x.id)).length;
        if (done.size) log(`↻ resuming: ${done.size.toLocaleString()} done, ${remaining.toLocaleString()} remaining`, '#ffb700');
        updateCount();
        setEnabled(startBtn, true);
      } catch (err) {
        log(`❌ load error: ${err.message}`, '#ff4141');
      }
    };
    input.click();
  };

  // ─── auth ──────────────────────────────────────────────────
  function getCt0() { const m = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/); return m ? m[1] : ''; }
  function randomTxId() {
    return [...crypto.getRandomValues(new Uint8Array(70))]
      .map(x => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[x % 62]).join('');
  }

  // ─── delete one -> {ok, gone, status, error, rateRemaining, rateReset}
  async function deleteTweet(id) {
    const res = await fetch(ENDPOINT, {
      method: 'POST', credentials: 'include', mode: 'cors',
      referrer: `${location.origin}/home`, referrerPolicy: 'strict-origin-when-cross-origin',
      headers: {
        'authorization':             `Bearer ${BEARER}`,
        'content-type':              'application/json',
        'x-csrf-token':              getCt0(),
        'x-client-transaction-id':   randomTxId(),
        'x-twitter-active-user':     'yes',
        'x-twitter-auth-type':       'OAuth2Session',
        'x-twitter-client-language': 'en',
      },
      body: JSON.stringify({ variables: { tweet_id: id, dark_request: false }, queryId: QUERY_ID }),
      signal: AbortSignal.timeout(15000),
    });
    const out = {
      ok: false, gone: false, status: res.status, error: '',
      rateRemaining: Number(res.headers.get('x-rate-limit-remaining') ?? NaN),
      rateReset:     Number(res.headers.get('x-rate-limit-reset') ?? NaN),
    };
    if (res.status === 200) {
      let body = null;
      try { body = await res.json(); } catch { /* empty body still counts as success */ }
      const errs = body && Array.isArray(body.errors) ? body.errors : [];
      if (errs.length) {
        const msg = errs.map(e => e.message || '').join(' | ');
        if (/not found|does not exist|doesn't exist|no status found|deleted/i.test(msg)) { out.gone = true; out.ok = true; }
        else out.error = msg;
      } else out.ok = true;
    } else {
      try { const b = await res.json(); out.error = (b.errors || []).map(e => e.message).join(' | ') || res.statusText; }
      catch { out.error = res.statusText; }
    }
    return out;
  }

  async function waitRateLimit(resetEpoch, reason) {
    let secs = Number.isFinite(resetEpoch) && resetEpoch > 0
      ? Math.max(5, resetEpoch - Math.floor(Date.now() / 1000) + 2) : RATE_FALLBACK;
    log(`⏳ ${reason} — waiting ${secs}s`, '#ffb700');
    while (secs > 0 && !stopFlag) { updateStatus(`STATUS  RATE LIMIT  ${secs}s`, '#ffb700'); await sleep(1000); secs--; }
    updateStatus('STATUS  RUNNING', '#00ff41');
  }

  // ─── main loop ─────────────────────────────────────────────
  startBtn.onclick = async () => {
    if (running) return;
    if (!items.length) { log('load a list first', '#ffb700'); return; }
    if (!getCt0()) { log('❌ not logged in. Log in to x.com and paste the script again.', '#ff4141'); return; }

    dryRun = dryChk.checked;
    stopFlag = false; running = true; failed = []; nFailed = 0;
    setEnabled(startBtn, false); setEnabled(stopBtn, true); setEnabled(fileBtn, false); setEnabled(exportBtn, false);
    dryChk.disabled = true;

    const queue = items.filter(x => !done.has(x.id));
    const dryDone = new Set();
    updateStatus(dryRun ? 'STATUS  DRY RUN' : 'STATUS  RUNNING', '#00ff41');
    log(`▶ start — ${queue.length.toLocaleString()} tweets${dryRun ? ' (DRY RUN: nothing is deleted)' : ''}`);

    let consecAuth = 0, consec404 = 0;
    for (const it of queue) {
      if (stopFlag) break;
      const label = `${it.date || '─'}  ${(it.text || '').replace(/\s+/g, ' ').slice(0, 40)}`;

      if (dryRun) {
        dryDone.add(it.id); nDeleted++;
        log(`🧪 [dry] ${label}`, '#1a6b2e');
        updateCount(); await sleep(30);
        continue;
      }

      let attempt = 0, result = null;
      while (attempt <= MAX_RETRY && !stopFlag) {
        attempt++;
        try { result = await deleteTweet(it.id); }
        catch (err) { result = { ok: false, gone: false, status: 0, error: err.name === 'TimeoutError' ? 'timeout' : err.message }; }
        if (result.ok) break;
        if (result.status === 429) { await waitRateLimit(result.rateReset, 'rate limited (429)'); attempt--; continue; }
        if (result.status === 401 || result.status === 403) {
          if (++consecAuth >= FATAL_AUTH) { log(`❌ repeated auth errors (${result.status}). Reload x.com, log in, paste the script again.`, '#ff4141'); stopFlag = true; }
          break;
        }
        if (result.status === 404) {
          if (++consec404 >= FATAL_404) { log('❌ repeated 404s. X probably changed the DeleteTweet QUERY_ID — see README.', '#ff4141'); stopFlag = true; }
          break;
        }
        if (attempt <= MAX_RETRY) {
          log(`↻ retry ${attempt}/${MAX_RETRY} (${result.status || 'net'}: ${result.error})  ${label}`, '#ffb700');
          await sleep(RETRY_WAIT_MS * attempt);
        }
      }

      if (result && result.ok) {
        consecAuth = 0; consec404 = 0;
        done.add(it.id); saveProgress();
        if (result.gone) { nGone++; log(`⏭ already gone  ${label}`, '#1a6b2e'); }
        else             { nDeleted++; log(`✅ [${nDeleted}] ${label}`); }
        if (Number.isFinite(result.rateRemaining) && result.rateRemaining <= 1) await waitRateLimit(result.rateReset, 'rate limit exhausted');
      } else if (result) {
        nFailed++;
        failed.push({ id: it.id, date: it.date, text: it.text, status: result.status, error: result.error });
        log(`❌ failed (${result.status || 'net'}: ${result.error})  ${label}`, '#ff4141');
      }
      updateCount();
      await sleep(DELAY_MS + Math.floor(Math.random() * JITTER_MS));
    }

    running = false;
    setEnabled(stopBtn, false); setEnabled(startBtn, true); setEnabled(fileBtn, true); setEnabled(exportBtn, true);
    dryChk.disabled = false;
    if (!dryRun) saveProgress();

    const remaining = items.filter(x => !done.has(x.id) && !dryDone.has(x.id)).length;
    const summary = `deleted ${nDeleted.toLocaleString()} / already gone ${nGone.toLocaleString()} / failed ${nFailed.toLocaleString()} / remaining ${remaining.toLocaleString()}`;
    if (dryRun) { nDeleted = 0; updateCount(); }
    if (stopFlag) { updateStatus('STATUS  STOPPED', '#ffb700'); log(`■ stopped — ${summary}`, '#ffb700'); }
    else if (dryRun) { updateStatus('STATUS  DRY RUN DONE', '#00ff41'); log(`🧪 dry run finished — ${summary}. Nothing saved. Untick DRY RUN and START to delete for real.`); }
    else if (remaining === 0 && nFailed === 0) { updateStatus('STATUS  COMPLETE ✓', '#00ff41'); log(`🎉 complete — ${summary}`); }
    else { updateStatus('STATUS  DONE (check)', '#ffb700'); log(`⚠ finished — ${summary}. Export failures with "Results"; START again retries only the failed ones.`, '#ffb700'); }
  };

  stopBtn.onclick = () => { stopFlag = true; updateStatus('STATUS  STOPPING...', '#ffb700'); log('■ stopping...', '#ffb700'); };

  exportBtn.onclick = () => {
    const remaining = items.filter(x => !done.has(x.id));
    const out = {
      exported: new Date().toISOString(), dry_run: dryRun,
      counts: { deleted: nDeleted, already_gone: nGone, failed: nFailed, done_total: done.size, remaining: remaining.length, list_total: items.length },
      failed, remaining_ids: remaining.map(x => x.id),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `afterglow_result_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    log(`⬇ results exported (${failed.length} failed / ${remaining.length} remaining)`, '#ffb700');
  };

  log('▓ TWEET AFTERGLOW ready ▓', '#00aa33');
  log('① Load data/delete_list.json   ② START', '#1a6b2e');
  log('   Tip: tick DRY RUN for the first run', '#1a6b2e');
})();

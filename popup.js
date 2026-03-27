// ─── Country map ──────────────────────────────────────────────────────────────

const COUNTRY_MAP = {
  'co':       'Colombia',
  'cl':       'Chile',
  'latin':    'Panamá',
  'latin_en': 'Guatemala',
  'py':       'Paraguay',
  'br':       'Brasil',
  'uy':       'Uruguay',
  'pe':       'Peru',
  'ar':       'Argentina',
  'mx':       'México',
};

// All known codes — check latin_en BEFORE latin to avoid partial match
const COUNTRY_CODES = ['latin_en','latin','co','cl','py','br','uy','pe','ar','mx'];

function detectCountryFromUrl(url) {
  try {
    const u = new URL(url);
    for (const code of COUNTRY_CODES) {
      if (new RegExp('/' + code + '(?:/|$)', 'i').test(u.pathname)) return code;
    }
    // Subdomain: cl.samsung.com
    const sub = u.hostname.match(/^([a-z]{2,})\./i);
    if (sub && COUNTRY_MAP[sub[1].toLowerCase()]) return sub[1].toLowerCase();
  } catch(_) {}
  return null;
}

function countryLabel(code) {
  if (!code) return null;
  return COUNTRY_MAP[code.toLowerCase()] || code.toUpperCase();
}

// ─── Language data ────────────────────────────────────────────────────────────

const LANG_MAP = {
  'pt':'Português','pt-br':'Português (BR)','pt-pt':'Português (PT)',
  'en':'English','en-us':'English (US)','en-gb':'English (UK)',
  'es':'Español','fr':'Français','de':'Deutsch','it':'Italiano',
  'nl':'Nederlands','pl':'Polski','ru':'Русский','uk':'Українська',
  'ar':'العربية','zh':'中文','zh-cn':'中文 (简体)','zh-tw':'中文 (繁體)',
  'ja':'日本語','ko':'한국어','hi':'हिन्दी','th':'ภาษาไทย',
  'tr':'Türkçe','sv':'Svenska','da':'Dansk','fi':'Suomi','nb':'Norsk',
  'he':'עברית','el':'Ελληνικά','cs':'Čeština','ro':'Română',
  'hu':'Magyar','sk':'Slovenčina','bg':'Български','hr':'Hrvatski',
  'ca':'Català','id':'Bahasa Indonesia','ms':'Bahasa Melayu','vi':'Tiếng Việt',
};

const SCRIPT_COLORS = { latin:'#7B6EF6',cyrillic:'#FF5E5E',arabic:'#FFB547',cjk:'#3FFFA2',hangul:'#5EC4FF',hebrew:'#FF8C69',devanagari:'#FF6B9D',thai:'#A8E6CF',greek:'#DDA0DD' };
const SCRIPT_LABELS = { latin:'Latino',cyrillic:'Cirílico',arabic:'Árabe',cjk:'CJK (Chin/Jap)',hangul:'Hangul (Cor)',hebrew:'Hebraico',devanagari:'Devanagari',thai:'Tailandês',greek:'Grego' };

const LANG_SCRIPT = {
  ru:'cyrillic',uk:'cyrillic',bg:'cyrillic',
  ar:'arabic',he:'hebrew',hi:'devanagari',
  th:'thai',el:'greek',zh:'cjk',ja:'cjk',ko:'hangul',
};

// ─── Page scan (injected) ─────────────────────────────────────────────────────

function pageScanFn() {
  function pct(n,t){ return Math.round((n/t)*100); }
  function analyzeChars(text){
    const s=text.slice(0,2000);
    let la=0,cy=0,ar=0,cj=0,ha=0,he=0,de=0,th=0,gr=0,ot=0;
    for(const ch of s){
      const cp=ch.codePointAt(0);
      if((cp>=0x41&&cp<=0x7A)||(cp>=0xC0&&cp<=0x24F))la++;
      else if(cp>=0x400&&cp<=0x4FF)cy++;
      else if(cp>=0x600&&cp<=0x6FF)ar++;
      else if((cp>=0x4E00&&cp<=0x9FFF)||(cp>=0x3040&&cp<=0x30FF))cj++;
      else if(cp>=0xAC00&&cp<=0xD7AF)ha++;
      else if(cp>=0x590&&cp<=0x5FF)he++;
      else if(cp>=0x900&&cp<=0x97F)de++;
      else if(cp>=0xE00&&cp<=0xE7F)th++;
      else if(cp>=0x370&&cp<=0x3FF)gr++;
      else if(ch.trim().length>0)ot++;
    }
    const t=la+cy+ar+cj+ha+he+de+th+gr+ot||1;
    return{latin:pct(la,t),cyrillic:pct(cy,t),arabic:pct(ar,t),cjk:pct(cj,t),hangul:pct(ha,t),hebrew:pct(he,t),devanagari:pct(de,t),thai:pct(th,t),greek:pct(gr,t)};
  }
  function extractText(){
    const skip=new Set(['script','style','noscript','svg','head','nav','footer','iframe']);
    const walker=document.createTreeWalker(document.body||document.documentElement,NodeFilter.SHOW_TEXT,{
      acceptNode(node){let el=node.parentElement;while(el){if(skip.has(el.tagName.toLowerCase()))return NodeFilter.FILTER_REJECT;el=el.parentElement;}return node.textContent.trim().length>3?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;}
    });
    let text='',node;
    while((node=walker.nextNode())&&text.length<5000)text+=' '+node.textContent.trim();
    return text.trim();
  }
  const bodyText=extractText();
  const charStats=analyzeChars(bodyText);
  const sorted=Object.entries(charStats).sort((a,b)=>b[1]-a[1]);
  const detectedScript=sorted[0][1]>5?sorted[0][0]:'latin';
  const metaDesc=document.querySelector('meta[name="description"]')?.content||document.querySelector('meta[property="og:description"]')?.content||null;
  const canonical=document.querySelector('link[rel="canonical"]')?.href||null;
  return{
    htmlLang:document.documentElement.lang||null,
    metaLang:document.querySelector('meta[http-equiv="content-language"]')?.content||null,
    ogLocale:document.querySelector('meta[property="og:locale"]')?.content||null,
    detectedScript,charStats,
    wordCount:bodyText.trim().split(/\s+/).filter(w=>w.length>0).length,
    charCount:bodyText.replace(/\s/g,'').length,
    pageTitle:document.title,
    pageUrl:window.location.href,
    metaDescription:metaDesc,
    canonical,
    bodyText:bodyText.slice(0,8000),
  };
}

// ─── Image asset country scan (injected) ─────────────────────────────────────

function scanImageAssetsFn() {
  const CODES = ['latin_en','latin','co','cl','py','br','uy','pe','ar','mx'];
  function getRealSrc(img) {
    return img.currentSrc || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src') || img.src || '';
  }
  const imgs = Array.from(document.querySelectorAll('img'));
  const results = [];
  for (const img of imgs) {
    const src = getRealSrc(img);
    if (!src || src.includes('blank.gif') || src.startsWith('data:') || src.trim() === '') continue;
    let imgCountry = null;
    for (const code of CODES) {
      if (new RegExp('/' + code + '(?:/|[^a-z])', 'i').test(src)) { imgCountry = code; break; }
    }
    const short = src.length > 60 ? '…' + src.slice(-57) : src;
    results.push({ src, short, imgCountry, hasCountry: !!imgCountry });
  }
  return { images: results, pageUrl: window.location.href, total: results.length };
}

function highlightImgsFn(srcs) {
  document.querySelectorAll('[data-cs-img]').forEach(el => {
    el.style.outline=''; el.style.animation=''; el.style.cursor='';
    el.removeAttribute('data-cs-img');
    if(el._csClick){el.removeEventListener('click',el._csClick);delete el._csClick;}
  });
  document.querySelectorAll('[data-cs-badge]').forEach(el=>el.remove());
  document.querySelectorAll('[data-cs-pos]').forEach(el=>{el.style.position='';el.removeAttribute('data-cs-pos');});
  document.getElementById('cs-img-style')?.remove();

  const st=document.createElement('style'); st.id='cs-img-style';
  st.textContent=`@keyframes cs-pulse{0%{box-shadow:0 0 0 3px rgba(255,94,94,.9),0 0 18px rgba(255,94,94,.4)}50%{box-shadow:0 0 0 8px rgba(255,94,94,.2),0 0 30px rgba(255,94,94,.1)}100%{box-shadow:0 0 0 3px rgba(255,94,94,.9),0 0 18px rgba(255,94,94,.4)}}[data-cs-img]{outline:4px solid #FF5E5E!important;animation:cs-pulse 1.6s ease-in-out infinite!important;cursor:pointer!important;}[data-cs-badge]{position:absolute!important;top:6px!important;left:6px!important;background:#FF5E5E!important;color:#fff!important;font:700 10px/1 'DM Mono',monospace!important;padding:3px 6px!important;border-radius:4px!important;z-index:99999!important;pointer-events:none!important;}`;
  document.head.appendChild(st);

  function getRealSrc(img){return img.currentSrc||img.getAttribute('data-src')||img.getAttribute('data-original')||img.getAttribute('data-lazy-src')||img.src||'';}
  document.querySelectorAll('img').forEach(img=>{
    const src=getRealSrc(img);
    if(!srcs.includes(src))return;
    img.setAttribute('data-cs-img','1');
    img.title='[CountryScan] Asset com país divergente — clique para abrir';
    const par=img.parentElement;
    if(par&&getComputedStyle(par).position==='static'){par.style.position='relative';par.setAttribute('data-cs-pos','1');}
    const badge=document.createElement('span');
    badge.setAttribute('data-cs-badge','1');
    badge.textContent='⚠ País errado';
    (par||img).appendChild(badge);
    const h=(e)=>{e.preventDefault();e.stopPropagation();window.open(src,'_blank','noopener');};
    img._csClick=h; img.addEventListener('click',h);
  });
}

function clearImgsFn() {
  document.querySelectorAll('[data-cs-img]').forEach(el=>{
    el.style.outline='';el.style.animation='';el.style.cursor='';
    el.removeAttribute('data-cs-img');
    if(el._csClick){el.removeEventListener('click',el._csClick);delete el._csClick;}
  });
  document.querySelectorAll('[data-cs-badge]').forEach(el=>el.remove());
  document.querySelectorAll('[data-cs-pos]').forEach(el=>{el.style.position='';el.removeAttribute('data-cs-pos');});
  document.getElementById('cs-img-style')?.remove();
}

function scrollToImgFn(src) {
  function getRealSrc(img){return img.currentSrc||img.getAttribute('data-src')||img.getAttribute('data-original')||img.getAttribute('data-lazy-src')||img.src||'';}
  const img=Array.from(document.querySelectorAll('img')).find(i=>getRealSrc(i)===src);
  if(img) img.scrollIntoView({behavior:'smooth',block:'center'});
}

// ─── CTA country scan (injected) ─────────────────────────────────────────────

function scanCtasFn() {
  const CODES = ['latin_en','latin','co','cl','py','br','uy','pe','ar','mx'];
  function getCountry(url) {
    try {
      const u = new URL(url);
      for (const code of CODES) {
        if (new RegExp('/' + code + '(?:/|$)', 'i').test(u.pathname)) return code;
      }
      const sub = u.hostname.match(/^([a-z]{2,})\./i);
      if (sub && CODES.includes(sub[1].toLowerCase())) return sub[1].toLowerCase();
    } catch(_) {}
    return null;
  }
  const pageUrl = window.location.href;
  const pageCountry = getCountry(pageUrl);
  const links = Array.from(document.querySelectorAll('a[href]'));
  const results = [];
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    const text = (a.textContent || '').trim().replace(/\s+/g,' ');
    const label = text || a.getAttribute('aria-label') || '';
    if (!label || label.length < 2 || label.length > 100) continue;
    let full = href;
    try { full = new URL(href, pageUrl).href; } catch(_) {}
    let isExternal = false;
    try { isExternal = new URL(full).hostname !== new URL(pageUrl).hostname; } catch(_) {}
    const linkCountry = getCountry(full);
    const short = full.length > 60 ? '…' + full.slice(-57) : full;
    results.push({
      label, href: full, short, linkCountry, isExternal,
      wrong: !isExternal && pageCountry && linkCountry && linkCountry !== pageCountry,
    });
  }
  return { links: results, pageCountry, total: results.length };
}

function highlightCtasFn(hrefs) {
  document.querySelectorAll('[data-cs-cta]').forEach(el=>{el.style.outline='';el.removeAttribute('data-cs-cta');});
  document.getElementById('cs-cta-style')?.remove();
  const st=document.createElement('style'); st.id='cs-cta-style';
  st.textContent=`@keyframes cs-cta-pulse{0%{box-shadow:0 0 0 2px rgba(255,94,94,.9)}50%{box-shadow:0 0 0 5px rgba(255,94,94,.2)}100%{box-shadow:0 0 0 2px rgba(255,94,94,.9)}}[data-cs-cta]{outline:3px solid #FF5E5E!important;animation:cs-cta-pulse 1.8s ease-in-out infinite!important;}`;
  document.head.appendChild(st);
  document.querySelectorAll('a[href]').forEach(a=>{
    let full=a.getAttribute('href')||'';
    try{full=new URL(full,window.location.href).href;}catch(_){}
    if(hrefs.includes(full)) a.setAttribute('data-cs-cta','1');
  });
}

function clearCtasFn() {
  document.querySelectorAll('[data-cs-cta]').forEach(el=>{el.style.outline='';el.removeAttribute('data-cs-cta');});
  document.getElementById('cs-cta-style')?.remove();
}

function scrollToCtaFn(href) {
  const a=Array.from(document.querySelectorAll('a[href]')).find(el=>{
    try{return new URL(el.getAttribute('href')||'',window.location.href).href===href;}catch(_){return false;}
  });
  if(a) a.scrollIntoView({behavior:'smooth',block:'center'});
}

// ─── Language resolution ──────────────────────────────────────────────────────

function resolveLanguage(data, selectedLang) {
  if (selectedLang && selectedLang !== 'auto') {
    const name = LANG_MAP[selectedLang] || selectedLang.toUpperCase();
    return { name, code: selectedLang, confidence: 95, sources: [{ source: 'selecionado', confidence: 95 }] };
  }
  const candidates = [];
  const declared = [data.htmlLang, data.metaLang, data.ogLocale].filter(Boolean).map(l => l.toLowerCase().replace('_','-').trim());
  for (const lang of declared) {
    const base = lang.split('-')[0];
    if (LANG_MAP[lang] || LANG_MAP[base]) candidates.push({ lang, source: 'html/meta', confidence: 88 });
  }
  const scriptMap = { cyrillic:'ru', arabic:'ar', hebrew:'he', devanagari:'hi', thai:'th', greek:'el', cjk:'zh', hangul:'ko' };
  if (scriptMap[data.detectedScript] && !candidates.some(c => c.lang.startsWith(scriptMap[data.detectedScript]))) {
    candidates.push({ lang: scriptMap[data.detectedScript], source: 'escrita', confidence: 72 });
  }
  if (candidates.length === 0) candidates.push({ lang:'en', source:'padrão', confidence: 40 });
  const best = candidates[0];
  const shortLang = best.lang.split('-')[0];
  const name = LANG_MAP[best.lang] || LANG_MAP[shortLang] || best.lang.toUpperCase();
  let conf = best.confidence;
  if (data.htmlLang && data.detectedScript) conf = Math.min(conf + 5, 97);
  return { name, code: shortLang, confidence: conf, sources: candidates };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function showState(state) {
  document.getElementById('loadingState').style.display = state === 'loading' ? 'block' : 'none';
  document.getElementById('errorState').style.display   = state === 'error'   ? 'block' : 'none';
  const res = document.getElementById('resultState');
  state === 'result' ? res.classList.add('show') : res.classList.remove('show');
}

function renderSources(sources) {
  const row = document.getElementById('sourcesRow');
  row.innerHTML = '';
  const seen = new Set();
  for (const s of sources) {
    if (seen.has(s.source)) continue;
    seen.add(s.source);
    const tag = document.createElement('span');
    tag.className = 'source-tag ' + (s.confidence >= 80 ? 'match' : 'neutral');
    tag.textContent = s.source;
    row.appendChild(tag);
  }
}

function renderScripts(stats) {
  const container = document.getElementById('scriptBars');
  container.innerHTML = '';
  const entries = Object.entries(stats).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
  if (!entries.length) { container.innerHTML = '<p style="font-size:11px;color:var(--muted)">Sem dados.</p>'; return; }
  for (const [key, pct] of entries) {
    const row = document.createElement('div');
    row.className = 'script-row';
    row.innerHTML = `<span class="script-name">${SCRIPT_LABELS[key]||key}</span><div class="script-bar-wrap"><div class="script-bar" data-pct="${pct}" style="background:${SCRIPT_COLORS[key]||'#7B6EF6'}"></div></div><span class="script-pct">${pct}%</span>`;
    container.appendChild(row);
  }
  requestAnimationFrame(() => {
    document.querySelectorAll('.script-bar').forEach(b => { b.style.width = b.dataset.pct + '%'; });
  });
}

function renderPageInfo(data) {
  document.getElementById('pageTitle').textContent = data.pageTitle || '(sem título)';

  const rowDesc = document.getElementById('rowDescription');
  if (data.metaDescription) {
    rowDesc.style.display = 'flex';
    document.getElementById('pageDescription').textContent = data.metaDescription;
  } else {
    rowDesc.style.display = 'none';
  }

  const urlEl = document.getElementById('pageUrl');
  urlEl.innerHTML = '';
  if (data.pageUrl) {
    const a = document.createElement('a');
    a.href = data.pageUrl; a.textContent = data.pageUrl; a.target = '_blank'; a.rel = 'noopener';
    urlEl.appendChild(a);
  } else { urlEl.textContent = '—'; }

  const rowCan = document.getElementById('rowCanonical');
  const canEl  = document.getElementById('pageCanonical');
  if (data.canonical) {
    rowCan.style.display = 'flex';
    canEl.innerHTML = '';
    const a = document.createElement('a');
    a.href = data.canonical; a.textContent = data.canonical; a.target = '_blank'; a.rel = 'noopener';
    canEl.appendChild(a);
  } else { rowCan.style.display = 'none'; }

  // Country pill
  const countryEl = document.getElementById('pageCountryVal');
  const code = detectCountryFromUrl(data.pageUrl);
  if (code) {
    countryEl.innerHTML = `<span class="country-pill">/${code}/ — ${countryLabel(code)}</span>`;
  } else {
    countryEl.textContent = 'Não detectado na URL';
    countryEl.style.color = 'var(--muted)';
  }
}

// ─── Main scan ────────────────────────────────────────────────────────────────

let lastTabId = null;

async function scan() {
  const btn = document.getElementById('scanBtn');
  btn.disabled = true; btn.textContent = '…';
  showState('loading');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('Aba não acessível.');
    lastTabId = tab.id;

    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageScanFn });
    const data = results?.[0]?.result;
    if (!data) throw new Error('Não foi possível escanear esta página.');

    const selectedLang = document.getElementById('langSelect').value;
    const lang = resolveLanguage(data, selectedLang);

    renderPageInfo(data);

    document.getElementById('langName').textContent = lang.name;
    document.getElementById('langCode').textContent = lang.code;
    const confBar = document.getElementById('confBar');
    confBar.style.width = '0%';
    document.getElementById('confPct').textContent = lang.confidence + '%';
    setTimeout(() => { confBar.style.width = lang.confidence + '%'; }, 80);
    renderSources(lang.sources);
    document.getElementById('wordCount').textContent = (data.wordCount || 0).toLocaleString('pt-BR');
    document.getElementById('charCount').textContent = (data.charCount || 0).toLocaleString('pt-BR');
    renderScripts(data.charStats);

    showState('result');

  } catch (err) {
    let msg = err.message || 'Erro desconhecido.';
    if (msg.includes('Cannot access') || msg.includes('chrome://')) {
      msg = 'Esta página não pode ser acessada.\nTente em um site normal.';
    }
    document.getElementById('errorMsg').textContent = msg;
    showState('error');
  } finally {
    btn.disabled = false; btn.textContent = 'Scan';
  }
}

// ─── QA: Image Asset Audit ────────────────────────────────────────────────────

let imgHighlightsActive = false;

async function runImageAudit() {
  const btn      = document.getElementById('imgAuditBtn');
  const resultEl = document.getElementById('imgAuditResult');
  btn.textContent = '…'; btn.disabled = true;
  resultEl.style.display = 'none'; resultEl.innerHTML = '';
  imgHighlightsActive = false;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('Aba não acessível.');
    lastTabId = tab.id;

    const res  = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanImageAssetsFn });
    const data = res?.[0]?.result;
    if (!data) throw new Error('Erro ao varrer assets.');

    resultEl.style.display = 'flex';
    resultEl.style.flexDirection = 'column';
    resultEl.style.gap = '5px';

    const pageCountry  = detectCountryFromUrl(data.pageUrl);
    const withCountry  = data.images.filter(i => i.hasCountry);
    const divergent    = pageCountry ? withCountry.filter(i => i.imgCountry !== pageCountry) : [];
    const noCountry    = data.images.filter(i => !i.hasCountry);

    // Summary
    const sumEl = document.createElement('div');
    sumEl.className = 'qa-summary-row';
    if (!pageCountry) {
      sumEl.innerHTML = `<span style="color:var(--amber)">⚠</span><span style="color:var(--amber)">País da página não detectado na URL.</span>`;
    } else if (divergent.length === 0) {
      sumEl.innerHTML = `<span style="color:var(--green)">✓</span><span><strong style="color:var(--green)">Todos os assets</strong> <span style="color:var(--muted)">estão no país correto <strong style="color:var(--accent2)">/${pageCountry}/ (${countryLabel(pageCountry)})</strong></span></span>`;
    } else {
      sumEl.innerHTML = `<span style="color:var(--red)">⚠</span><span><strong style="color:var(--red)">${divergent.length} asset${divergent.length>1?'s':''} divergente${divergent.length>1?'s':''}</strong> <span style="color:var(--muted)">· esperado: <strong style="color:var(--accent2)">/${pageCountry}/</strong></span></span>`;
    }
    resultEl.appendChild(sumEl);

    if (pageCountry) {
      const infoEl = document.createElement('div');
      infoEl.style.cssText = 'font-size:9px;color:var(--muted);font-family:"DM Mono",monospace;padding:1px 2px;';
      infoEl.innerHTML = `Página: <strong style="color:var(--accent2)">/${pageCountry}/</strong> · com país: ${withCountry.length} · sem país: ${noCountry.length} · total: ${data.total}`;
      resultEl.appendChild(infoEl);
    }

    if (divergent.length > 0) {
      const hlBtn = document.createElement('button');
      hlBtn.className = 'qa-run-btn';
      hlBtn.style.cssText = 'border-color:rgba(255,94,94,0.4);color:var(--red);width:100%;margin-top:2px;';
      hlBtn.textContent = '⬤ Destacar divergentes na página';
      hlBtn.addEventListener('click', async () => {
        if (imgHighlightsActive) {
          await chrome.scripting.executeScript({ target: { tabId: lastTabId }, func: clearImgsFn });
          hlBtn.textContent = '⬤ Destacar divergentes na página';
          imgHighlightsActive = false;
        } else {
          await chrome.scripting.executeScript({ target: { tabId: lastTabId }, func: highlightImgsFn, args: [divergent.map(i => i.src)] });
          hlBtn.textContent = '✕ Remover destaques';
          imgHighlightsActive = true;
        }
      });
      resultEl.appendChild(hlBtn);

      const listEl = document.createElement('div');
      listEl.className = 'qa-scroll-list';
      divergent.forEach(img => {
        const item = document.createElement('div');
        item.className = 'qa-item bad';
        const cl = countryLabel(img.imgCountry) || '?';
        item.innerHTML = `<div class="qa-item-dot" style="background:var(--red)"></div><div class="qa-item-body"><strong style="color:var(--red)">/${img.imgCountry}/</strong> → ${cl}<br><span class="dim">${img.short}</span></div>`;
        const gb = document.createElement('button');
        gb.className = 'qa-item-goto'; gb.title = 'Ver na página'; gb.textContent = '↗';
        gb.addEventListener('click', () => chrome.scripting.executeScript({ target: { tabId: lastTabId }, func: scrollToImgFn, args: [img.src] }));
        item.appendChild(gb);
        listEl.appendChild(item);
      });
      resultEl.appendChild(listEl);
    }

  } catch(err) {
    resultEl.style.display = 'flex';
    resultEl.innerHTML = `<div class="qa-summary-row"><span style="color:var(--red)">Erro: ${err.message}</span></div>`;
  } finally { btn.textContent = 'Varrer'; btn.disabled = false; }
}

// ─── QA: CTA Audit ───────────────────────────────────────────────────────────

let ctaHighlightsActive = false;

async function runCtaAudit() {
  const btn      = document.getElementById('ctaAuditBtn');
  const resultEl = document.getElementById('ctaAuditResult');
  btn.textContent = '…'; btn.disabled = true;
  resultEl.style.display = 'none'; resultEl.innerHTML = '';
  ctaHighlightsActive = false;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('Aba não acessível.');
    lastTabId = tab.id;

    const res  = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanCtasFn });
    const data = res?.[0]?.result;
    if (!data) throw new Error('Erro ao varrer CTAs.');

    resultEl.style.display = 'flex';
    resultEl.style.flexDirection = 'column';
    resultEl.style.gap = '5px';

    const { links, pageCountry } = data;
    if (!pageCountry) {
      resultEl.innerHTML = `<div class="qa-summary-row"><span style="color:var(--amber)">⚠</span><span style="color:var(--amber)">País da página não detectado na URL.</span></div>`;
      return;
    }

    const wrong    = links.filter(l => l.wrong);
    const ok       = links.filter(l => !l.wrong && !l.isExternal);
    const external = links.filter(l => l.isExternal);

    const sumEl = document.createElement('div');
    sumEl.className = 'qa-summary-row';
    if (wrong.length === 0) {
      sumEl.innerHTML = `<span style="color:var(--green)">✓</span><span><strong style="color:var(--green)">Todos os CTAs</strong> <span style="color:var(--muted)">apontam para o país correto <strong style="color:var(--accent2)">/${pageCountry}/</strong></span></span>`;
    } else {
      sumEl.innerHTML = `<span style="color:var(--red)">⚠</span><span><strong style="color:var(--red)">${wrong.length} CTA${wrong.length>1?'s':''} com país errado</strong> <span style="color:var(--muted)">de ${links.length} links</span></span>`;
    }
    resultEl.appendChild(sumEl);

    const infoEl = document.createElement('div');
    infoEl.style.cssText = 'font-size:9px;color:var(--muted);font-family:"DM Mono",monospace;padding:1px 2px;';
    infoEl.innerHTML = `Página: <strong style="color:var(--accent2)">/${pageCountry}/</strong> · corretos: ${ok.length} · errados: <span style="color:var(--red)">${wrong.length}</span> · externos: ${external.length}`;
    resultEl.appendChild(infoEl);

    if (wrong.length > 0) {
      const hlBtn = document.createElement('button');
      hlBtn.className = 'qa-run-btn';
      hlBtn.style.cssText = 'border-color:rgba(255,94,94,0.4);color:var(--red);width:100%;margin-top:2px;';
      hlBtn.textContent = '⬤ Destacar CTAs errados na página';
      hlBtn.addEventListener('click', async () => {
        if (ctaHighlightsActive) {
          await chrome.scripting.executeScript({ target: { tabId: lastTabId }, func: clearCtasFn });
          hlBtn.textContent = '⬤ Destacar CTAs errados na página';
          ctaHighlightsActive = false;
        } else {
          await chrome.scripting.executeScript({ target: { tabId: lastTabId }, func: highlightCtasFn, args: [wrong.map(l => l.href)] });
          hlBtn.textContent = '✕ Remover destaques';
          ctaHighlightsActive = true;
        }
      });
      resultEl.appendChild(hlBtn);

      const listEl = document.createElement('div');
      listEl.className = 'qa-scroll-list';
      wrong.forEach(link => {
        const item = document.createElement('div');
        item.className = 'qa-item bad';
        const cl = countryLabel(link.linkCountry) || link.linkCountry || '?';
        item.innerHTML = `<div class="qa-item-dot" style="background:var(--red)"></div><div class="qa-item-body"><strong style="color:var(--text)">${link.label.slice(0,40)}${link.label.length>40?'…':''}</strong> <span style="color:var(--red)">→ /${link.linkCountry}/ (${cl})</span><br><span class="dim">${link.short}</span></div>`;
        const gb = document.createElement('button');
        gb.className = 'qa-item-goto'; gb.title = 'Ver na página'; gb.textContent = '↗';
        gb.addEventListener('click', () => chrome.scripting.executeScript({ target: { tabId: lastTabId }, func: scrollToCtaFn, args: [link.href] }));
        item.appendChild(gb);
        listEl.appendChild(item);
      });
      resultEl.appendChild(listEl);
    }

  } catch(err) {
    resultEl.style.display = 'flex';
    resultEl.innerHTML = `<div class="qa-summary-row"><span style="color:var(--red)">Erro: ${err.message}</span></div>`;
  } finally { btn.textContent = 'Varrer'; btn.disabled = false; }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.getElementById('scanBtn').addEventListener('click', scan);

document.getElementById('qaAccordionHeader').addEventListener('click', () => {
  document.getElementById('qaAccordion').classList.toggle('open');
});

document.getElementById('imgAuditBtn').addEventListener('click', runImageAudit);
document.getElementById('ctaAuditBtn').addEventListener('click', runCtaAudit);

// Auto-scan on open
document.addEventListener('DOMContentLoaded', scan);

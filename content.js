chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanPage") {
    const data = scanPageLanguage();
    sendResponse(data);
  }
  return true;
});

function scanPageLanguage() {
  const htmlLang = document.documentElement.lang || null;
  const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.content || null;
  const ogLocale = document.querySelector('meta[property="og:locale"]')?.content || null;

  const bodyText = extractMainText();
  const charStats = analyzeCharacters(bodyText);
  const detectedScript = detectScript(bodyText);
  const wordCount = bodyText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = bodyText.replace(/\s/g, '').length;

  const selectedText = window.getSelection()?.toString().trim() || null;

  // Extra SEO meta fields
  const metaDescription = document.querySelector('meta[name="description"]')?.content
    || document.querySelector('meta[property="og:description"]')?.content || null;
  const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || null;
  const canonical = document.querySelector('link[rel="canonical"]')?.href || null;

  return {
    htmlLang,
    metaLang,
    ogLocale,
    detectedScript,
    charStats,
    wordCount,
    charCount,
    selectedText,
    pageTitle: document.title,
    pageUrl: window.location.href,
    metaDescription,
    metaKeywords,
    canonical,
  };
}

function extractMainText() {
  const skipTags = new Set(['script','style','noscript','svg','head','nav','footer','iframe']);
  const walker = document.createTreeWalker(
    document.body || document.documentElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        let el = node.parentElement;
        while (el) {
          if (skipTags.has(el.tagName.toLowerCase())) return NodeFilter.FILTER_REJECT;
          el = el.parentElement;
        }
        return node.textContent.trim().length > 3
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      }
    }
  );

  let text = '';
  let node;
  while ((node = walker.nextNode()) && text.length < 5000) {
    text += ' ' + node.textContent.trim();
  }
  return text.trim();
}

function analyzeCharacters(text) {
  const sample = text.slice(0, 2000);
  let latin = 0, cyrillic = 0, arabic = 0, cjk = 0, hangul = 0,
      hebrew = 0, devanagari = 0, thai = 0, greek = 0, other = 0;

  for (const ch of sample) {
    const cp = ch.codePointAt(0);
    if ((cp >= 0x0041 && cp <= 0x007A) || (cp >= 0x00C0 && cp <= 0x024F)) latin++;
    else if (cp >= 0x0400 && cp <= 0x04FF) cyrillic++;
    else if (cp >= 0x0600 && cp <= 0x06FF) arabic++;
    else if ((cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3040 && cp <= 0x30FF)) cjk++;
    else if (cp >= 0xAC00 && cp <= 0xD7AF) hangul++;
    else if (cp >= 0x0590 && cp <= 0x05FF) hebrew++;
    else if (cp >= 0x0900 && cp <= 0x097F) devanagari++;
    else if (cp >= 0x0E00 && cp <= 0x0E7F) thai++;
    else if (cp >= 0x0370 && cp <= 0x03FF) greek++;
    else if (ch.trim().length > 0) other++;
  }

  const total = latin+cyrillic+arabic+cjk+hangul+hebrew+devanagari+thai+greek+other || 1;
  return {
    latin: pct(latin, total),
    cyrillic: pct(cyrillic, total),
    arabic: pct(arabic, total),
    cjk: pct(cjk, total),
    hangul: pct(hangul, total),
    hebrew: pct(hebrew, total),
    devanagari: pct(devanagari, total),
    thai: pct(thai, total),
    greek: pct(greek, total)
  };
}

function pct(n, total) { return Math.round((n / total) * 100); }

function detectScript(text) {
  const s = analyzeCharacters(text);
  const entries = Object.entries(s).sort((a, b) => b[1] - a[1]);
  return entries[0][1] > 5 ? entries[0][0] : 'latin';
}

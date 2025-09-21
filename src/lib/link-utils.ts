/**
 * Utility functions for detecting and formatting links in text
 */

export interface LinkifyOptions {
  target?: string;
  className?: string;
  rel?: string;
  // When true, do not escape existing HTML. Useful when input already contains safe HTML formatting.
  skipEscape?: boolean;
}

/**
 * Linkify only text nodes inside an HTML string using the browser DOM.
 * Safer than regex on HTML because it avoids touching existing tags/attributes.
 * Falls back to regex linkify when DOM is unavailable (SSR).
 */
export function linkifyHtml(html: string, options: LinkifyOptions = {}): string {
  if (!html) return '';
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Fallback in SSR: best-effort regex without escaping
      return detectAndFormatLinks(html, { ...options, skipEscape: true });
    }
    const { target = '_blank', className = 'text-blue-500 hover:text-blue-600 underline break-words', rel = 'noopener noreferrer' } = options;
    const container = document.createElement('div');
    container.innerHTML = html;

    const urlRegexProtocol = /(https?:\/\/[\w\-._~%:/?#\[\]@!$&'()*+,;=]+?)(?=[\s<]|$)/g;
    const urlRegexDomain = /(?:^|\b)((?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/g;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node: Node | null;
    // Collect first to avoid live mutation issues
    // eslint-disable-next-line no-cond-assign
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.trim()) {
        textNodes.push(node as Text);
      }
    }

    textNodes.forEach(textNode => {
      const original = textNode.nodeValue || '';
      let replaced = false;
      let htmlParts: (string | HTMLElement)[] = [];
      let lastIndex = 0;

      const processMatch = (match: RegExpExecArray, href: string) => {
        const index = match.index || 0;
        if (index > lastIndex) {
          htmlParts.push(original.slice(lastIndex, index));
        }
        // Trim trailing punctuation/backslashes from the matched text/href
        const rawText = match[0];
        const trimmedText = rawText.replace(/[)\\.,!?;:]+$/,'');
        const trimmedHref = href.replace(/[)\\.,!?;:]+$/,'');
        const a = document.createElement('a');
        a.href = trimmedHref;
        a.target = target;
        a.rel = rel;
        a.className = className;
        a.textContent = trimmedText;
        htmlParts.push(a);
        lastIndex = index + rawText.length;
        replaced = true;
      };

      // First protocol URLs
      urlRegexProtocol.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = urlRegexProtocol.exec(original)) !== null) {
        processMatch(m, m[0]);
      }

      // Then bare domains if we didn't cover them
      if (!replaced) {
        urlRegexDomain.lastIndex = 0;
        while ((m = urlRegexDomain.exec(original)) !== null) {
          const domain = m[1] || m[0];
          const href = domain.startsWith('http') ? domain : `http://${domain}`;
          processMatch(m, href);
        }
      }

      if (replaced) {
        if (lastIndex < original.length) {
          htmlParts.push(original.slice(lastIndex));
        }
        const frag = document.createDocumentFragment();
        htmlParts.forEach(part => {
          if (typeof part === 'string') frag.appendChild(document.createTextNode(part));
          else frag.appendChild(part);
        });
        const parent = textNode.parentNode as Node;
        if (parent) {
          parent.replaceChild(frag, textNode);
        }
      }
    });

    return container.innerHTML;
  } catch {
    return detectAndFormatLinks(html, { ...options, skipEscape: true });
  }
}

/**
 * Detects URLs in text and converts them to clickable links
 * Supports both http/https URLs and plain domain names
 */
export function linkifyText(text: string, options: LinkifyOptions = {}): string {
  if (!text) return '';
  
  const {
    target = '_blank',
    className = 'text-blue-500 hover:text-blue-600 underline break-words',
    rel = 'noopener noreferrer',
    skipEscape = false,
  } = options;
  
  let formattedText = text;
  
  // Escape HTML to prevent XSS
  if (!skipEscape) {
    formattedText = formattedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  
  // Match URLs with http/https protocol (supports localhost, IPs, and domains)
  // Exclude common trailing punctuation from match
  formattedText = formattedText.replace(
    /(https?:\/\/[\w\-._~%:/?#\[\]@!$&'()*+,;=]+?)(?=[\s<]|$)/g,
    `<a href="$1" target="${target}" rel="${rel}" class="${className}">$1</a>`
  );
  
  // Match URLs without protocol (e.g., www.example.com or example.com)
  // Ensure we don't match when preceded by protocol or within existing href attributes.
  // Capture an optional safe prefix to preserve punctuation/spacing.
  formattedText = formattedText.replace(
    /(^|[^\w/:"'=])(?<!https?:\/\/)(?<!href=")((?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/g,
    (_m, prefix: string, domainLike: string) => {
      const href = `http://${domainLike}`;
      return `${prefix}<a href="${href}" target="${target}" rel="${rel}" class="${className}">${domainLike}</a>`;
    }
  );
  
  return formattedText;
}

/**
 * Detects various types of links and formats them appropriately
 * Includes URLs, email addresses, and phone numbers
 */
export function detectAndFormatLinks(text: string, options: LinkifyOptions = {}): string {
  if (!text) return '';
  
  let formattedText = linkifyText(text, options);
  
  const {
    target = '_blank',
    className = 'text-blue-500 hover:text-blue-600 underline break-words',
    rel = 'noopener noreferrer',
    skipEscape = false,
  } = options;
  
  // Match email addresses
  formattedText = formattedText.replace(
    /(?<!href=")([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    `<a href="mailto:$1" class="${className}">$1</a>`
  );
  
  // Match phone numbers (basic pattern)
  formattedText = formattedText.replace(
    /(?<!href=")(\+?[\d\s\-\(\)]{10,})/g,
    (match) => {
      // Only linkify if it looks like a phone number
      const cleanNumber = match.replace(/[\s\-\(\)]/g, '');
      if (cleanNumber.length >= 10 && /^\+?[\d]+$/.test(cleanNumber)) {
        return `<a href="tel:${cleanNumber}" class="${className}">${match}</a>`;
      }
      return match;
    }
  );
  
  return formattedText;
}



/**
 * Extracts all URLs from text
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  
  const urls: string[] = [];
  
  // Match URLs with protocol
  const protocolMatches = text.match(/(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*))/g);
  if (protocolMatches) {
    urls.push(...protocolMatches);
  }
  
  // Match URLs without protocol
  const domainMatches = text.match(/(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?(?:\/[-a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%]*)?)/g);
  if (domainMatches) {
    domainMatches.forEach(match => {
      if (!urls.some(url => url.includes(match))) {
        urls.push(`http://${match}`);
      }
    });
  }
  
  return urls;
}
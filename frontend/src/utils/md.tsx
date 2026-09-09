/**
 * Renderer markdown mini & aman untuk teks dari LLM (summary_md, argument_md,
 * rationale_md, dll). Mendukung: paragraf, ## judul, list (-/* dan 1.), blockquote,
 * hr, dan inline **bold** *italic* `code` [link](url). Semua teks di-escape —
 * tidak ada HTML mentah yang dirender (aman dari injeksi konten model).
 */
import React from 'react';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type InlineNode = string | React.JSX.Element;

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string): InlineNode[] {
  const parts = text.split(INLINE_RE);
  const out: InlineNode[] = [];
  let key = 0;
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      out.push(<strong key={key++}>{escapeHtml(part.slice(2, -2))}</strong>);
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      out.push(<code key={key++}>{escapeHtml(part.slice(1, -1))}</code>);
    } else if (/^\*[^*]+\*$/.test(part)) {
      out.push(<em key={key++}>{escapeHtml(part.slice(1, -1))}</em>);
    } else if (/^\[[^\]]+\]\([^)]+\)$/.test(part)) {
      const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) {
        out.push(
          <a key={key++} href={escapeHtml(m[2])} target="_blank" rel="noreferrer noopener">
            {escapeHtml(m[1])}
          </a>,
        );
      } else {
        out.push(escapeHtml(part));
      }
    } else {
      out.push(escapeHtml(part));
    }
  }
  return out;
}

interface Block {
  kind: 'h' | 'ul' | 'ol' | 'quote' | 'hr' | 'p';
  level?: number;
  items?: string[];
  text?: string;
}

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r/g, '').split('\n');
  let i = 0;

  const flushList = (kind: 'ul' | 'ol') => {
    const items: string[] = [];
    while (i < lines.length) {
      const line = lines[i];
      const m =
        kind === 'ul'
          ? line.match(/^\s*[-*]\s+(.*)$/)
          : line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (!m) break;
      items.push(m[1]);
      i += 1;
    }
    blocks.push({ kind, items });
    return items.length > 0;
  };

  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === '') {
      i += 1;
      continue;
    }
    const h = raw.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      blocks.push({ kind: 'h', level: h[1].length, text: h[2] });
      i += 1;
      continue;
    }
    if (raw.trim() === '---' || raw.trim() === '***') {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(raw)) {
      flushList('ul');
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(raw)) {
      flushList('ol');
      continue;
    }
    if (raw.trim().startsWith('> ')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push({ kind: 'quote', text: quote.join('\n') });
      continue;
    }
    // paragraf: kumpulkan sampai baris kosong / awal blok lain.
    const para: string[] = [raw.trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('> ') &&
      lines[i].trim() !== '---' &&
      lines[i].trim() !== '***'
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'p', text: para.join(' ') });
  }
  return blocks;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = useMemoParse(source);

  return (
    <div className={className ?? 'md'}>
      {blocks.map((b, idx) => {
        switch (b.kind) {
          case 'h':
            return <h3 key={idx}>{renderInline(b.text ?? '')}</h3>;
          case 'ul':
            return (
              <ul key={idx}>
                {(b.items ?? []).map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx}>
                {(b.items ?? []).map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          case 'quote':
            return <blockquote key={idx}>{renderInline(b.text ?? '')}</blockquote>;
          case 'hr':
            return <hr key={idx} />;
          default:
            return <p key={idx}>{renderInline(b.text ?? '')}</p>;
        }
      })}
    </div>
  );
}

function useMemoParse(source: string) {
  return React.useMemo(() => parseBlocks(source), [source]);
}

import { Fragment, type ReactNode } from 'react';

/** Penanda penekanan di dalam string kamus: `<b>…</b>` dan `<em>…</em>`. */
const TOKEN = /<(b|em)>([\s\S]*?)<\/\1>/g;

export interface RichTags {
  /** Pembungkus `<b>`; default `<strong>`. */
  b?: (children: ReactNode) => ReactNode;
  /** Pembungkus `<em>`; default `<em>`. */
  em?: (children: ReactNode) => ReactNode;
}

/**
 * Ubah string kamus bertanda menjadi ReactNode.
 *
 * Sengaja TIDAK memakai pola lama `{plain}<em>{em}</em>` yang memecah kalimat
 * di dalam JSX: pola itu memaku posisi penekanan, padahal urutan kata Inggris
 * dan Indonesia berbeda. Dengan penanda di dalam string, penerjemah yang
 * menentukan di mana penekanannya berada.
 *
 * Penanda yang tidak dikenal (atau tidak berpasangan) dibiarkan apa adanya,
 * jadi teks tidak pernah hilang hanya karena salah tulis.
 */
export function renderRich(text: string, tags: RichTags = {}): ReactNode {
  const wrapB = tags.b ?? ((children: ReactNode) => <strong>{children}</strong>);
  const wrapEm = tags.em ?? ((children: ReactNode) => <em>{children}</em>);
  const token = new RegExp(TOKEN.source, 'g'); // regex lokal: tanpa state bersama
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (let match = token.exec(text); match; match = token.exec(text)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const inner = match[2];
    out.push(<Fragment key={key++}>{match[1] === 'b' ? wrapB(inner) : wrapEm(inner)}</Fragment>);
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

import type { Lang } from '../types';
import { en } from './en';
import { id } from './id';

/** Kamus per bahasa, bertipe kamus kanonik sehingga kunci selalu sinkron. */
export const DICTS: Record<Lang, typeof en> = { en, id };

export type { DictKey } from './en';

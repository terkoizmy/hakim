"""Selamatkan payload berbayar yang masih tersimpan di `cache` ke arsip permanen.

Masalah: arsip (`api_archive`, CONTRACT 1.6.0) hanya merekam payload yang
menembak Sectors SETELAH arsip dipasang. Payload yang dibayar SEBELUM itu cuma
hidup di `cache`, dan `cache` membuang isinya begitu TTL 7 hari habis — data
yang sudah dibayar kredit akan hilang tanpa jejak.

Skrip ini menyalin baris `cache` yang belum punya kembaran di arsip. Sifatnya:

- **0 kredit.** Tidak ada panggilan HTTP sama sekali — hanya baca-tulis SQLite.
- **Dry-run secara default.** Tanpa `--apply` hanya melaporkan rencananya.
- **Idempoten.** `archive_put` memakai INSERT OR IGNORE, jadi menjalankannya
  berkali-kali tidak menimpa isi arsip dan tidak menggandakan baris.
- **Provenance jujur.** `fetched_at` diambil dari `cache.created_at` (tanggal
  payload itu BENAR-BENAR diambil), bukan tanggal skrip dijalankan.
- **Tanpa sidik-jari fixture.** Tidak perlu: fixture mode `return` sebelum
  `cache_set` (lihat `SectorsClient._get`), jadi setiap baris `cache` pasti
  berasal dari panggilan live. Tidak ada data fixture yang bisa ikut tersalin.

Registry `listed_companies` ikut disalin, dengan biaya dihitung dari jumlah
halaman yang benar-benar diambil (`ceil(hasil / 200)`, 1 kredit per halaman —
paginasi screener di `_fetch_all_listed`). Menyalinnya tidak membekukan refresh
harian: `listed_companies()` punya jalur cache sendiri dan tidak pernah membaca
arsip.

Pakai:
    python scripts/backfill_archive.py            # dry-run (laporan saja)
    python scripts/backfill_archive.py --apply    # tulis ke arsip
"""

from __future__ import annotations

import argparse
import datetime
import json
import math
import sys
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import Database  # noqa: E402

SCREENER_PAGE_SIZE = 200  # sama dengan SectorsClient.SCREENER_PAGE_SIZE


def split_cache_key(key: str) -> tuple[str, Optional[str], str]:
    """`endpoint:symbol:params` → (endpoint, symbol, params).

    Bentuk kunci bervariasi: `foreign_flow:ABBA` (tanpa params),
    `suspensions:ABBA:symbol=ABBA`, dan `screener:limit=10&where=…` yang
    TIDAK punya segmen symbol — symbol-nya ada di dalam `where`. Karena itu
    segmen kedua hanya dianggap symbol bila tidak memuat `=`.
    """
    parts = key.split(":")
    endpoint = parts[0]
    rest = parts[1:]
    if rest and "=" not in rest[0]:
        return endpoint, rest[0], ":".join(rest[1:])
    return endpoint, None, ":".join(rest)


def _count_list(raw: str) -> int:
    return max(1, len([x for x in raw.split(",") if x.strip()]))


def credits_for(endpoint: str, params: str, payload: dict[str, Any]) -> int:
    """Kredit yang sudah dibayar untuk payload ini — mengikuti aturan biaya §4.

    Disengaja menghitung ulang dari kunci/params, bukan menebak: satu-satunya
    endpoint yang biayanya tidak terbaca dari params adalah registry emiten.
    """
    fields: dict[str, str] = {}
    for chunk in params.split("&"):
        if "=" in chunk:
            k, v = chunk.split("=", 1)
            fields[k.strip()] = v

    if endpoint == "company_report":
        return _count_list(fields.get("sections", ""))
    if endpoint == "top_movers":
        cls = _count_list(fields["classifications"]) if "classifications" in fields else 1
        periods = _count_list(fields["periods"]) if "periods" in fields else 1
        return max(1, cls * periods)
    if endpoint == "listed_companies":
        rows = payload.get("results") or []
        return max(1, math.ceil(len(rows) / SCREENER_PAGE_SIZE))
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--apply", action="store_true", help="tulis ke arsip (default: dry-run)")
    ap.add_argument("--db", default=None, help="path DB (default: dari Settings)")
    args = ap.parse_args()

    db = Database(args.db)

    # Kumpulkan dulu seluruh baris cache, lalu saring yang belum terarsip.
    conn = db._connect()
    try:
        rows = conn.execute(
            "SELECT cache_key, payload, created_at FROM cache ORDER BY created_at"
        ).fetchall()
    finally:
        conn.close()

    planned: list[tuple[str, str, Optional[str], str, dict, int, float]] = []
    already = 0
    for row in rows:
        key = row["cache_key"]
        if db.archive_get(key) is not None:
            already += 1
            continue
        try:
            payload = json.loads(row["payload"])
        except json.JSONDecodeError:
            print(f"  LEWAT (payload bukan JSON): {key}")
            continue
        endpoint, symbol, params = split_cache_key(key)
        planned.append(
            (
                key,
                endpoint,
                symbol,
                params,
                payload,
                credits_for(endpoint, params, payload),
                float(row["created_at"]),
            )
        )

    per_endpoint: dict[str, list[int]] = {}
    for item in planned:
        bucket = per_endpoint.setdefault(item[1], [0, 0])
        bucket[0] += 1
        bucket[1] += item[5]

    total_credits = sum(p[5] for p in planned)
    print(f"cache: {len(rows)} baris · sudah terarsip: {already} · akan disalin: {len(planned)}")
    if per_endpoint:
        print("\nper endpoint:")
        for endpoint, (n, k) in sorted(per_endpoint.items(), key=lambda kv: -kv[1][1]):
            print(f"  {endpoint:22s} {n:3d} payload  {k:3d} kredit")
    print(f"\ntotal kredit yang diselamatkan: {total_credits}")
    if planned:
        fmt = lambda t: datetime.datetime.fromtimestamp(t).strftime("%Y-%m-%d %H:%M")  # noqa: E731
        print(
            f"rentang tanggal ambil asli: {fmt(min(p[6] for p in planned))} "
            f".. {fmt(max(p[6] for p in planned))}"
        )

    if not args.apply:
        print("\nDRY-RUN — tidak ada yang ditulis. Jalankan ulang dengan --apply.")
        return 0

    for key, endpoint, symbol, params, payload, credits, ts in planned:
        db.archive_put(
            key, endpoint, symbol, params, payload, credits=credits, fetched_at=ts
        )
    _, total_rows = db.archive_list(limit=1)
    print(f"\nSELESAI. arsip sekarang {total_rows} payload, {db.archive_credits()} kredit.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

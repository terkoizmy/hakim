"""Tests for the Detective Board (CONTRACT 1.4.0).

Covers the three fixes recorded in ROADMAP §2c:

- Person identity: satu orang yang muncul di registri pemegang saham DAN di
  daftar direksi/komisaris harus jadi SATU node (bukan dua), dengan `sub`
  memuat jabatan dan KEDUA benang (`memegang` + `menjabat`).
- Percentage scaling: registri IDX mengirim fraksi (0.54942 = 54,942%) dan
  `_fmt_pct` tidak boleh menciutkan kepemilikan kecil jadi "0.0%".
- Chat papan: `POST /api/board/{ticker}/chat` memakai LLM dengan konteks graf
  dan menandai `mode="llm"`; saat LLM absen/gagal ia jatuh ke `mode="heuristik"`.

Seluruh tes hermetic: `sectors_mode="fixture"` (0 kredit Sectors) dan
`ollama_api_key=""` — LLM di-stub, jadi 0 token. Gaya async mengikuti tes lain
di repo ini: `asyncio.run` di dalam tes sinkron (tanpa pytest-asyncio).
"""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.board import (
    _EVIDENCE_TYPES,
    _chat_context,
    _evidence_edges,
    _evidence_targets,
    _fmt_pct,
    _num_units,
    _pct_from_executive,
    _pct_from_registry,
    answer_board_question,
    build_board_for_ticker,
    canonical_person_name,
)
from app.config import Settings
from app.db import Database
from app.eventbus import EventBus
from app.llm import LLMClient
from app.main import create_app
from app.models import BoardChatResponse, BoardEdge, BoardNode, BoardNodeData, BoardResponse
from app.sectors import SectorsClient

# Kosakata graf — CONTRACT §3.2. Papan tidak boleh memakai tipe di luar ini.
NODE_TYPES = {"emiten", "pemegang", "orang", "aliran", "redflag", "kabar", "fakta"}
EDGE_TYPES = {"memegang", "menjabat", "aliran", "redflag", "fakta", "bukti"}

PERSON_TYPES = {"pemegang", "orang"}


def _settings(tmp_path) -> Settings:
    return Settings(
        sectors_mode="fixture",
        db_path=str(tmp_path / "test.db"),
        # Hermetic: backend/.env memuat kunci asli — jangan sampai terwarisi.
        ollama_api_key="",
        llm_fallback_template=True,
    )


def _board(ticker: str, tmp_path) -> BoardResponse:
    settings = _settings(tmp_path)
    db = Database(settings.db_path)
    sectors = SectorsClient(settings=settings, db=db)
    return asyncio.run(build_board_for_ticker(ticker, db=db, sectors=sectors))


@pytest.fixture
def client_env(tmp_path):
    settings = _settings(tmp_path)
    db = Database(settings.db_path)
    bus = EventBus(db)
    sectors = SectorsClient(settings=settings, db=db)
    llm = LLMClient(settings=settings)
    app = create_app(settings=settings, db=db, bus=bus, sectors=sectors, llm=llm)
    return TestClient(app), settings


# --------------------------------------------------------------- pure helpers


@pytest.mark.parametrize(
    "raw,expected",
    [
        # Dua ejaan orang yang sama pada emiten yang sama (kasus nyata Sectors).
        ("Tan Ho Hien/Subur Disebut Juga Subur Tan", "Tan Ho Hien"),
        ("Tan Ho Hien/Subur Atau Dipanggil Subur Tan", "Tan Ho Hien"),
        ("Tan Ho Hien", "Tan Ho Hien"),
        ("Budi Santoso a.k.a. Budi S.", "Budi Santoso"),
        ("Siti Rahma yang biasa dipanggil Siti", "Siti Rahma"),
        ("PT Bank Central Asia Tbk", "PT Bank Central Asia Tbk"),
        # Nama pendek sebelum "/" tidak cukup dipercaya sebagai nama utama.
        ("A/Divisi Korporat", "A/Divisi Korporat"),
    ],
)
def test_canonical_person_name(raw, expected):
    assert canonical_person_name(raw) == expected


def test_canonical_person_name_identical_for_both_spellings():
    """Inti dedup: dua ejaan berbeda harus menghasilkan kunci yang sama."""
    a = canonical_person_name("Tan Ho Hien/Subur Disebut Juga Subur Tan")
    b = canonical_person_name("Tan Ho Hien/Subur Atau Dipanggil Subur Tan")
    assert a == b


def test_pct_scaling_registry_vs_executive():
    """Dua sumber persen berbeda skalanya.

    `major_shareholders` mengirim campuran (fraksi 0–1 ATAU persen) sehingga
    nilainya dideteksi; `executives_shareholdings` selalu fraksi, jadi selalu
    dikali 100 — angka mentah 0.0001 berarti 0,01%, bukan 0,0001%.
    """
    assert _pct_from_registry(0.54942) == pytest.approx(54.942)
    assert _pct_from_registry(54.942) == pytest.approx(54.942)  # sudah persen
    assert _pct_from_registry(None) is None
    assert _pct_from_executive(0.0001) == pytest.approx(0.01)
    assert _pct_from_executive(0.549) == pytest.approx(54.9)
    assert _pct_from_executive("bukan angka") is None


@pytest.mark.parametrize(
    "pct,expected",
    [
        (54.942, "54.9%"),
        (0.35, "0.35%"),
        (0.03, "0.03%"),
        (0.01, "0.01%"),
        (0.006, "0.006%"),
        (0.0, "0%"),
    ],
)
def test_fmt_pct_keeps_small_holdings_visible(pct, expected):
    """Kepemilikan 0,01% tidak boleh tampil sebagai "0.0%"."""
    assert _fmt_pct(pct) == expected


# ------------------------------------------------------------------- the board


def test_board_uses_only_contract_vocabulary(tmp_path):
    board = _board("BBCA", tmp_path)

    assert board.ticker == "BBCA"
    assert board.nodes, "papan kosong"
    assert {n.data.type for n in board.nodes} <= NODE_TYPES
    assert {e.type for e in board.edges} <= EDGE_TYPES
    assert board.initialChat


def test_board_has_exactly_one_emiten_center(tmp_path):
    board = _board("BBCA", tmp_path)

    emitens = [n for n in board.nodes if n.data.type == "emiten"]
    assert len(emitens) == 1, "papan harus punya tepat satu node pusat emiten"
    assert emitens[0].data.label == "BBCA"


def test_no_person_appears_twice(tmp_path):
    """Regresi task #23 — satu orang, satu kartu."""
    board = _board("BBCA", tmp_path)

    seen: dict[str, list[str]] = {}
    for n in board.nodes:
        if n.data.type in PERSON_TYPES:
            seen.setdefault(canonical_person_name(n.data.label), []).append(n.id)

    dupes = {k: v for k, v in seen.items() if len(v) > 1}
    assert not dupes, f"orang muncul sebagai node ganda: {dupes}"


def test_node_and_edge_ids_are_unique(tmp_path):
    board = _board("BBCA", tmp_path)

    node_ids = [n.id for n in board.nodes]
    edge_ids = [e.id for e in board.edges]
    assert len(node_ids) == len(set(node_ids))
    assert len(edge_ids) == len(set(edge_ids))


def test_every_edge_points_at_existing_nodes(tmp_path):
    board = _board("BBCA", tmp_path)

    ids = {n.id for n in board.nodes}
    dangling = [e.id for e in board.edges if e.source not in ids or e.target not in ids]
    assert not dangling, f"benang menggantung tanpa node: {dangling}"


class _FakeSectors:
    """Sectors palsu: hanya `company_report` yang menjawab, sisanya gagal.

    `build_board_for_ticker` membungkus setiap pengambilan data dengan
    try/except sendiri, jadi papan tetap terbentuk dari satu payload saja —
    cukup untuk menguji penggabungan identitas orang.
    """

    def __init__(self, payload: dict):
        self._payload = payload

    async def company_report(self, symbol, sections=None):
        from app.sectors.client import SectorsResponse

        return SectorsResponse(payload=self._payload, cache="miss", fetched_at="2026-09-14")

    def __getattr__(self, name):
        async def _fail(*args, **kwargs):
            from app.sectors.client import SectorsError

            raise SectorsError(f"endpoint {name} tidak disediakan oleh stub")

        return _fail


def _payload_two_registries() -> dict:
    """Payload sintetis: satu orang di registri pemegang saham DAN di direksi.

    Ejaan aliasnya sengaja berbeda — persis bentuk data yang dulu membuat
    orang yang sama muncul sebagai dua kartu.
    """
    return {
        "symbol": "ZZZZ",
        "company_name": "PT Uji Dua Registri Tbk",
        "sector": "Industrials",
        "valuation": {"close_price": 1000},
        "ownership": {
            "major_shareholders": [
                {
                    "name": "Tan Ho Hien/Subur Disebut Juga Subur Tan",
                    "share_percentage": 0.0001,
                    "share_amount": 11788002,
                },
                {"name": "Masyarakat", "share_percentage": 0.45},
            ],
            "institutional_transaction_flow": [],
        },
        "management": {
            "key_executives": [
                {"name": "Tan Ho Hien/Subur Atau Dipanggil Subur Tan", "position": "Director"},
                {"name": "Siti Lain", "position": "Commissioner"},
                {"name": "Budi Direktur Bersaham", "position": "Director"},
            ],
            "executives_shareholdings": [
                {
                    "name": "Tan Ho Hien/Subur Atau Dipanggil Subur Tan",
                    "share_percentage": 0.0001,
                    "share_amount": 11788002,
                },
                # Hanya di manajemen + punya saham → benang `memegang` khusus
                # direksi (id `edge_esh_*`).
                {
                    "name": "Budi Direktur Bersaham",
                    "share_percentage": 0.00035,
                    "share_amount": 2666921,
                },
            ],
        },
    }


def _board_from_payload(payload: dict, tmp_path) -> BoardResponse:
    settings = _settings(tmp_path)
    db = Database(settings.db_path)
    return asyncio.run(
        build_board_for_ticker("ZZZZ", db=db, sectors=_FakeSectors(payload))  # type: ignore[arg-type]
    )


def test_same_person_in_both_registries_becomes_one_node(tmp_path):
    """Regresi task #23 dengan bentuk data aslinya."""
    board = _board_from_payload(_payload_two_registries(), tmp_path)

    tan_nodes = [n for n in board.nodes if n.data.label == "Tan Ho Hien"]
    assert len(tan_nodes) == 1, (
        f"orang yang sama muncul {len(tan_nodes)} kali: "
        f"{[n.data.label for n in board.nodes if n.data.type in PERSON_TYPES]}"
    )

    tan = tan_nodes[0]
    # Pemilik saham yang juga menjabat → tetap tipe pemegang, jabatan masuk `sub`.
    assert tan.data.type == "pemegang"
    assert tan.data.value == "0.01%", "kepemilikan kecil menciut jadi 0.0% lagi"
    assert tan.data.sub and "Director" in tan.data.sub

    kinds = {e.type for e in board.edges if e.source == tan.id or e.target == tan.id}
    assert {"memegang", "menjabat"} <= kinds, f"benang tidak lengkap: {kinds}"

    # Kedua ejaan asli tetap terekam sebagai jejak audit.
    detail = " ".join(tan.data.detail or [])
    assert "Subur Disebut Juga Subur Tan" in detail
    assert "Subur Atau Dipanggil Subur Tan" in detail


def test_management_only_person_gets_orang_type(tmp_path):
    """Yang hanya duduk di manajemen tetap `orang` — jangan diklaim punya saham."""
    board = _board_from_payload(_payload_two_registries(), tmp_path)

    siti = [n for n in board.nodes if n.data.label == "Siti Lain"]
    assert len(siti) == 1
    assert siti[0].data.type == "orang"
    assert siti[0].data.value is None


def test_director_holding_label_is_percent_not_share_count(tmp_path):
    """Benang `memegang` direksi bersaham memakai persen, bukan jumlah lembar.

    Label "2.666.921 lbr" membuat pil label di kanvas sangat lebar sampai
    menutupi kartu tetangga; persen konsisten dengan benang `memegang` lain dan
    angka lembarnya tetap tersimpan di `detail` kartu.
    """
    board = _board_from_payload(_payload_two_registries(), tmp_path)

    budi = [n for n in board.nodes if n.data.label == "Budi Direktur Bersaham"]
    assert len(budi) == 1
    assert budi[0].data.type == "orang"

    own_edges = [
        e for e in board.edges if e.type == "memegang" and e.source == budi[0].id
    ]
    assert len(own_edges) == 1, f"benang kepemilikan direksi hilang: {board.edges}"
    label = own_edges[0].label or ""
    assert label.endswith("%"), f"label bukan persen: {label!r}"
    assert "lbr" not in label

    # Angka mentahnya tidak hilang — pindah ke detail kartu.
    detail = " ".join(budi[0].data.detail or [])
    assert "Jumlah Lembar: 2.666.921" in detail


def test_aliran_never_claims_share_ownership(tmp_path):
    """`aliran` ada supaya papan tidak menuduh broker/institusi "memegang saham"."""
    board = _board("BBCA", tmp_path)

    aliran_ids = {n.id for n in board.nodes if n.data.type == "aliran"}
    offenders = [
        e.id
        for e in board.edges
        if e.type == "memegang" and (e.source in aliran_ids or e.target in aliran_ids)
    ]
    assert not offenders, f"node aliran diberi benang memegang: {offenders}"


def test_center_node_reports_provenance(tmp_path):
    """Papan wajib jujur soal asal data: kapan diambil & dari cache atau bukan."""
    board = _board("BBCA", tmp_path)

    center = next(n for n in board.nodes if n.data.type == "emiten")
    assert center.data.retrievedAt, "node pusat tanpa tanggal pengambilan"
    assert center.data.cache in {"hit", "miss", "fixture"}


# ------------------------------------------------------- benang bukti (bukti)
# Benang `bukti` = tuduhan (red flag) → kartu penopangnya. Aturan yang diuji:
# rujukan harus PERSIS dan TUNGGAL; kalau ambigu atau tidak ada, benangnya TIDAK
# digambar. Papan bukti lebih jujur tanpa benang daripada benang yang salah.


def _nd(nid: str, ntype: str, label: str, **kw) -> BoardNode:
    return BoardNode(
        id=nid,
        type=ntype,
        position={"x": 0.0, "y": 0.0},
        data=BoardNodeData(type=ntype, label=label, **kw),
    )


@pytest.mark.parametrize(
    "text, expected",
    [
        # Regresi: satuan persen selalu diikuti spasi/tanda baca. Versi pertama
        # memakai `\b` di ujung pola, dan `\b` tidak cocok di antara dua karakter
        # non-kata ("%" lalu spasi) — akibatnya TIDAK ADA persen yang terbaca.
        ("Konsentrasi kepemilikan 54.9% oleh satu entitas", {(54.9, "%")}),
        ("Laba menyusut -0.1% YoY", {(-0.1, "%")}),
        # Ambang batas dalam tanda kurung (">2x") tidak ikut: angka bulat, tanpa desimal.
        ("Debt/Equity 2.50x (>2x)", {(2.50, "x")}),
        ("Kepemilikan 54,9% (koma desimal)", {(54.9, "%")}),
        # Angka bulat tanpa desimal sengaja TIDAK jadi jangkar: "1" terlalu lemah.
        ("Terdapat 1 aksi korporasi berisiko", set()),
        # Jumlah lembar bukan satuan yang bisa dirujuk ke kartu.
        ("Institusi Sell: 308.546.720 lbr", set()),
    ],
)
def test_num_units_requires_decimal_and_a_real_unit(text, expected):
    assert _num_units(text) == expected


def test_evidence_edge_links_flag_to_the_card_holding_the_same_number():
    evidence = [
        _nd("pemegang_dwimuria", "pemegang", "PT Dwimuria Investama Andalan", value="54.9%"),
        _nd("fakta_pe", "fakta", "Price / Earnings", value="13.7x"),
    ]
    targets = _evidence_targets("Konsentrasi kepemilikan 54.9% oleh satu entitas", evidence, [])
    assert targets == ["pemegang_dwimuria"]


def test_evidence_edge_never_fabricates_a_support_it_cannot_find():
    """Tuduhan tanpa kartu penopang di papan → tidak ada benang. Ini disengaja."""
    evidence = [_nd("fakta_pe", "fakta", "Price / Earnings", value="13.7x")]
    flag_text = "Terdapat 1 aksi korporasi berisiko (contoh stock split) yang dapat mempengaruhi struktur modal"
    assert _evidence_targets(flag_text, evidence, []) == []


def test_evidence_edge_skips_ambiguous_number_match():
    """Dua kartu memuat angka yang sama → tidak ada yang boleh dipilih."""
    evidence = [
        _nd("kabar_dividen_1", "kabar", "Dividen", value="2.50x"),
        _nd("kabar_dividen_2", "kabar", "Dividen", value="2.50x"),
    ]
    assert _evidence_targets("Rasio 2.50x menandakan beban", evidence, []) == []


def test_evidence_edge_skips_ambiguous_label_match():
    evidence = [
        _nd("kabar_dividen_1", "kabar", "Dividen"),
        _nd("kabar_dividen_2", "kabar", "Dividen"),
    ]
    assert _evidence_targets("Aksi korporasi Dividen tahun ini", evidence, []) == []


def test_evidence_edge_matches_label_but_not_short_labels():
    evidence = [_nd("kabar_suspensi", "kabar", "Suspensi")]
    assert _evidence_targets("Emiten kena Suspensi BEI", evidence, []) == ["kabar_suspensi"]
    # Label < 4 karakter tidak boleh jadi jangkar (terlalu mudah cocok).
    short = [_nd("kabar_x", "kabar", "ARB")]
    assert _evidence_targets("Saham kena ARB hari ini", short, []) == []


def test_evidence_hint_from_detector_outranks_guessing():
    """Detektor tahu persis kartu mana yang dibangun dari datum yang sama."""
    evidence = [
        _nd("fakta_der", "fakta", "Debt / Equity", value="2.50x"),
        _nd("fakta_pe", "fakta", "Price / Earnings", value="13.7x"),
    ]
    hints = [("fakta", "debt/equity")]
    assert _evidence_targets("Debt-to-Equity Ratio tinggi: 2.50x (>2x)", evidence, hints) == [
        "fakta_der"
    ]


def test_evidence_edge_shape_and_vocabulary():
    """Setiap benang `bukti` berawal dari red flag dan berakhir di kartu bukti."""
    nodes = [
        _nd("rf_1_konsentrasi", "redflag", "Konsentrasi 54.9%", detail=["Konsentrasi 54.9% satu entitas"]),
        _nd("rf_2_stock_split", "redflag", "Stock split", detail=["Terdapat 1 aksi korporasi berisiko"]),
        _nd("pemegang_dwimuria", "pemegang", "PT Dwimuria Investama Andalan", value="54.9%"),
        _nd("rf_3_kabar", "redflag", "Tuduhan lain", detail=["Tuduhan tanpa penopang"]),
    ]
    edges = _evidence_edges(nodes, {})

    assert [e.type for e in edges] == ["bukti"]
    by_id = {n.id: n for n in nodes}
    for e in edges:
        assert by_id[e.source].data.type == "redflag"
        assert by_id[e.target].data.type in _EVIDENCE_TYPES
    # Flag tanpa kartu penopang tidak muncul sebagai sumber.
    assert {e.source for e in edges} == {"rf_1_konsentrasi"}


def test_evidence_edge_is_capped_and_deduped():
    """Satu tuduhan paling banyak ditopang 2 kartu, tanpa benang kembar."""
    nodes = [
        _nd(
            "rf_1",
            "redflag",
            "Konsentrasi 54.9% dan laba -0.1%",
            detail=["Konsentrasi 54.9% dan laba -0.1% sekaligus"],
        ),
        _nd("pemegang_dwimuria", "pemegang", "Dwimuria", value="54.9%"),
        _nd("fakta_laba", "fakta", "Pertumbuhan Laba YoY", value="-0.1%"),
        _nd("fakta_pe", "fakta", "Price / Earnings", value="13.7x"),
    ]
    edges = _evidence_edges(nodes, {})
    targets = [e.target for e in edges]
    assert len(targets) == len(set(targets)) <= 2


def test_chat_context_lists_evidence_threads_and_flags_the_unsupported():
    board = _stub_board()
    board.edges.append(
        BoardEdge(id="eb1", source="redflag_c", target="pemegang_a", type="bukti", label="bukti")
    )
    ctx = _chat_context(board)

    assert "Benang bukti (red flag ← kartu penopangnya)" in ctx
    assert "Utang jatuh tempo ← Grup Uji" in ctx
    # Red flag yang tidak punya benang disebut eksplisit, supaya LLM tidak
    # mengarang penopangnya.
    board.nodes.append(_nd("redflag_z", "redflag", "Kabar tanpa penopang"))
    ctx2 = _chat_context(board)
    assert "Red flag tanpa kartu penopang di papan: Kabar tanpa penopang" in ctx2


# --------------------------------------------------------------------- the chat


def _stub_board() -> BoardResponse:
    """Papan kecil buatan sendiri — tes chat tidak perlu menyentuh Sectors."""

    def node(nid: str, ntype: str, label: str, **kw) -> BoardNode:
        return BoardNode(
            id=nid,
            type=ntype,
            position={"x": 0.0, "y": 0.0},
            data=BoardNodeData(type=ntype, label=label, **kw),
        )

    return BoardResponse(
        ticker="TEST",
        name="PT Uji Coba Tbk",
        nodes=[
            node("emiten_TEST", "emiten", "TEST"),
            node("pemegang_a", "pemegang", "Grup Uji", value="54.9%", sub="Kepemilikan 54.9%"),
            node("orang_b", "orang", "Budi Santoso", sub="Director"),
            node("aliran_d", "aliran", "BK", sub="Net buy 1,2 M"),
            node("redflag_c", "redflag", "Utang jatuh tempo", severity="tinggi"),
        ],
        edges=[
            BoardEdge(
                id="e1", source="emiten_TEST", target="pemegang_a", type="memegang", label="54.9%"
            ),
            BoardEdge(
                id="e2", source="emiten_TEST", target="orang_b", type="menjabat", label="Director"
            ),
            BoardEdge(id="e4", source="emiten_TEST", target="aliran_d", type="aliran"),
            BoardEdge(id="e3", source="emiten_TEST", target="redflag_c", type="redflag"),
        ],
        initialChat="Papan uji aktif.",
        aiInsights={"fakta": "Valuasi TEST wajar."},
        thesisSummary="Tesis uji.",
    )


class _StubLLM:
    """LLM palsu: mengembalikan teks tanpa menyentuh jaringan (0 token)."""

    def __init__(self, reply: str = "Pemegang utama TEST adalah Grup Uji (54.9%).", exc=None):
        self._reply = reply
        self._exc = exc
        self.calls: list[dict] = []

    @property
    def available(self) -> bool:
        return True

    async def chat(self, model, messages, **kwargs):
        self.calls.append({"model": model, "messages": messages, **kwargs})
        if self._exc:
            raise self._exc
        return self._reply


def test_chat_context_summarizes_graph():
    ctx = _chat_context(_stub_board())
    assert "Emiten: TEST" in ctx
    assert "Grup Uji" in ctx and "54.9%" in ctx
    assert "Budi Santoso" in ctx
    assert "Utang jatuh tempo" in ctx
    assert "Tesis uji." in ctx


def test_chat_context_distinguishes_flow_from_ownership():
    """LLM harus tahu node `aliran` BUKAN pemegang saham (anti-tuduhan palsu)."""
    ctx = _chat_context(_stub_board())
    assert "Jejak broker/institusi (bukan pemegang saham): BK" in ctx


def test_chat_uses_llm_and_labels_mode():
    settings = Settings(ollama_api_key="x", model_analyst="model-uji")
    stub = _StubLLM()
    res = asyncio.run(
        answer_board_question(
            "TEST", "siapa pemegang sahamnya?", _stub_board(), llm=stub, settings=settings
        )
    )

    assert res.mode == "llm"
    assert res.model == "model-uji"
    assert res.reply == stub._reply
    assert stub.calls, "LLM tidak dipanggil"
    sent = stub.calls[0]
    assert sent["model"] == "model-uji"
    assert sent["messages"][0]["role"] == "system"
    # Konteks graf + pertanyaan user ikut terkirim.
    assert "Grup Uji" in sent["messages"][1]["content"]
    assert "siapa pemegang sahamnya?" in sent["messages"][1]["content"]
    # Prompt sistem mengikat jawaban pada papan (anti-halusinasi).
    assert "PAPAN BUKTI" in sent["messages"][0]["content"]


def test_chat_falls_back_to_heuristic_when_llm_fails():
    settings = Settings(ollama_api_key="x", model_analyst="model-uji")
    stub = _StubLLM(exc=RuntimeError("429 rate limited"))
    res = asyncio.run(
        answer_board_question(
            "TEST", "siapa pemegang sahamnya?", _stub_board(), llm=stub, settings=settings
        )
    )

    assert res.mode == "heuristik"
    assert res.model is None
    assert "Grup Uji" in res.reply


def test_chat_heuristic_is_keyword_aware_without_llm():
    settings = Settings(ollama_api_key="")
    llm = LLMClient(settings)  # available == False
    assert llm.available is False
    res = asyncio.run(
        answer_board_question(
            "TEST", "apa red flag-nya?", _stub_board(), llm=llm, settings=settings
        )
    )

    assert isinstance(res, BoardChatResponse)
    assert res.mode == "heuristik"
    assert "Utang jatuh tempo" in res.reply


def test_chat_ignores_empty_llm_reply():
    """Balasan kosong dari LLM bukan jawaban — harus jatuh ke heuristik."""
    settings = Settings(ollama_api_key="x", model_analyst="model-uji")
    stub = _StubLLM(reply="   ")
    res = asyncio.run(
        answer_board_question(
            "TEST", "siapa pemegang sahamnya?", _stub_board(), llm=stub, settings=settings
        )
    )
    assert res.mode == "heuristik"


# ----------------------------------------------------------------- HTTP surface


def test_board_endpoint_shape(client_env):
    client, _ = client_env
    r = client.get("/api/board/BBCA")
    assert r.status_code == 200
    body = r.json()
    assert body["ticker"] == "BBCA"
    assert isinstance(body["nodes"], list) and body["nodes"]
    assert {n["data"]["type"] for n in body["nodes"]} <= NODE_TYPES
    assert {e["type"] for e in body["edges"]} <= EDGE_TYPES


def test_chat_endpoint_reports_mode(client_env):
    """Tanpa LLM (kunci kosong) endpoint tetap 200 dan jujur bilang heuristik."""
    client, _ = client_env
    r = client.post("/api/board/BBCA/chat", json={"message": "siapa pemegang sahamnya?"})
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "heuristik"
    assert body["model"] is None
    assert body["reply"].strip()


def test_chat_endpoint_rejects_invalid_ticker(client_env):
    client, _ = client_env
    r = client.post("/api/board/xx/chat", json={"message": "halo"})
    assert r.status_code == 422

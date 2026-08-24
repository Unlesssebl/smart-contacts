import difflib
import json
import logging
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from shared.models.user import User
from shared.models.system_setting import SystemSetting
from shared.utils import apply_canonical_mapping

logger = logging.getLogger(__name__)


def apply_dept_canonical_mapping_bg(mapping: dict[str, str]):
    """Applies updated canonical department mappings to all users in the background."""
    db = SessionLocal()
    try:
        users = db.query(User).filter(
            (User.department_raw.isnot(None)) | (User.department.isnot(None))
        ).all()
        for user in users:
            raw_dept = user.department_raw or user.department
            if raw_dept:
                user.department_raw = raw_dept
                user.department = apply_canonical_mapping(raw_dept, mapping)
        db.commit()
    except Exception as e:
        logger.error(f"Error in apply_dept_canonical_mapping_bg: {e}")
    finally:
        db.close()


def apply_job_title_canonical_mapping_bg(mapping: dict[str, str]):
    """Applies updated canonical job title mappings to all users in the background."""
    db = SessionLocal()
    try:
        users = db.query(User).filter(
            (User.job_title_raw.isnot(None)) | (User.job_title.isnot(None))
        ).all()
        for user in users:
            raw_job = user.job_title_raw or user.job_title
            if raw_job:
                user.job_title_raw = raw_job
                user.job_title = apply_canonical_mapping(raw_job, mapping)
        db.commit()
    except Exception as e:
        logger.error(f"Error in apply_job_title_canonical_mapping_bg: {e}")
    finally:
        db.close()


ABBR_MAP = {
    'зам': 'заместитель',
    'нач': 'начальник',
    'вед': 'ведущий',
    'кат': 'категория',
    'ген': 'генеральный',
    'исп': 'исполняющий',
    'ст': 'старший',
    'мл': 'младший',
    'пом': 'помощник',
    'инж': 'инженер',
    'бух': 'бухгалтер',
    'адм': 'администратор',
    'техн': 'технолог',
    'рук': 'руководитель',
    'спец': 'специалист',
    'экон': 'экономист',
    'гл': 'главный',
    'юо': 'юридический',
    'пто': 'производственно-технический',
    'а\\п': 'активных продаж',
    'ап': 'активных продаж',
}

STRUCTURAL_PREFIXES = {
    'подразделение', 'отдел', 'служба', 'бюро', 'сектор', 'департамент',
    'управление', 'группа', 'направление', 'блок'
}


def _stem_ru(w: str) -> str:
    w = w.lower().strip('.,')
    w = re.sub(r'(ов|ев|ей|ами|ями|иями|ах|ях|иях|ого|его|ому|ему|ыми|ими|ую|юю|ой|ей|ий|ый|ая|яя|ое|ее|ые|ие|ия|ья|ью|ом|ем|ам|ям|а|я|у|ю|е|о|ы|и)$', '', w)
    return w


def _normalize_word(w: str) -> str:
    clean = w.lower().strip('.,')
    expanded = ABBR_MAP.get(clean, clean)
    return _stem_ru(expanded)


def _words_are_similar(w1: str, w2: str) -> bool:
    if w1 == w2:
        return True
    n1 = _normalize_word(w1)
    n2 = _normalize_word(w2)
    if n1 == n2:
        return True
    # Typo tolerance for words with length >= 4
    if len(n1) >= 4 and len(n2) >= 4:
        if difflib.SequenceMatcher(None, n1, n2).ratio() >= 0.75:
            return True
    return False


HOMOGLYPHS = str.maketrans({
    'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н', 'K': 'К', 'M': 'М', 'O': 'О', 'P': 'Р', 'T': 'Т', 'X': 'Х',
    'a': 'а', 'c': 'с', 'e': 'е', 'o': 'о', 'p': 'р', 'x': 'х', 'y': 'у'
})

ROMAN_NUMS = {
    'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6',
    'i-й': '1', 'ii-й': '2', 'iii-й': '3', '1-й': '1', '2-й': '2', '3-й': '3',
    '1-я': '1', '2-я': '2', '3-я': '3', '1-го': '1', '2-го': '2', '3-го': '3'
}


def _sanitize_text(s: str) -> str:
    if not s:
        return ''
    s = s.replace('ё', 'е').replace('Ё', 'Е').replace('\u00a0', ' ')
    s = s.replace('№', ' ').replace('#', ' ').replace('N ', ' ')
    s = s.translate(HOMOGLYPHS)
    s = s.replace('\\', '/')
    s = re.sub(r'\bа/п\b', 'активных продаж', s, flags=re.IGNORECASE)
    s = re.sub(r'\bз/п\b', 'заработной плате', s, flags=re.IGNORECASE)
    s = re.sub(r'\bи\.?о\.?\b', 'исполняющий обязанности', s, flags=re.IGNORECASE)
    return s


QUALIFIER_WORDS = {'категория', 'категории', 'разряд', 'разряда', 'класс', 'класса', 'кат'}


def _strip_category_qualifiers(tokens: list[str]) -> list[str]:
    res = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in QUALIFIER_WORDS:
            i += 1
            continue
        if t.isdigit() and ((i + 1 < len(tokens) and tokens[i+1] in QUALIFIER_WORDS) or (i > 0 and tokens[i-1] in QUALIFIER_WORDS)):
            i += 1
            continue
        res.append(t)
        i += 1
    return res


def _get_tokens(s: str, strip_categories: bool = False) -> list[str]:
    sanitized = _sanitize_text(s)
    raw_tokens = re.findall(r'[а-яa-z0-9]+', sanitized.lower())
    tokens = [ROMAN_NUMS.get(t, t) for t in raw_tokens]
    if strip_categories:
        tokens = _strip_category_qualifiers(tokens)
    return tokens


def _get_acronym(tokens: list[str]) -> str:
    if len(tokens) >= 2:
        return ''.join(w[0] for w in tokens)
    return ''


def _are_phrases_similar(a: str, b: str, is_department: bool = False) -> bool:
    t_a = _get_tokens(a, strip_categories=not is_department)
    t_b = _get_tokens(b, strip_categories=not is_department)
    if not t_a or not t_b:
        return False
    if a.lower().strip() == b.lower().strip():
        return True

    # 1. Strict Acronym match (e.g. ОГМ <-> отдел главного механика, ПЭО <-> планово-экономический отдел)
    acr_a = _get_acronym(t_a)
    acr_b = _get_acronym(t_b)
    clean_a = ''.join(t_a)
    clean_b = ''.join(t_b)
    if len(acr_a) >= 2 and clean_b == acr_a:
        return True
    if len(acr_b) >= 2 and clean_a == acr_b:
        return True

    # 2. Structural prefix normalization for departments (e.g. "подразделение" <-> "отдел" <-> "служба")
    core_a = [w for w in t_a if w not in STRUCTURAL_PREFIXES] if is_department else t_a
    core_b = [w for w in t_b if w not in STRUCTURAL_PREFIXES] if is_department else t_b
    if not core_a:
        core_a = t_a
    if not core_b:
        core_b = t_b

    # 3. Token-by-token comparison with typo tolerance and abbreviation expansion
    if len(core_a) == len(core_b):
        if all(_words_are_similar(w1, w2) for w1, w2 in zip(core_a, core_b)):
            return True

    return False


def _pick_canonical(group: list[str]) -> str:
    clean_variants = [
        v for v in group
        if not re.search(r'\b(\d+|i+|ii+|iii+|iv+|v+|vi+)\s*(категори\w*|разряд\w*|класс\w*|кат\.?)\b', v, re.I) and
           not re.search(r'\b(категори\w*|разряд\w*|класс\w*|кат\.?)\s*(\d+|i+|ii+|iii+|iv+|v+|vi+)\b', v, re.I)
    ]
    pool = clean_variants if clean_variants else group
    return max(pool, key=lambda s: (s[0].isupper(), len(s.split()), len(s)))


def suggest_clusters(raw_items: list[str], is_department: bool = False) -> list[dict[str, Any]]:
    items = sorted(list({i.strip() for i in raw_items if i and i.strip() and i.strip() != '[]'}))
    if len(items) < 2:
        return []

    parent = {i: i for i in items}
    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]

    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj

    n = len(items)
    for i in range(n):
        for j in range(i + 1, n):
            if _are_phrases_similar(items[i], items[j], is_department):
                union(items[i], items[j])

    clusters: dict[str, list[str]] = {}
    for item in items:
        clusters.setdefault(find(item), []).append(item)

    results = []
    for root, group in clusters.items():
        if len(group) >= 2:
            canonical = _pick_canonical(group)
            results.append({
                "suggested_canonical": canonical,
                "variants": group
            })

    results.sort(key=lambda x: len(x["variants"]), reverse=True)
    return results




def filter_unresolved_clusters(
    clusters: list[dict[str, Any]],
    existing_mapping: dict[str, str]
) -> list[dict[str, Any]]:
    if not existing_mapping:
        return clusters

    mapping_lower = {k.lower().strip(): v.strip() for k, v in existing_mapping.items()}
    unresolved = []
    for cluster in clusters:
        variants = cluster["variants"]
        unmapped_variants = [
            v for v in variants
            if v not in existing_mapping and v.lower().strip() not in mapping_lower
        ]

        if not unmapped_variants:
            mapped_targets = {
                existing_mapping.get(v) or mapping_lower.get(v.lower().strip())
                for v in variants
            }
            if len(mapped_targets) <= 1:
                continue

        # Check if the only unmapped variant is the canonical target of all mapped variants
        mapped_targets = {
            existing_mapping.get(v) or mapping_lower.get(v.lower().strip())
            for v in variants
            if v in existing_mapping or v.lower().strip() in mapping_lower
        }
        if len(unmapped_variants) == 1 and len(mapped_targets) == 1:
            only_unmapped = unmapped_variants[0].strip().lower()
            only_target = list(mapped_targets)[0].strip().lower()
            if only_unmapped == only_target:
                continue

        # Prefer known canonical name from existing mapping if any variant in the cluster is already mapped
        known_canonical = None
        for v in variants:
            target = existing_mapping.get(v) or mapping_lower.get(v.lower().strip())
            if target:
                known_canonical = target
                break
        if known_canonical:
            cluster["suggested_canonical"] = known_canonical

        unresolved.append(cluster)
    return unresolved



def get_canonical_suggestions(db: Session) -> dict[str, Any]:
    # Load existing mappings from DB
    dept_setting = db.get(SystemSetting, "DEPT_MAPPING")
    existing_dept_mapping = {}
    if dept_setting and dept_setting.value:
        try:
            existing_dept_mapping = json.loads(dept_setting.value)
        except json.JSONDecodeError:
            existing_dept_mapping = {}

    job_setting = db.get(SystemSetting, "JOB_TITLE_MAPPING")
    existing_job_mapping = {}
    if job_setting and job_setting.value:
        try:
            existing_job_mapping = json.loads(job_setting.value)
        except json.JSONDecodeError:
            existing_job_mapping = {}

    # Extract unique departments and job titles
    raw_depts = [
        d[0] for d in db.query(User.department_raw).filter(User.department_raw.isnot(None)).distinct().all()
        if d[0]
    ]
    if not raw_depts:
        raw_depts = [
            d[0] for d in db.query(User.department).filter(User.department.isnot(None)).distinct().all()
            if d[0]
        ]

    # Split nested department paths so parts can also be clustered
    all_dept_items = set()
    for d in raw_depts:
        all_dept_items.add(d)
        for part in d.split(" / "):
            if part.strip():
                all_dept_items.add(part.strip())

    raw_jobs = [
        j[0] for j in db.query(User.job_title_raw).filter(User.job_title_raw.isnot(None)).distinct().all()
        if j[0]
    ]
    if not raw_jobs:
        raw_jobs = [
            j[0] for j in db.query(User.job_title).filter(User.job_title.isnot(None)).distinct().all()
            if j[0]
        ]

    dept_clusters = suggest_clusters(list(all_dept_items), is_department=True)
    job_clusters = suggest_clusters(raw_jobs, is_department=False)

    return {
        "departments": filter_unresolved_clusters(dept_clusters, existing_dept_mapping),
        "job_titles": filter_unresolved_clusters(job_clusters, existing_job_mapping)
    }


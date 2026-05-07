from __future__ import annotations


def _parse_version(version: str) -> tuple[int, ...] | None:
    parts = version.split(".")
    if not parts:
        return None
    parsed: list[int] = []
    for part in parts:
        if not part.isdigit():
            return None
        parsed.append(int(part))
    return tuple(parsed)


def schema_versions_compatible(expected: str, actual: str) -> bool:
    expected_parts = _parse_version(expected)
    actual_parts = _parse_version(actual)
    if expected_parts is None or actual_parts is None:
        return False
    if not expected_parts or not actual_parts:
        return False
    if expected_parts[0] != actual_parts[0]:
        return False
    width = max(len(expected_parts), len(actual_parts))
    normalized_expected = expected_parts + (0,) * (width - len(expected_parts))
    normalized_actual = actual_parts + (0,) * (width - len(actual_parts))
    return normalized_actual >= normalized_expected

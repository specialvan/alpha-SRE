from __future__ import annotations


class AlphaSREError(Exception):
    """Base error for the alpha_sre package."""


class SnapshotValidationError(AlphaSREError):
    pass


class ReplayValidationError(AlphaSREError):
    pass

import hashlib
import hmac
import logging
from urllib.parse import parse_qsl

logger = logging.getLogger(__name__)


def verify_init_data(init_data: str, bot_token: str) -> dict:
    if not init_data:
        raise ValueError("init_data is required")
    data = dict(parse_qsl(init_data, strict_parsing=True))
    hash_value = data.pop("hash", None)
    if not hash_value:
        raise ValueError("hash missing")

    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(data.items())])
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    computed = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if computed != hash_value:
        logger.warning(
            "init_data hash mismatch: len=%s hash=%s computed=%s",
            len(init_data),
            hash_value,
            computed,
        )
        raise ValueError("invalid hash")
    return data

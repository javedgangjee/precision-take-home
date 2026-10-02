import logging
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.broadcaster import Broadcaster, SettingsPacket
from app.settings import Settings, SettingsUpdate

logger = logging.getLogger(__name__)


async def check_token(
    request: Request, authorization: Annotated[str | None, Header()] = None
) -> None:
    """Allow a request only when it sends the header `Authorization: Bearer <token>`.

    With no token set, every admin path returns 404, so the server has no admin API.
    """
    token: str | None = request.app.state.settings.admin_token
    if not token:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    # Compare bytes, because compare_digest takes only ASCII in a str.
    if authorization is None or not secrets.compare_digest(
        authorization.encode(), f"Bearer {token}".encode()
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, headers={"WWW-Authenticate": "Bearer"})


# The handlers are async, so they run on the event loop with the broadcaster and never in a thread.
router = APIRouter(prefix="/admin", dependencies=[Depends(check_token)])


def state(request: Request) -> SettingsPacket:
    """Return the same settings packet that the stream sends."""
    broadcaster: Broadcaster = request.app.state.broadcaster
    return broadcaster.state


@router.get("/settings")
async def get_settings(request: Request) -> SettingsPacket:
    return state(request)


@router.patch("/settings")
async def patch_settings(request: Request, update: SettingsUpdate) -> SettingsPacket:
    changes = update.model_dump(exclude_unset=True)
    settings: Settings = request.app.state.settings.model_copy(update=changes)
    request.app.state.settings = settings
    request.app.state.broadcaster.update(settings)
    logger.info("Admin changed the settings: %s", changes)
    return state(request)


@router.post("/pause")
async def pause(request: Request) -> SettingsPacket:
    request.app.state.broadcaster.pause()
    logger.info("Admin paused the generation")
    return state(request)


@router.post("/resume")
async def resume(request: Request) -> SettingsPacket:
    request.app.state.broadcaster.resume()
    logger.info("Admin resumed the generation")
    return state(request)

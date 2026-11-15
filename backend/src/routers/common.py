from fastapi import HTTPException

from src.services.errors import ServiceError


def service_error(exc: ServiceError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))

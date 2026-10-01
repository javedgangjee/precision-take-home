# The backend image. It runs in Docker Desktop on the laptop and on ECS Fargate with ARM64.
# make docker-build sets the platform to linux/arm64.

FROM python:3.13.15-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.11.24 /uv /usr/local/bin/uv
WORKDIR /app
# uv copies files into the venv and compiles them to bytecode, and it uses the Python in the image.
ENV UV_LINK_MODE=copy UV_COMPILE_BYTECODE=1 UV_PYTHON_DOWNLOADS=never
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev

FROM python:3.13.15-slim
RUN useradd --system --uid 10001 --no-create-home app
WORKDIR /app
COPY --from=build /app/.venv /app/.venv
COPY app/ app/
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "3"]

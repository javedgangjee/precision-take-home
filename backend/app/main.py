from fastapi import FastAPI

app = FastAPI(title="Bin There Done That")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

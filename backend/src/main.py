from fastapi import FastAPI

app = FastAPI(title="YOLO Counter API")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "API Backend Rodando"}
from fastapi import FastAPI

app = FastAPI(title="Smart Directory API Gateway")

@app.get("/")
async def root():
    return {"message": "Welcome to Smart Directory API Gateway"}

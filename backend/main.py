from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from explanation_request import ExplanationRequest
from openorca_teacher import OpenOrcaTeacher

app = FastAPI()
llm_teacher = OpenOrcaTeacher()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/explain")
async def explain(request: ExplanationRequest):
    explanation = llm_teacher.explain(request.word, request.context)
    tries = 0
    while not explanation and tries < 10000:
        print("Received Empty for some unknown reason, trying again...")
        explanation = llm_teacher.explain(request.word, request.context)
        tries += 1
    return {"explanation": explanation}

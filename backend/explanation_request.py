from pydantic import BaseModel


class ExplanationRequest(BaseModel):
    word: str
    context: str

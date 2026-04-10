from pydantic import BaseModel
from typing import List

class PDFContent(BaseModel):
    title: str
    paragraphs: List[str]

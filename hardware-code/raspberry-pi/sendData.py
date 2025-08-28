from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from firebase import db, firestore  # re-use initialized Firestore client

app = FastAPI(title="IoT Firestore API")

class DataItem(BaseModel):
    deviceId: Optional[str] = None
    value: Any
    meta: Optional[Dict[str, Any]] = None

@app.post("/data")
async def create_data(item: DataItem):
    doc_ref = db.collection("iotData").document()
    payload = item.model_dump()
    payload["createdAt"] = firestore.SERVER_TIMESTAMP
    doc_ref.set(payload)
    return {"id": doc_ref.id, "status": "stored"}

@app.get("/data/{doc_id}")
async def get_data(doc_id: str):
    snap = db.collection("iotData").document(doc_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Not found")
    data = snap.to_dict()
    data["id"] = snap.id
    return data

@app.get("/data")
async def list_data(
    deviceId: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    col = db.collection("iotData")
    if deviceId:
        col = col.where("deviceId", "==", deviceId)
    # Order by creation time descending if field exists
    try:
        col = col.order_by("createdAt", direction=firestore.Query.DESCENDING)
    except Exception:
        pass
    snaps = col.limit(limit).stream()
    out: List[Dict[str, Any]] = []
    for s in snaps:
        d = s.to_dict()
        d["id"] = s.id
        out.append(d)
    return out

@app.delete("/data/{doc_id}")
async def delete_data(doc_id: str):
    ref = db.collection("iotData").document(doc_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Not found")
    ref.delete()
    return {"id": doc_id, "status": "deleted"}
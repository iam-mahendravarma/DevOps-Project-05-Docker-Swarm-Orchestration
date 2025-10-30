from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ToDo API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = MongoClient(MONGODB_URL)
db = client.todo_db
todos_collection = db.todos

# Pydantic models
class TodoItem(BaseModel):
    title: str
    description: Optional[str] = ""
    completed: bool = False
    created_at: Optional[datetime] = None

class TodoResponse(TodoItem):
    id: str

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

# Routes
@app.get("/")
async def root():
    return {"message": "ToDo API is running!"}

@app.get("/todos", response_model=List[TodoResponse])
async def get_todos():
    """Get all todo items"""
    todos = []
    for todo in todos_collection.find():
        todo["id"] = str(todo["_id"])
        todos.append(TodoResponse(**todo))
    return todos

@app.post("/todos", response_model=TodoResponse)
async def create_todo(todo: TodoItem):
    """Create a new todo item"""
    todo_dict = todo.dict()
    todo_dict["created_at"] = datetime.now()
    result = todos_collection.insert_one(todo_dict)
    todo_dict["id"] = str(result.inserted_id)
    return TodoResponse(**todo_dict)

@app.get("/todos/{todo_id}", response_model=TodoResponse)
async def get_todo(todo_id: str):
    """Get a specific todo item"""
    from bson import ObjectId
    try:
        todo = todos_collection.find_one({"_id": ObjectId(todo_id)})
        if todo:
            todo["id"] = str(todo["_id"])
            return TodoResponse(**todo)
        else:
            raise HTTPException(status_code=404, detail="Todo not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid todo ID")

@app.put("/todos/{todo_id}", response_model=TodoResponse)
async def update_todo(todo_id: str, todo_update: TodoUpdate):
    """Update a todo item"""
    from bson import ObjectId
    try:
        update_data = {k: v for k, v in todo_update.dict().items() if v is not None}
        if update_data:
            result = todos_collection.update_one(
                {"_id": ObjectId(todo_id)}, 
                {"$set": update_data}
            )
            if result.modified_count:
                updated_todo = todos_collection.find_one({"_id": ObjectId(todo_id)})
                updated_todo["id"] = str(updated_todo["_id"])
                return TodoResponse(**updated_todo)
            else:
                raise HTTPException(status_code=404, detail="Todo not found")
        else:
            raise HTTPException(status_code=400, detail="No fields to update")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid todo ID")

@app.delete("/todos/{todo_id}")
async def delete_todo(todo_id: str):
    """Delete a todo item"""
    from bson import ObjectId
    try:
        result = todos_collection.delete_one({"_id": ObjectId(todo_id)})
        if result.deleted_count:
            return {"message": "Todo deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Todo not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid todo ID")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

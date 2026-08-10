#!/usr/bin/env python3
import sys

with open('server.py', 'r') as f:
    content = f.read()

# Find the position to insert (before the app.include_router line)
insert_pos = content.rfind('app.include_router(api_router)')

draft_code = '''
# Draft Orders
@api_router.post("/drafts", response_model=Order)
async def save_draft(payload: OrderCreate):
    try:
        if not payload.items:
            raise HTTPException(status_code=400, detail="Draft must contain at least one item")
        total = sum(i.price * i.quantity for i in payload.items)
        draft_id = f"DRAFT-{uuid.uuid4().hex[:12]}"
        draft = Order(
            id=draft_id,
            items=payload.items,
            total=round(total, 2),
            table_number=payload.table_number,
            notes=payload.notes,
            payment_status="unpaid",
        )
        await db.drafts.insert_one(draft.dict())
        return draft
    except Exception as e:
        logger.error(f"Error saving draft: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error saving draft: {str(e)}")


@api_router.get("/drafts", response_model=List[Order])
async def list_drafts():
    try:
        drafts = await db.drafts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
        return [Order(**d) for d in drafts]
    except Exception as e:
        logger.error(f"Error listing drafts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing drafts: {str(e)}")


@api_router.post("/drafts/{draft_id}/send")
async def send_draft(draft_id: str):
    try:
        draft = await db.drafts.find_one({"id": draft_id}, {"_id": 0})
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        token_number = await get_next_token_number()
        order_dict = dict(draft)
        order_dict["id"] = make_order_id()
        order_dict["token_number"] = token_number
        order_dict["status"] = "pending"
        
        await db.orders.insert_one(order_dict)
        await db.drafts.delete_one({"id": draft_id})
        return {"ok": True, "order_id": order_dict["id"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending draft: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error sending draft: {str(e)}")


@api_router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str):
    try:
        result = await db.drafts.delete_one({"id": draft_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Draft not found")
        return {"ok": True}
    except Exception as e:
        logger.error(f"Error deleting draft: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting draft: {str(e)}")


'''

new_content = content[:insert_pos] + draft_code + "\n" + content[insert_pos:]

with open('server.py', 'w') as f:
    f.write(new_content)

print("Draft endpoints added successfully!")

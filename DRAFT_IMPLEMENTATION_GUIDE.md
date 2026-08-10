# COMPLETE DRAFT ORDERS IMPLEMENTATION GUIDE

## Step 1: Add Draft Backend Endpoints

Add this code to `app-main/backend/server.py` BEFORE the line `app.include_router(api_router)`:

```python
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
```

## Step 2: Update Frontend index.tsx

In `app-main/frontend/app/master/index.tsx`, make these changes:

### A. Add state (line 48, after `const [placing, setPlacing]`):
```typescript
  const [savingDraft, setSavingDraft] = useState(false);
```

### B. Add function (after `payAndPlace` function, around line 180):
```typescript
  const saveDraft = async () => {
    if (lines.length === 0) return;
    try {
      setSavingDraft(true);
      await api.saveDraft({
        items: lines,
        table_number: tableNumber || undefined,
        notes: notes || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cartStore.clear();
      setTableNumber('');
      setNotes('');
      setCartOpen(false);
      Alert.alert('Success', 'Order saved as draft');
    } catch (e: any) {
      Alert.alert('Failed to save draft', e?.message ?? 'Try again');
    } finally {
      setSavingDraft(false);
    }
  };
```

### C. Add button (in Modal, after payHint text around line 560):
```typescript
            <Pressable
              testID="save-draft-btn"
              onPress={saveDraft}
              disabled={savingDraft || placing || paying}
              style={[
                styles.draftBtn,
                (savingDraft || placing || paying) && { opacity: 0.55 },
              ]}
            >
              {savingDraft ? (
                <ActivityIndicator color={colors.muted} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={14} color={colors.muted} />
                  <Text style={styles.draftBtnText}>Save as Draft</Text>
                </>
              )}
            </Pressable>
```

### D. Add styles (at end of StyleSheet.create, before final `}`):
```typescript
  draftBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.muted,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  draftBtnText: { color: colors.muted, fontWeight: '700', fontSize: type.base },
```

## Step 3: Commit and Deploy

```bash
cd app-main
git add .
git commit -m "Complete draft orders feature: backend endpoints and save button"
git push origin main
```

In Railway:
1. Backend service: Clear build cache → Deploy
2. Frontend service: Clear build cache → Deploy
3. Wait 3-5 minutes

## What Users Can Now Do

1. Master creates order (adds items)
2. Clicks "Save as Draft" button → saved without sending to kitchen
3. Goes to "Drafts" tab → sees saved draft
4. Can "Send" it to kitchen or "Delete" it

Done!

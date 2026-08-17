@api_router.get("/")
async def root():
    return {"message": "ServeSync API"}


@api_router.get("/debug/auth")
async def debug_auth():
    return {
        "ADMIN_PASSWORD_SET": bool(ROLE_PASSWORDS["admin"]),
        "MASTER_PASSWORD_SET": bool(ROLE_PASSWORDS["master"]),
        "CHEF_PASSWORD_SET": bool(ROLE_PASSWORDS["chef"]),
        "ROLE_PASSWORDS": ROLE_PASSWORDS,
    }


@api_router.post("/auth/verify")
async def verify_role(payload: AuthRequest):
    expected = ROLE_PASSWORDS.get(payload.role, "")
    if not expected or payload.password != expected:
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"ok": True, "role": payload.role}

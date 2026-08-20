from pydantic import BaseModel
from typing import Optional

class Test(BaseModel):
    name: str
    price: float
    strikethrough_price: Optional[float] = None

# Simulate what the frontend sends
data = {"name": "test", "price": 10, "strikethrough_price": 12}
obj = Test(**data)
print("With strikethrough_price=12:")
print(obj.dict(exclude_none=False))

# Now without strikethrough_price
data2 = {"name": "test", "price": 10}
obj2 = Test(**data2)
print("\nWithout strikethrough_price:")
print(obj2.dict(exclude_none=False))

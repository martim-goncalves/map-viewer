from pydantic import BaseModel


class UserCred(BaseModel):
    username: str
    password: str

class UserResp(BaseModel):
    id: int
    username: str

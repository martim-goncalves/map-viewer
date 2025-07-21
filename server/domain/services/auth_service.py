import os
from typing import Any
from datetime import timedelta

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext

from ...providers import get_user_dao
from ...data.dao.user_dao import UserDao
from ..entities.user import UserCred, UserResp
from ..entities.token import Token


# _____________________________________________________________________________
# Cryptography & Security

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
crypt = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    return crypt.verify(plain, hashed)

def get_password_hash(password: str) -> str:
    return crypt.hash(password)

def create_jwt_access_token(
    data: dict[str, Any], 
    expires_delta: timedelta | None = None
) -> str:
    raise NotImplementedError

def get_user_by_token(
    token: str = Depends(oauth2_scheme), 
    user_dao: UserDao = Depends(get_user_dao)
) -> UserResp: 
    raise NotImplementedError


# _____________________________________________________________________________
# Endpoints

TAGS = ["auth"]
'''Tags for endpoint grouping in the OpenAPI documentation.'''

auth_srvc = APIRouter(prefix="/users")
'''Router for the authentication service.'''

@auth_srvc.post("/register", status_code=status.HTTP_201_CREATED, tags=TAGS)
async def register(
    user: UserCred, 
    user_dao: UserDao = Depends(get_user_dao)
) -> UserResp:
    raise NotImplementedError

@auth_srvc.post("/login", tags=TAGS)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_dao: UserDao = Depends(get_user_dao)
) -> Token:
    raise NotImplementedError

@auth_srvc.get("/me", tags=TAGS)
async def get_user(
    curr_user: UserResp = Depends(get_user_by_token)
) -> UserResp:
    return UserResp(id = curr_user.id, username = curr_user.username)

@auth_srvc.put("/me", tags=TAGS)
async def update_user(
    user_update: UserResp, 
    curr_user: UserResp = Depends(get_user_by_token), 
    user_dao: UserDao = Depends(get_user_dao)
) -> UserResp:
    raise NotImplementedError

@auth_srvc.delete("/me", status_code=status.HTTP_204_NO_CONTENT, tags=TAGS)
async def delete_user(
    curr_user: UserResp = Depends(get_user_by_token),
    user_dao: UserDao = Depends(get_user_dao)
):
    raise NotImplementedError

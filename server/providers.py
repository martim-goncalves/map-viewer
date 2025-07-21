'''
Providers
---------
Collection of factory or builder functions used as injectables or simple 
providers with crosscutting concerns accross the API's layers.    
'''

from fastapi import Depends
from sqlmodel import SQLModel, Session, create_engine

from .data.dao.user_dao import UserDao


DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    '''Creates database tables if they don't exist.'''
    SQLModel.metadata.create_all(engine)

def get_session(): 
    with Session(engine) as session:
        yield session

def get_user_dao(session: Session = Depends(get_session)) -> UserDao:
    return UserDao(session)

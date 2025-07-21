from sqlmodel import Session, select

from ..schema import User


class UserDao:

    def __init__(self, session: Session):
        self.session = session

    def create(self, username: str, hashed_password: str) -> User:
        '''Creates a new user in the database.'''
        user = User(username = username, hashed_password = hashed_password)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user
    
    def read(self, username: str) -> User | None:
        statement = select(User).where(User.username == username)
        return self.session.exec(statement).first()

    def update(self, user: User, new_hashed_password: str) -> User:
        '''Updates a user's password.'''
        user.hashed_password = new_hashed_password
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def delete(self, user: User):
        '''Deletes a user from the database.'''
        self.session.delete(user)
        self.session.commit()

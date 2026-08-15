import os
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is not set")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except jwt.PyJWTError:
        return None
        
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    return user

def verifyReviewerRole(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    access_denied_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
        
    if user.role not in ["reviewer", "admin"]:
        raise access_denied_exception
        
    return user

def verifyAdminRole(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    access_denied_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: Admin role required",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
        
    if user.role != "admin":
        raise access_denied_exception
        
    return user

def verifyExpertRole(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    access_denied_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: Expert role required",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
        
    if user.role not in ["expert", "admin"]:
        raise access_denied_exception
        
    return user

def verifySubAdminOrAdmin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if user.role not in ["admin", "sub_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Admin or Sub-Admin role required"
        )
    return user

def require_privilege(privilege_key: str):
    def privilege_checker(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        user = get_current_user(token, db)
        if user.role == "admin":
            return user  # Main Admin has unrestricted access
        if user.role != "sub_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Role 'admin' or 'sub_admin' with '{privilege_key}' privilege required."
            )
        priv = db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == user.id).first()
        if not priv or not getattr(priv, privilege_key, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Sub-admin lacks required privilege '{privilege_key}'."
            )
        return user
    return privilege_checker

def require_any_privilege(*privilege_keys: str):
    def privilege_checker(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        user = get_current_user(token, db)
        if user.role == "admin":
            return user
        if user.role != "sub_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Requires one of privileges: {privilege_keys}"
            )
        priv = db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == user.id).first()
        if not priv or not any(getattr(priv, key, False) for key in privilege_keys):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Lacks any of required privileges {privilege_keys}."
            )
        return user
    return privilege_checker

def require_all_privileges(*privilege_keys: str):
    def privilege_checker(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        user = get_current_user(token, db)
        if user.role == "admin":
            return user
        if user.role != "sub_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Requires all privileges: {privilege_keys}"
            )
        priv = db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == user.id).first()
        if not priv or not all(getattr(priv, key, False) for key in privilege_keys):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Lacks all required privileges {privilege_keys}."
            )
        return user
    return privilege_checker

def get_subadmin_allowed_institution_ids(user: models.User, db: Session) -> Optional[list]:
    if user.role == "admin":
        return None  # None indicates unrestricted access across all institutions
    if user.role == "sub_admin":
        accesses = db.query(models.SubAdminInstitutionAccess).filter(models.SubAdminInstitutionAccess.subadmin_id == user.id).all()
        if not accesses:
            return None  # If no explicit institution scoping is set, sub-admin is unrestricted across institutions
        return [a.institution_id for a in accesses]
    return []  # Empty list indicates no access to admin institution data

def verify_institution_access(user: models.User, institution_id: int, db: Session) -> bool:
    if user.role == "admin":
        return True
    allowed_ids = get_subadmin_allowed_institution_ids(user, db)
    if allowed_ids is None:
        return True
    if institution_id in allowed_ids:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: Institution is outside your assigned administrative scope."
    )

def verify_institution_code_access(user: models.User, code_or_name: str, db: Session) -> models.Institution:
    inst = db.query(models.Institution).filter(
        (models.Institution.code == code_or_name) | (models.Institution.name == code_or_name)
    ).first()
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution '{code_or_name}' not found."
        )
    verify_institution_access(user, inst.id, db)
    return inst





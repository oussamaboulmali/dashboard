#!/usr/bin/env python3
import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Import everything dynamically
from encrypted_db_conf import *

def get_encryption_key(password, salt):
    """Generate an encryption key based on the password and salt."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def decrypt_config(encrypted_config, key):
    """Decrypt credentials using the encryption key."""
    f = Fernet(key)
    return {k: f.decrypt(v.encode()).decode() for k, v in encrypted_config.items()}

def load_all_configs():
    """Dynamically decrypt all configurations from encrypted_db_conf.py."""
    encryption_password = os.environ.get('DB_ENCRYPTION_PASSWORD')
    if not encryption_password:
        raise ValueError("Missing DB_ENCRYPTION_PASSWORD environment variable")

    key = get_encryption_key(encryption_password, SALT)

    decrypted_configs = {}
    
    # Loop through all imported variables
    for var_name, var_value in globals().items():
        if var_name.startswith("ENCRYPTED_") and isinstance(var_value, dict):
            decrypted_configs[var_name.replace("ENCRYPTED_", "")] = decrypt_config(var_value, key)

    return decrypted_configs

# **Dynamically create global variables for each configuration**
globals().update(load_all_configs())


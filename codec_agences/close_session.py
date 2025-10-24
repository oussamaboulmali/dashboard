#!/usr/bin/env python3

import pymysql
import logging
from datetime import datetime, timezone
from db_conf import DB_CONFIG

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)


def connect_db():
    """
    Establishes a database connection using the configured credentials.
    Returns:
        Connection object for the MySQL database.
    """
    try:
        return pymysql.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"]
        )
    except pymysql.MySQLError as e:
        logging.error("Database connection failed: %s", e)
        raise


def logout_inactive_users():
    """
    Updates user session records in the database, marking sessions as inactive 
    if they have been active for more than 2 hours.
    """
    query = """
        UPDATE online2024_sessions
        SET is_active = FALSE,
            logout_date = NOW()
        WHERE is_active = TRUE
        AND TIMESTAMPADD(HOUR, 1, login_date) + INTERVAL 2 HOUR < NOW();
    """
    try:
        with connect_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                conn.commit()
                logging.info("Successfully logged out inactive users.")
    except pymysql.MySQLError as e:
        logging.error("Failed to log out inactive users", e)

def unblock_users():
    """
    Unblocks users in the database who were blocked due to 3 failed login attempts 
    and have been blocked for at least 20 minutes.
    """
    query = """
        UPDATE online2024_users
        SET state = 1,
            login_attempts = 0
        WHERE state = 2
        AND block_code = 210
        AND TIMESTAMPADD(MINUTE, 20, TIMESTAMPADD(HOUR, 1, blocked_date)) <= NOW();
    """
    try:
        with connect_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                conn.commit()
                logging.info("Successfully unblocked blocked users.")
    except pymysql.MySQLError as e:
        logging.error("Failed to log out inactive users", e)

        

def main():
    logout_inactive_users()
    unblock_users()
   
if __name__ == "__main__":
    main()

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


def delete_old_articles():
    """
    Deletes articles from the database that have a creation date older than 30 days.
    """
    query = """
        DELETE FROM online2024_articles
        WHERE created_date < NOW() - INTERVAL 30 DAY;
    """
    try:
        with connect_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                conn.commit()
                logging.info("Successfully deleted old articles.")
    except pymysql.MySQLError as e:
        logging.error("Failed to delete old articles", e)

def delete_old_proccessdfiles():
    """
    Deletes proccessdfiles from the database that have a creation date older than 30 days.
    """
    query = """
        DELETE FROM processedfiles
        WHERE created_date < NOW() - INTERVAL 30 DAY;
    """
    try:
        with connect_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                conn.commit()
                logging.info("Successfully deleted old processed files.")
    except pymysql.MySQLError as e:
        logging.error("Failed to delete old processed files", e)        

def delete_old_sessions():
    """
    Deletes older session from the database that have a creation date older than 30 days.
    """
    query = """
        DELETE FROM online2024_sessions
        WHERE logout_date < NOW() - INTERVAL 30 DAY;
    """
    try:
        with connect_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                conn.commit()
                logging.info("Successfully deleted old session.")
    except pymysql.MySQLError as e:
        logging.error("Failed to delete old session", e) 

def main():
    delete_old_articles()
    delete_old_proccessdfiles()
    #delete_old_sessions()
   
if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import os
import re
import psycopg2
import chardet
import logging
import pymysql
from datetime import datetime, timezone
from ftplib import FTP
from db_conf import DB_CONFIG, FTP_CONFIG_MAP_FR
# Configuration de la journalisation
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/home/codec_agences/logs/process_mapfr.log"),
        logging.StreamHandler()
    ]
)

# Configuration FTP et Base de Données
FTP_CONFIG = {
    "host": FTP_CONFIG_MAP_FR["host"],
    "user": FTP_CONFIG_MAP_FR["user"],
    "passwd": FTP_CONFIG_MAP_FR["passwd"],
}

def connect_db():
    return pymysql.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database=DB_CONFIG["database"]
    )

# Récupérer le dernier fichier traité pour une agence
def get_last_processed_time(agency_id):
    try:
        conn = connect_db()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT MAX(created_date) FROM processedfiles WHERE id_agency = %s",
                (agency_id,)
            )
            result = cursor.fetchone()
            return result[0] if result and result[0] else None
    finally:
        conn.close()

# Vérifier si un fichier est déjà traité
def is_file_processed(file_name):
    try:
        conn = connect_db()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM processedfiles WHERE file_name = %s", (file_name,))
            return cursor.fetchone() is not None
    finally:
        conn.close()

# Marquer un fichier comme traité
def mark_file_as_processed(file_name, agency_id, created_date):
    try:
        conn = connect_db()
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO processedfiles (file_name, id_agency, created_date) VALUES (%s, %s, %s)",
                (file_name, agency_id, created_date),
            )
        conn.commit()
    finally:
        conn.close()

def clean_text(text):
    cleaned_text = re.sub(r'[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]', '', text)
    return cleaned_text

def get_label(text):
    match = re.search(r"MAP(\d+)", text)
    if match:
        label = match.group(1)
    else:
        label = "0"
    return label

# Parser un fichier texte
def parse_txt(file_content, file_name):
    try:
        encoding = chardet.detect(file_content)["encoding"]
        content = file_content.decode(encoding)
        lines = content.splitlines()
        label =get_label(lines[1].strip())
        slug = lines[3].strip()
        title = lines[4].strip()
        #full_text = "\n".join(lines[5:]).strip()
        full_text = "\n".join(lines[:]).strip()
         
        return {
            "label":label,
            "title": clean_text(title),
            "slug": clean_text(slug),
            "full_text": clean_text(full_text),
            "file_name": file_name,
        }
    except Exception as e:
        logging.error(f"Error parsing file {file_name}: {e}")
        return None

# Insérer des données dans la base de données
def insert_into_db(data, agency_id, created_date):
    try:
        conn = connect_db()
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO online2024_articles (title, slug, full_text, file_name,label, created_date, id_agency)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                sql,
                (data["title"], data["slug"], data["full_text"], data["file_name"],data["label"], created_date, agency_id),
            )
        conn.commit()
        logging.info(f"Inserted data from {data['file_name']} into the database.")
    finally:
        conn.close()

# Traiter les fichiers MAPL via FTP
def process_mapl_from_ftp(agency_id):
    try:
        ftp = FTP()
        ftp.connect(FTP_CONFIG["host"])
        ftp.login(FTP_CONFIG["user"], FTP_CONFIG["passwd"])
        ftp.cwd("/")
        logging.info("Connected to FTP server.")

        last_processed_time = get_last_processed_time(agency_id)
        files_details = []
        ftp.retrlines("LIST", files_details.append)


        for detail in files_details:
            try:
                parts = detail.split()
                file_name = parts[-1]
                date_str = " ".join(parts[-4:-1])
                modified_time = datetime.strptime(date_str, "%b %d %H:%M")

                # Infer the year
                current_date = datetime.now()
                modified_time = modified_time.replace(year=current_date.year)
                modified_time = modified_time.replace(tzinfo=timezone.utc)
                modified_time = modified_time.replace(tzinfo=None)

                # If the inferred date is in the future, adjust to the previous year
                if modified_time.date() > current_date.date():
                    modified_time = modified_time.replace(year=current_date.year - 1)


                # Skip files that are not .xml or .txt
                if not (file_name.endswith('.xml') or file_name.endswith('.txt') or file_name.endswith('.DAT')):
                    continue
                
                if last_processed_time and modified_time <= last_processed_time:            
                    continue

                if is_file_processed(file_name):
                    continue

                file_content = bytearray()
                ftp.retrbinary(f"RETR {file_name}", file_content.extend)
                data = parse_txt(file_content, file_name)

                if data:
                    insert_into_db(data, agency_id, modified_time)
                    mark_file_as_processed(file_name, agency_id, modified_time)
                else:
                    logging.warning(f"Skipped {file_name}: parsing failed.")
            except Exception as e:
                logging.error(f"Error processing file {file_name}: {e}")

        ftp.quit()
    except Exception as e:
        logging.error(f"Failed to process MAPL files from FTP: {e}")

# Fonction principale
def main():
    logging.info("Starting MAPL processing.")
    process_mapl_from_ftp(agency_id=4)  # MAPL's ID
    logging.info("MAPL processing completed.")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import os
import re
import paramiko
import xmltodict
import chardet
import logging
import pymysql
from datetime import datetime, timezone
from db_conf import DB_CONFIG,FTP_CONFIG_AZERTAC
# Configuration de la journalisation
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/home/codec_agences/logs/process_azertacFr.log"),
        logging.StreamHandler()
    ]
)

# Configuration FTP et Base de Données
SFTP_CONFIG = {
    "host": FTP_CONFIG_AZERTAC["host"],
    "user": FTP_CONFIG_AZERTAC["user"],
    "passwd": FTP_CONFIG_AZERTAC["passwd"],
    "port": int(FTP_CONFIG_AZERTAC["port"]) 
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



def get_label(text):
    match = re.search(r'_(\d+)\.xml$', text)
    if match:
        label = match.group(1)
    else:
        label = "0"
    return label

def parse_xml(file_content, file_name):
    try:
        # Detect the encoding of the file content
        result = chardet.detect(file_content)
        encoding = result["encoding"]
        
        # Decode the file content using the detected encoding
        decoded_content = file_content.decode(encoding)
        
        # Parse the XML content using xmltodict
        data = xmltodict.parse(decoded_content)
        label = get_label(file_name)

        headline = data["news"]["title"]
        full_text = data["news"]["body"]

 
        return {
            "title": headline,
            "label":label,
            "slug": " ",
            "full_text": full_text,
            "file_name": file_name,
        }
    except Exception as e:
        logging.error(f"Unexpected error while parsing {file_name}: {e}")
    
    # Return None on failure
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

# Traiter les fichiers Azertac Fr via FTP
def process_azertacFr_from_sftp(agency_id):
    try:
        # Initialize the SFTP connection
        transport = paramiko.Transport((SFTP_CONFIG["host"], SFTP_CONFIG["port"]))
        transport.connect(username=SFTP_CONFIG["user"], password=SFTP_CONFIG["passwd"])
        sftp = paramiko.SFTPClient.from_transport(transport)
        logging.info("Connected to SFTP server.")

        sftp.chdir("/ftp/azertac/fr") 
      
        last_processed_time = get_last_processed_time(agency_id)
        files = sftp.listdir_attr()  # List files with attributes (size, timestamps, etc.)


        files = sorted(files, key=lambda x: x.st_mtime, reverse=True)

        for file_attr in files:
            try:
                file_name = file_attr.filename
                modified_time = datetime.fromtimestamp(file_attr.st_mtime,tz=timezone.utc)
                modified_time = modified_time.replace(tzinfo=None)

                if last_processed_time and modified_time <= last_processed_time:
                    continue

                if is_file_processed(file_name):
                    continue

                with sftp.open(file_name, "rb") as file_obj:
                    file_content = file_obj.read()
                    data = parse_xml(file_content, file_name)

                    if data:
                        insert_into_db(data, agency_id, modified_time)
                        mark_file_as_processed(file_name, agency_id, modified_time)
                    else:
                        logging.warning(f"Skipped {file_name}: parsing failed.")
            except Exception as e:
                logging.error(f"Error processing file {file_name}: {e}")

        sftp.close()
        transport.close()
    except Exception as e:
        logging.error(f"Failed to process Azertac Fr files from SFTP: {e}")

# Fonction principale
def main():
    logging.info("Starting Azertac Fr processing.")
    process_azertacFr_from_sftp(agency_id=25)  # Azertac Fr's ID
    logging.info("Azertac Fr processing completed.")

if __name__ == "__main__":
    main()

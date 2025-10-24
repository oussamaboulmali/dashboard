#!/usr/bin/env python3
import json
import os
import re
import xmltodict

import pymysql
import chardet
import logging
from datetime import datetime, timezone
from db_conf import DB_CONFIG
# Configuration
LOCAL_DIR = "/home/depot"


AGENCIES = {
    "Ansa_Ar": 22,
    "Ansa_It": 23,  
    "Ansa_Fr": 24,
}

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("/home/codec_agences/logs/process_ansa.log"),logging.StreamHandler()]
)


def connect_db():
    return pymysql.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database=DB_CONFIG["database"]
    )


def extract_label(file_name):
    match = re.search(r'_A\d{3}(\d+)\.xml$', file_name)
    if match:
        return match.group(1)  # Extract the second group (label)
    return None  # Return None if no match is found

# Get the last processed timestamp for an agency
def get_last_processed_time(agency_id):
    query = "SELECT MAX(created_date) FROM processedfiles WHERE id_agency = %s"
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, (agency_id,))
            result = cursor.fetchone()
            return result[0] if result and result[0] else None
    finally:
        conn.close()

# Check if file is already processed
def is_file_processed(file_name):
    query = "SELECT 1 FROM processedfiles WHERE file_name = %s"
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, (file_name,))
            return cursor.fetchone() is not None
    finally:
        conn.close()

# Mark file as processed
def mark_file_as_processed(file_name, agency_id, created_date):
    query = """
        INSERT INTO processedfiles (file_name, id_agency, created_date)
        VALUES (%s, %s, %s)
    """
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, (file_name, agency_id, created_date))
        conn.commit()
    finally:
        conn.close()

# Parse XML files
def parse_xml(file_path, agency_folder):
    try:        
        with open(file_path, "rb") as file:
            raw_data = file.read()
            result = chardet.detect(raw_data)
            encoding = result["encoding"]
        
        with open(file_path, "r", encoding=encoding) as file:
            data = xmltodict.parse(file.read())
            
            headline = data["nitf"]["head"]["title"]
            file_name = os.path.basename(file_path) 
            label = extract_label(file_name)
            
            # Handle inlineXML specifically
            full_text = data["nitf"]["body"]["body.content"]["block"]["p"]
            #full_text = inlineXML.get("#text", "")  # Extract HTML content
            


            return {
                "title": headline,
                "label": label,
                "slug": " " ,
                "full_text": full_text,
                "file_name": os.path.basename(file_path),
            }
    except Exception as e:
        logging.error(f"Unexpected error while parsing {file_path}: {e}")
    
    # Return None on failure
    return None


# Insert data into the database
def insert_into_db(data, agency_id, created_date):
    query = """
        INSERT INTO online2024_articles (title, slug, full_text, file_name,label, created_date, id_agency)
        VALUES (%s, %s, %s,%s, %s, %s, %s)
    """
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, (data["title"], data["slug"], data["full_text"],
                                   data["file_name"],data["label"], created_date, agency_id))
        conn.commit()
    finally:
        conn.close()

def main():
    has_folders_to_process = False  

    for agency_folder, agency_id in AGENCIES.items():
        folder_path = os.path.join(LOCAL_DIR, agency_folder)

        # Vérifier si le dossier existe
        if not os.path.exists(folder_path):
            logging.warning(
                f"Folder {folder_path} does not exist. It might not be mounted. Please verify."
            )
            continue

        has_folders_to_process = True  
        logging.info(f"Processing folder: {folder_path}")

        # Trier les fichiers par date de modification décroissante
        files = sorted(
            os.listdir(folder_path),
            key=lambda f: os.path.getmtime(os.path.join(folder_path, f)),
            reverse=True
        )

        # Récupérer le dernier fichier traité
        last_processed_time = get_last_processed_time(agency_id)

        for file_name in files:
            file_path = os.path.join(folder_path, file_name)

            # Skip files that are not .xml or .txt
            if not (file_name.endswith('.xml') or file_name.endswith('.txt')):
                continue

            created_date = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)
            created_date = created_date.replace(tzinfo=None)

            # Ignorer les fichiers modifiés avant le dernier traitement
            if last_processed_time and created_date <= last_processed_time:
                continue

            # Vérifier si le fichier est déjà traité
            if is_file_processed(file_name):
                continue
            
            # Parser le fichier en fonction de son type
            try:
                data = parse_xml(file_path, agency_folder)
                if data is None:  # Vérifier si le parsing a échoué
                    logging.warning(f"Skipping file {file_name} due to parsing error.")
                    continue
            except Exception as e:
                logging.error(f"Error while parsing file {file_name}: {e}")
                continue

            # Insérer les données dans la base et marquer comme traité
            try:
                insert_into_db(data, agency_id, created_date)
                mark_file_as_processed(file_name, agency_id, created_date)
                logging.info(f"Successfully processed file: {file_name}")
            except Exception as e:
                logging.error(f"Error while processing file {file_name}: {e}")
                raise

    # Vérifier si aucun dossier n'a été trouvé
    if not has_folders_to_process:
        logging.error(
            "No folders to process. It seems the directories are not mounted. Please verify the configuration."
        )


       

if __name__ == "__main__":
    main()

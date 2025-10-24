#!/usr/bin/env python3
import os
import re
import pymysql
import chardet
import logging
from datetime import datetime, timezone
from db_conf import DB_CONFIG
# Configuration
LOCAL_DIR = "/home/depot"


AGENCIES = {
    "mena": 9,  
}

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("/home/codec_agences/logs/process_mena.log"),logging.StreamHandler()]
)

# Database connection
# def connect_db():
#     return psycopg2.connect(
#         host=DB_CONFIG["host"],
#         user=DB_CONFIG["user"],
#         password=DB_CONFIG["password"],
#         dbname=DB_CONFIG["dbname"]
#     )

def connect_db():
    return pymysql.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database=DB_CONFIG["database"]
    )


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

def clean_text(text):
    cleaned_text = re.sub(r'[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]', '', text)
    return cleaned_text

def get_label(text,agency_folder):

    match = re.search(r'^\d+', text)

    if match:
        label = match.group(0)
    else:
        label = None
    return label

# Parse TXT files
def parse_txt(file_path,agency_folder):
    with open(file_path, "rb") as file:
        encoding = chardet.detect(file.read())["encoding"]

    with open(file_path, "r", encoding=encoding) as file:
        lines = file.readlines()
    
    label = get_label(lines[2].strip(),agency_folder)
    slug =  lines[3].strip()
    title_lines = []

     
    for line in lines[4:]:
        if not line.strip():
             break
        title_lines.append(line.strip())

    title = " ".join(title_lines)
    full_text_start = lines.index(line) + 1
    #full_text = "".join(lines[full_text_start:]).strip()

    full_text = "".join(lines[:]).strip()
    

    return {
        "label":label,
        "title": clean_text(title),
        "slug": clean_text(slug),
        "full_text": clean_text(full_text),
        "file_name": os.path.basename(file_path),
    }

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
                data = parse_txt(file_path,agency_folder)
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

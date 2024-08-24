import psycopg2
import os
from win32com.client import Dispatch

# Configurações do banco de dados
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# Função para conectar ao banco de dados
def connectDb():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        print("Conectado ao banco de dados.")
        return conn
    except psycopg2.Error as e:
        print(f"Erro ao conectar ao banco de dados: {e}")

# Função para inserir dados no banco de dados
def insertData(file, printerList):
    # Conecta ao banco de dados
    conn = connectDb()

    # Cria um cursor para executar as consultas
    cursor = conn.cursor()
    
    # Loop para inserir cada linha do arquivo no banco de dados
    for _, row in file.iterrows():
        try:
            cursor.execute("""
                INSERT INTO printJobs (timedoc, username, pages, copies, printer, documentName, clientPC, paperSize, languageMethod, height, width, duplex, grayscale, fileSize)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                row[0],  # timedoc
                row[1],  # username
                row[2],  # pages
                row[3],  # copies
                row[4],  # printer
                row[5],  # documentName
                row[6],  # clientPC
                row[7],  # paperSize
                row[8],  # languageMethod
                row[9],  # height
                row[10], # width
                row[11], # duplex
                row[12], # grayscale
                row[13]  # fileSize
            ))

            print(f"Inserindo dados: {row}")
        except psycopg2.Error as e:
            print(f"Erro ao inserir dados: {e}")
            conn.rollback()

    conn.commit()
    cursor.close()
    conn.close()

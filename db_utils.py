import psycopg2
import os

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
        return None

# Função para inserir dados no banco de dados
def insertData(file, printerList):
    # Conecta ao banco de dados
    conn = connectDb()

    try:
        # Cria um cursor para executar as consultas
        cursor = conn.cursor()
        
        # Loop para inserir cada linha do arquivo no banco de dados
        for _, row in file.iterrows():
            try:
                cdcid = None
                localPrinter = 999
                printerDriver = None
                printerIP = None
                printerNameFilePosition = row.iloc[4] #A coluna 4 do arquivo CSV contém o nome da impressora
                print(f"printerName: {printerNameFilePosition}")

                # Encontra o localPrinter correspondente ao printerName
                for printer in printerList:
                    if printer['printerName'] == printerNameFilePosition:
                        localPrinter = str(printer['printerLocation'])
                        printerIP = str(printer['printerIP'])
                        printerDriver = str(printer['printerDriver'])
                        print(f"localPrinter: {localPrinter}")
                        break
                
                if localPrinter:
                    cursor.execute("""
                        SELECT id FROM centercostprinters WHERE id = %s;
                    """, (localPrinter,))

                    result = cursor.fetchone()
                    cdcid = result[0] if result else None
                    print(f"localPrinter {localPrinter} encontrado. cdcid: {cdcid}")

                # Insere os dados no banco de dados
                cursor.execute("""
                    INSERT INTO printJobs (cdcid, timedoc, username, pages, copies, printer, printerDriver, printerIP, documentName, clientPC, paperSize, languageMethod, height, width, duplex, grayscale, fileSize)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    cdcid, # cdcid
                    row.iloc[0],  # timedoc
                    row.iloc[1],  # username
                    row.iloc[2],  # pages
                    row.iloc[3],  # copies
                    row.iloc[4],  # printer
                    printerDriver,
                    printerIP,
                    row.iloc[5],  # documentName
                    row.iloc[6],  # clientPC
                    row.iloc[7],  # paperSize
                    row.iloc[8],  # languageMethod
                    row.iloc[9],  # height
                    row.iloc[10], # width
                    row.iloc[11], # duplex
                    row.iloc[12], # grayscale
                    row.iloc[13], # fileSize
                ))

                print(f"Inserindo dados: {row}")
            except psycopg2.Error as e:
                print(f"Erro ao inserir dados: {e}")
                conn.rollback()
        conn.commit()
    except Exception as e:
        print(f"Ocorreu um erro durante a inserção dos dados: {e}")
    finally:
        cursor.close()
        conn.close()

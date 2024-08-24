from db_utils import insertData
from functions_printers import deleteOldFiles, stopService, startService, copyFile, deleteFile, renameFile, getPrinterInfo
import pandas as pd
import os
import time

# Substitua pelos caminhos e nomes reais
SERVICENAME = 'PCPrintLogger'
CSVFILEPATH = r'C:\Program Files (x86)\PaperCut Print Logger\logs\csv\papercut-print-log-all-time.csv'
REMOTEFOLDER = r'\\192.168.0.175\Sistemas\PaperCut-logs'

def main():
    printersList = getPrinterInfo()

    if not printersList:
        print("Nenhuma impressora encontrada.")
        return

    stopService(SERVICENAME)
    time.sleep(5)
    
    copyFile(CSVFILEPATH, REMOTEFOLDER)
    deleteFile(CSVFILEPATH)
    startService(SERVICENAME)

    for i in range(10):
        print(f'Aguardando {i} segundos...')
        time.sleep(i)
    
    #Encontrar todos os arquivos no diretório, excluindo os arquivos ocultos e filtrando apenas os arquivos CSV
    #https://stackoverflow.com/questions/3207219/how-do-i-list-all-files-of-a-directory
    files = [os.path.join(REMOTEFOLDER, f) for f in os.listdir(REMOTEFOLDER) if os.path.isfile(os.path.join(REMOTEFOLDER, f))] 
    if not files:
        print("Nenhum arquivo encontrado no diretório.")
        return
    
    #Encontrar o arquivo mais recentemente modificado
    mostRecentFile = max(files, key=os.path.getmtime) #Retorna o caminho do arquivo mais recente
    csvFileName = os.path.basename(mostRecentFile) #Retorna o nome do arquivo, usado somente para renomear na função renameFile abaixo.
    
    #Renomear o arquivo com DATA + HORA = NOME.csv
    #Retorna o caminho do arquivo renomeado mais recente da pasta \\192.168.0.175\Sistemas\PaperCut-logs\
    newRecentFilePath = renameFile(mostRecentFile, csvFileName ,REMOTEFOLDER)

    #Apagar arquivos mais antigos do que 30 dias
    deleteOldFiles(REMOTEFOLDER)

    while True:
        if os.path.exists(REMOTEFOLDER):
            try:
                f = pd.read_csv(newRecentFilePath, skiprows=2, encoding='ISO-8859-1')
            except UnicodeDecodeError as e:
                print(f"Erro ao ler o arquivo CSV: {e}")
                    
            # Inserção dos dados no banco de dados
            if not f.empty:
                insertData(f, printersList)
                break

        for i in range(10):
            print(f'Aguardando dados no arquivo CSV: {i} segundos...')
            time.sleep(i)

if __name__ == '__main__':
    main()



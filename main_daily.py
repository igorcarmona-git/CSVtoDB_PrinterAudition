from db_utils import insertData
from functions_printers import getPrinterInfo
import pandas as pd
import os
import time

# Substitua pelos caminhos e nomes reais
SERVICENAME = 'PCPrintLogger'
#CSVFILEPATH = r'C:\Program Files (x86)\PaperCut Print Logger\logs\csv\papercut-print-log-all-time.csv'
CSVDAILY = r'C:\Program Files (x86)\PaperCut Print Logger\logs\csv\daily\papercut-print-log-2025-01-08.csv'
#REMOTEFOLDER = r'\\192.168.0.175\Sistemas\PaperCut-logs'

def main():    
    printersList = getPrinterInfo()
    if not printersList:
        print("Nenhuma impressora encontrada.")
        return

    while True:
        if os.path.exists(CSVDAILY):
            try:
                f = pd.read_csv(CSVDAILY, skiprows=2, encoding='ISO-8859-1')
                #f = pd.read_csv(CSVDAILY, skiprows=2, encoding='ISO-8859-1') #inserir mes todo
            except UnicodeDecodeError as e:
                print(f"Erro ao ler o arquivo CSV: {e}")
                    
            # Inserção dos dados no banco de dados
            if not f.empty:
                insertData(f, printersList)
                break

        for i in range(10):
            print(f'Aguardando dados no arquivo CSV, {i} segundos...')
            time.sleep(i)

if __name__ == '__main__':
    main()



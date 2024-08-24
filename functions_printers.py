import shutil
import win32serviceutil
import os
import datetime
import win32service
from win32com.client import Dispatch

def stopService(serviceName):
    current_status = win32serviceutil.QueryServiceStatus(serviceName)[1]
        
    if current_status == win32service.SERVICE_RUNNING:
        try:
            # Para o serviço
            win32serviceutil.StopService(serviceName)
            print(f'Serviço {serviceName} parado com sucesso.')
        except Exception as error:
            print(f'Erro ao parar o serviço {serviceName}: {error}')
            exit(0)
            
def getPrinterInfo():
    printersList = []

    # Conectando ao WMI no servidor local
    wmi = Dispatch("WbemScripting.SWbemLocator")
    service = wmi.ConnectServer(".", "root\\cimv2")

    # Executando a consulta WMI para pegar as informações das impressoras
    printers = service.ExecQuery("SELECT * FROM Win32_Printer")

    for printer in printers:
        printer_info = {
            "PrinterName": printer.Name,
            "PrinterLocation": printer.Location,
            "PrinterIP": printer.PortName
        }
        printersList.append(printer_info)

    if not printersList:
        print("Nenhuma impressora encontrada.")
        return
    
    return printersList

def startService(serviceName):
    try:
        # Inicia o serviço
        win32serviceutil.StartService(serviceName)
        print(f'Serviço {serviceName} iniciado com sucesso.')
    except Exception as error:
        print(f'Erro ao iniciar o serviço {serviceName}: {error}')

# Função para copiar o arquivo CSV
def copyFile(sourceFile, remoteFolder):
    if not os.path.exists(sourceFile):
        print(f"Arquivo {sourceFile} não encontrado")
        exit(0)
    
    print(f"Copiando {sourceFile} para {remoteFolder}")
    shutil.copy(sourceFile, remoteFolder) #Copia o arquivo para o diretório remoto \\192.168.0.175\Sistemas\PaperCut-logs\

# Função para apagar o arquivo CSV
def deleteFile(filename):
    os.remove(filename)
    print(f"Arquivo {filename} apagado")

def renameFile(mostRecentFile, csvFileName ,remoteFolder):
    now = datetime.datetime.now().strftime('%Y%m%d_%H%M%S') #YYYYMMDD_HHMMSS
    newName = f"{now}_{csvFileName}" #YYYYMMDD_HHMMSS_NOMEARQUIVO
    newPath = os.path.join(remoteFolder, newName) #\\192.168.0.175\Sistemas\PaperCut-logs\YYYYMMDD_HHMMSS_NOMEARQUIVO
    os.rename(mostRecentFile, newPath) #Renomeia o arquivo, mas mantém o mesmo caminho
    print(f"Arquivo renomeado para: {newName}")
    return newPath

# Função para apagar arquivos mais antigos do que 30 dias
def deleteOldFiles(remoteFolder, daysInterval=30):
    nowTime = datetime.datetime.now() #Data e Hora Atual
    limit = nowTime - datetime.timedelta(days=daysInterval) #Data e Hora Atual - 30 dias, para apagar os arquivos antigos.

    for file in os.listdir(remoteFolder): #Para cada arquivo no diretório \\192.168.0.175\Sistemas\PaperCut-logs\
        filePath = os.path.join(remoteFolder, file) #\\192.168.0.175\Sistemas\PaperCut-logs\YYYYMMDD_HHMMSS_NOMEARQUIVO
        if os.path.isfile(filePath): #Se o caminho for um arquivo
            dateModified = datetime.datetime.fromtimestamp(os.path.getmtime(filePath)) #Data e Hora do arquivo modificado por extenso YYYYMMDD_HHMMSS
            if dateModified < limit: #Se o arquivo tiver sido modificado antes de 30 dias
                os.remove(filePath)
                print(f"Arquivo {file} apagado com sucesso.")


import { useEffect, useState } from "react";
import { FileUp, FolderInput, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type ImportBatch } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/utils";

function statusVariant(status: ImportBatch["status"]) {
  if (status === "COMPLETED") return "secondary";
  if (status === "FAILED") return "destructive";
  return "outline";
}

export function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const response = await api.imports();
    setImports(response.items);
  }

  useEffect(() => {
    refresh().catch((error) =>
      toast.error(error instanceof Error ? error.message : "Falha ao carregar importações."),
    );
  }, []);

  async function handleUpload() {
    if (!file) {
      toast.error("Selecione um arquivo CSV.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.uploadCsv(file);
      toast.success(`Importadas ${formatNumber(result.batch.insertedRows)} linhas.`);
      result.warnings.forEach((warning) => toast.warning(warning));
      result.rowErrors.slice(0, 3).forEach((rowError) => toast.warning(rowError));
      setFile(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar CSV.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFolderImport() {
    setLoading(true);
    try {
      const result = await api.importLatestFolder();
      toast.success(`Importadas ${formatNumber(result.batch.insertedRows)} linhas.`);
      result.warnings.forEach((warning) => toast.warning(warning));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar da pasta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Importações</h1>
        <p className="text-sm text-muted-foreground">
          Processamento de CSVs do PaperCut e histórico de lotes.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Upload CSV
            </CardTitle>
            <CardDescription>Arquivo exportado pelo PaperCut Print Logger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button onClick={handleUpload} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar arquivo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderInput className="h-4 w-4" />
              Pasta configurada
            </CardTitle>
            <CardDescription>Usa o CSV mais recente de PAPERCUT_IMPORT_FOLDER.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleFolderImport} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar CSV mais recente
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Início</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Importadas</TableHead>
                <TableHead>Duplicadas</TableHead>
                <TableHead>Falhas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(item.startedAt)}
                  </TableCell>
                  <TableCell>{item.source}</TableCell>
                  <TableCell className="max-w-[260px] truncate">
                    {item.fileName ?? item.filePath ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>{formatNumber(item.insertedRows)}</TableCell>
                  <TableCell>{formatNumber(item.duplicateRows)}</TableCell>
                  <TableCell>{formatNumber(item.failedRows)}</TableCell>
                </TableRow>
              ))}
              {!imports.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhuma importação registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

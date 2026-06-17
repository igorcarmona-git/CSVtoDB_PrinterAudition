import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type Printer } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

export function PrintersPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const response = await api.printers();
    setPrinters(response.items);
  }

  useEffect(() => {
    refresh().catch((error) =>
      toast.error(error instanceof Error ? error.message : "Falha ao carregar impressoras."),
    );
  }, []);

  async function handleSync() {
    setLoading(true);
    try {
      const result = await api.syncPrinters();
      toast.success(`${result.total} impressoras sincronizadas.`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao sincronizar WMI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Impressoras</h1>
          <p className="text-sm text-muted-foreground">
            Inventário retornado pelo WMI do servidor de impressão.
          </p>
        </div>
        <Button onClick={handleSync} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sincronizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de impressoras</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>CDC</TableHead>
                <TableHead>IP/Porta</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Último sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.map((printer) => (
                <TableRow key={printer.id}>
                  <TableCell className="font-medium">{printer.name}</TableCell>
                  <TableCell>{printer.location ?? "-"}</TableCell>
                  <TableCell>
                    {printer.costCenter ? (
                      <Badge variant="secondary">{printer.costCenter.name}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{printer.ip ?? "-"}</TableCell>
                  <TableCell>{printer.driver ?? "-"}</TableCell>
                  <TableCell>{formatDateTime(printer.lastSyncedAt)}</TableCell>
                </TableRow>
              ))}
              {!printers.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhuma impressora sincronizada.
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

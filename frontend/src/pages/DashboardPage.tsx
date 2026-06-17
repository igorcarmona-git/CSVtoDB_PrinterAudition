import { useEffect, useState } from "react";
import { BarChart3, Filter, Printer, Search, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  api,
  type CostCenter,
  type Pagination,
  type PrintJob,
  type PrintJobFilters,
  type RankingItem,
  type Summary,
} from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/utils";

const emptySummary: Summary = {
  totalJobs: 0,
  totalPages: 0,
  totalUsers: 0,
  totalPrinters: 0,
  totalCostCenters: 0,
};

function ChartPanel({
  title,
  data,
}: {
  title: string;
  data: RankingItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 4, right: 8, top: 4, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="totalPages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 15,
    total: 0,
    totalPages: 0,
  });
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [byCostCenter, setByCostCenter] = useState<RankingItem[]>([]);
  const [byUser, setByUser] = useState<RankingItem[]>([]);
  const [byPrinter, setByPrinter] = useState<RankingItem[]>([]);
  const [filters, setFilters] = useState<PrintJobFilters>({
    page: 1,
    pageSize: 15,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .costCenters()
      .then((response) => setCostCenters(response.items))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Falha ao carregar CDCs."),
      );
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.summary(filters),
      api.byCostCenter(filters),
      api.byUser(filters),
      api.byPrinter(filters),
      api.printJobs(filters),
    ])
      .then(([summaryResult, costCenterResult, userResult, printerResult, jobsResult]) => {
        setSummary(summaryResult);
        setByCostCenter(costCenterResult.items);
        setByUser(userResult.items);
        setByPrinter(printerResult.items);
        setJobs(jobsResult.items);
        setPagination(jobsResult.pagination);
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Falha ao carregar dashboard."),
      )
      .finally(() => setLoading(false));
  }, [filters]);

  function updateFilter<K extends keyof PrintJobFilters>(
    key: K,
    value: PrintJobFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }

  function setPage(page: number) {
    setFilters((current) => ({ ...current, page }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Indicadores de impressão por período, centro de custo e usuário.
          </p>
        </div>
        <Badge variant={loading ? "secondary" : "outline"}>
          {loading ? "Atualizando" : `${formatNumber(pagination.total)} registros`}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Início</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">Fim</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              value={filters.username ?? ""}
              onChange={(event) => updateFilter("username", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="printerName">Impressora</Label>
            <Input
              id="printerName"
              value={filters.printerName ?? ""}
              onChange={(event) => updateFilter("printerName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Centro de custo</Label>
            <Select
              value={filters.costCenterId ?? "all"}
              onValueChange={(value) =>
                updateFilter("costCenterId", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {costCenters.map((costCenter) => (
                  <SelectItem key={costCenter.id} value={costCenter.id}>
                    {costCenter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientPC">Host</Label>
            <Input
              id="clientPC"
              value={filters.clientPC ?? ""}
              onChange={(event) => updateFilter("clientPC", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              Trabalhos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatNumber(summary.totalJobs)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Páginas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatNumber(summary.totalPages)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatNumber(summary.totalUsers)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Printer className="h-4 w-4" />
              Impressoras
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatNumber(summary.totalPrinters)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">CDCs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatNumber(summary.totalCostCenters)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title="Por centro de custo" data={byCostCenter} />
        <ChartPanel title="Por usuário" data={byUser} />
        <ChartPanel title="Por impressora" data={byPrinter} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trabalhos de impressão</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Impressora</TableHead>
                <TableHead>CDC</TableHead>
                <TableHead>Páginas</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Host</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(job.timedoc)}
                  </TableCell>
                  <TableCell>{job.username}</TableCell>
                  <TableCell>{job.printerName}</TableCell>
                  <TableCell>{job.costCenter?.name ?? "-"}</TableCell>
                  <TableCell>{formatNumber(job.totalPages)}</TableCell>
                  <TableCell className="max-w-[260px] truncate">
                    {job.documentName ?? "-"}
                  </TableCell>
                  <TableCell>{job.clientPC ?? "-"}</TableCell>
                </TableRow>
              ))}
              {!jobs.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Página {pagination.page} de {Math.max(pagination.totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => setPage(pagination.page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(pagination.page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

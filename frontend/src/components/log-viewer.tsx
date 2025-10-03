import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { 
  Info, 
  AlertTriangle, 
  XCircle, 
  CheckCircle,
  Search,
  Filter,
  Download,
  Pause,
  Play
} from 'lucide-react';
import type { JobLog } from '../services/job-service';

interface LogViewerProps {
  logs: JobLog[];
}

export function LogViewer({ logs }: LogViewerProps) {
  const [filteredLogs, setFilteredLogs] = useState<JobLog[]>(logs);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    let filtered = logs;

    // Filter by level
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, searchTerm]);

  useEffect(() => {
    if (autoScroll) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const scrollViewport = document.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollViewport) {
          scrollViewport.scrollTop = scrollViewport.scrollHeight;
        }
      }, 100);
    }
  }, [filteredLogs, autoScroll]);

  const getLogIcon = (level: JobLog['level']) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogColor = (level: JobLog['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const getBadgeVariant = (level: JobLog['level']) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'success':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      message: log.message,
      meta: log.meta
    }));

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crawl-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Logs</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              Auto-scroll
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Log Stats */}
        <div className="flex gap-2 text-sm">
          <Badge variant="outline">
            Total: {logs.length}
          </Badge>
          {Object.entries(levelCounts).map(([level, count]) => (
            <Badge key={level} variant={getBadgeVariant(level as JobLog['level'])}>
              {level}: {count}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Log Entries */}
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {logs.length === 0 ? 'No logs yet' : 'No logs match your filters'}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 border rounded-lg ${getLogColor(log.level)}`}
                >
                  <div className="flex items-start gap-2">
                    {getLogIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getBadgeVariant(log.level)} className="text-xs">
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{log.message}</p>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer hover:underline">
                            Show details
                          </summary>
                          <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
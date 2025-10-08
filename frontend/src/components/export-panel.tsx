import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Download, 
  FileText, 
  Database, 
  Table, 
  Archive,
  CheckCircle,
  Clock,
  File,
  Loader2
} from 'lucide-react';
import type { CrawlJob } from '../services/job-service';

interface ExportPanelProps {
  job: CrawlJob;
  onExport: (jobId: string, formats: string[]) => Promise<void>;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fileExtension: string;
  estimatedSize: string;
}

export function ExportPanel({ job, onExport }: ExportPanelProps) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['markdown-book']);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportFormats: ExportFormat[] = [
    {
      id: 'markdown-book',
      name: 'Merged Markdown Book',
      description: 'Single combined .md file with table of contents',
      icon: <File className="h-4 w-4" />,
      fileExtension: '.md',
      estimatedSize: `~${Math.round(job.counts.crawled * 2.5)}KB`
    },
    {
      id: 'json',
      name: 'JSONL Format',
      description: 'One JSON object per line with full metadata',
      icon: <Database className="h-4 w-4" />,
      fileExtension: '.jsonl',
      estimatedSize: `~${Math.round(job.counts.crawled * 5)}KB`
    },
    {
      id: 'csv',
      name: 'CSV Spreadsheet',
      description: 'Tabular data with selected columns for analysis',
      icon: <Table className="h-4 w-4" />,
      fileExtension: '.csv',
      estimatedSize: `~${Math.round(job.counts.crawled * 1.5)}KB`
    }
  ];

  const handleFormatToggle = (formatId: string, checked: boolean) => {
    if (checked) {
      setSelectedFormats(prev => [...new Set([...prev, formatId])]);
    } else {
      setSelectedFormats(prev => prev.filter(id => id !== formatId));
    }
  };

  const handleExport = async () => {
    if (selectedFormats.length === 0) {
      alert('Please select at least one export format');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      await onExport(job.id, selectedFormats);
      setExportProgress(100);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const canExport = job.status === 'completed' || job.counts.crawled > 0;
  const hasContent = job.counts.crawled > 0;

  return (
    <div className="space-y-6">
      {/* Export Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <p className="text-sm">
                Ready to export data from {job.counts.crawled} crawled pages
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Job Status: {job.status}</span>
                <span>Last Updated: {job.updatedAt ? job.updatedAt.toLocaleString() : 'Never'}</span>
              </div>
            </div>
            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
              {hasContent ? `${job.counts.crawled} Pages` : 'No Data'}
            </Badge>
          </div>

          {!canExport && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Export will be available once crawling begins and pages are collected.
              </AlertDescription>
            </Alert>
          )}

          {isExporting && (
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Generating export...</span>
                <span>{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Formats */}
      <Card>
        <CardHeader>
          <CardTitle>Export Formats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {exportFormats.map((format) => (
              <div
                key={format.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {format.icon}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{format.name}</div>
                      <Badge variant="outline" className="text-xs">{format.fileExtension}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{format.description}</p>
                    <p className="text-xs text-muted-foreground">Estimated size: {format.estimatedSize}</p>
                  </div>
                </div>
                <div className="shrink-0">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!canExport || isExporting) return;
                      setSelectedFormats([format.id]);
                      await handleExport();
                    }}
                    disabled={!canExport || isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

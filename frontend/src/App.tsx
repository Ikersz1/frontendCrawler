import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Globe } from 'lucide-react';
import { CrawlJobForm } from './components/crawl-job-form';
import { JobsList } from './components/jobs-list';
import { JobProgress } from './components/job-progress';
import { LogViewer } from './components/log-viewer';
import { ExportPanel } from './components/export-panel';
import { JobService, type CrawlJob, type CrawlConfig, type JobLog } from './services/job-service';

// ✅ Import correcto de sonner
import { toast } from 'sonner';

export default function App() {
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [activeTab, setActiveTab] = useState('configure');

  const selectedJob = jobs.find(job => job.id === selectedJobId);

  useEffect(() => {
    // Carga inicial
    setJobs(JobService.getJobs());

    // Polling simple
    const interval = setInterval(() => {
      setJobs(JobService.getJobs());
      if (selectedJobId) setLogs(JobService.getJobLogs(selectedJobId));
    }, 1200);

    return () => clearInterval(interval);
  }, [selectedJobId]);

  const handleCreateJob = async (config: CrawlConfig) => {
    try {
      await JobService.createJob(config);

      // ✅ Refrescar desde el servicio para evitar duplicados
      const list = JobService.getJobs();
      setJobs(list);

      // Seleccionamos el más reciente (primero)
      if (list.length > 0) {
        setSelectedJobId(list[0].id);
        setActiveTab('jobs');
      }

      toast.success('Crawl job created successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to create crawl job${error?.message ? `: ${error.message}` : ''}`);
    }
  };

  const handleJobAction = async (jobId: string, action: 'start' | 'pause' | 'resume' | 'cancel') => {
    try {
      await JobService.performJobAction(jobId, action);
      setJobs(JobService.getJobs());
      toast.success(`Job ${action}ed successfully`);
    } catch (error) {
      toast.error(`Failed to ${action} job`);
    }
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    setLogs(JobService.getJobLogs(jobId));
    setActiveTab('progress');
  };

  const handleExportJob = async (jobId: string, formats: string[]) => {
    try {
      const results = await JobService.exportJob(jobId, formats);

      const extByFormat: Record<string, string> = {
        json: 'json',
        csv: 'csv',
        'markdown-book': 'md',
      };

      results.forEach(({ format, url }) => {
        const ext = extByFormat[format] || 'txt';
        const a = document.createElement('a');
        a.href = url;
        a.download = `crawl-job-${jobId}-export.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });

      toast.success('Export generated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate export');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Web Crawler</h1>
              <p className="text-muted-foreground">
                Extract clean content from websites and export as Markdown, JSON, or CSV
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel */}
            <div className="lg:col-span-1 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="configure">Configure</TabsTrigger>
                  <TabsTrigger value="jobs">Jobs</TabsTrigger>
                </TabsList>

                <TabsContent value="configure" className="space-y-4">
                  <CrawlJobForm onSubmit={handleCreateJob} />
                </TabsContent>

                <TabsContent value="jobs" className="space-y-4">
                  <JobsList
                    jobs={jobs}
                    selectedJobId={selectedJobId}
                    onJobSelect={handleJobSelect}
                    onJobAction={handleJobAction}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-2 space-y-6">
              {selectedJob ? (
                <Tabs defaultValue="progress" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="progress">Progress</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                    <TabsTrigger value="export">Export</TabsTrigger>
                  </TabsList>

                  <TabsContent value="progress" className="space-y-4">
                    <JobProgress job={selectedJob} onJobAction={handleJobAction} />
                  </TabsContent>

                  <TabsContent value="logs" className="space-y-4">
                    <LogViewer logs={logs} />
                  </TabsContent>

                  <TabsContent value="export" className="space-y-4">
                    <ExportPanel job={selectedJob} onExport={handleExportJob} />
                  </TabsContent>
                </Tabs>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center space-y-2">
                      <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-lg">No job selected</p>
                      <p className="text-sm text-muted-foreground">
                        Create a new crawl job or select an existing one to view progress
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

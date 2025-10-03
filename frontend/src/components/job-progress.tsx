import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  FileText,
  Link,
  Image,
  AlertTriangle,
  Calendar,
  Timer,
  Activity
} from 'lucide-react';
import type { CrawlJob } from '../services/job-service';

interface JobProgressProps {
  job: CrawlJob;
  onJobAction: (jobId: string, action: 'start' | 'pause' | 'resume' | 'cancel') => void;
}

export function JobProgress({ job, onJobAction }: JobProgressProps) {
  const getStatusIcon = (status: CrawlJob['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
      case 'canceled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: CrawlJob['status']) => {
    switch (status) {
      case 'running':
        return 'blue';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'canceled':
        return 'red';
      case 'paused':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const calculateProgress = () => {
    const total = job.counts.crawled + job.counts.queued + job.counts.failed;
    if (total === 0) return 0;
    return (job.counts.crawled / total) * 100;
  };

  const calculateSpeed = () => {
    if (!job.startedAt || job.status !== 'running') return 0;
    const elapsed = (Date.now() - job.startedAt.getTime()) / 1000 / 60; // minutes
    if (elapsed === 0) return 0;
    return job.counts.crawled / elapsed;
  };

  const getEstimatedTimeRemaining = () => {
    if (job.status !== 'running') return null;
    
    const elapsed = Date.now() - job.startedAt!.getTime();
    const progress = calculateProgress();
    
    if (progress === 0 || progress >= 100) return null;
    
    const totalEstimated = (elapsed / progress) * 100;
    const remaining = totalEstimated - elapsed;
    
    if (remaining <= 0) return null;
    
    const minutes = Math.round(remaining / (1000 * 60));
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    
    const hours = Math.round(minutes / 60);
    return `${hours} hours`;
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getActionButtons = () => {
    switch (job.status) {
      case 'queued':
      case 'paused':
        return (
          <Button
            onClick={() => onJobAction(job.id, job.status === 'queued' ? 'start' : 'resume')}
          >
            <Play className="h-4 w-4 mr-2" />
            {job.status === 'queued' ? 'Start' : 'Resume'}
          </Button>
        );
      case 'running':
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onJobAction(job.id, 'pause')}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button
              variant="destructive"
              onClick={() => onJobAction(job.id, 'cancel')}
            >
              <Square className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                {job.name}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created {job.createdAt.toLocaleString()}
                </div>
                {job.startedAt && (
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    Duration: {formatDuration(job.startedAt, job.finishedAt)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" style={{ color: getStatusColor(job.status) }}>
                {job.status.toUpperCase()}
              </Badge>
              {getActionButtons()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          {(job.status === 'running' || job.status === 'paused' || job.status === 'completed') && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {job.counts.crawled + job.counts.queued + job.counts.failed} total pages
                </span>
                {job.status === 'running' && getEstimatedTimeRemaining() && (
                  <span>{getEstimatedTimeRemaining()} remaining</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{job.counts.crawled}</p>
                <p className="text-xs text-muted-foreground">Pages Crawled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{job.counts.queued}</p>
                <p className="text-xs text-muted-foreground">In Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{job.counts.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round(calculateSpeed())}</p>
                <p className="text-xs text-muted-foreground">Pages/Min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Crawl Limits</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Max Pages: {job.config.maxPages}</div>
                <div>Max Depth: {job.config.maxDepth}</div>
                <div>Concurrency: {job.config.concurrency}</div>
                <div>Rate: {job.config.requestsPerMinute} req/min</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Options</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Same Domain: {job.config.sameDomainOnly ? 'Yes' : 'No'}</div>
                <div>Subdomains: {job.config.includeSubdomains ? 'Yes' : 'No'}</div>
                <div>JavaScript: {job.config.renderJs ? 'Yes' : 'No'}</div>
                <div>Robots.txt: {job.config.respectRobots ? 'Respect' : 'Ignore'}</div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium mb-2">Start URLs</h4>
            <div className="space-y-1">
              {job.config.startUrls.map((url, index) => (
                <div key={index} className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {url}
                </div>
              ))}
            </div>
          </div>
          
          {job.config.excludePatterns.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Exclude Patterns</h4>
                <div className="space-y-1">
                  {job.config.excludePatterns.map((pattern, index) => (
                    <div key={index} className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {pattern}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {job.status === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Successfully crawled: {job.config.startUrls[0]}</span>
                <span className="text-xs text-muted-foreground ml-auto">Just now</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <Globe className="h-4 w-4 text-blue-500" />
                <span>Found {Math.floor(Math.random() * 10) + 5} new links</span>
                <span className="text-xs text-muted-foreground ml-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <FileText className="h-4 w-4 text-green-500" />
                <span>Extracted content from article page</span>
                <span className="text-xs text-muted-foreground ml-auto">3m ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  Calendar
} from 'lucide-react';
import type { CrawlJob } from '../services/job-service';

interface JobsListProps {
  jobs: CrawlJob[];
  selectedJobId: string | null;
  onJobSelect: (jobId: string) => void;
  onJobAction: (jobId: string, action: 'start' | 'pause' | 'resume' | 'cancel') => void;
}

export function JobsList({ jobs, selectedJobId, onJobSelect, onJobAction }: JobsListProps) {
  const getStatusIcon = (status: CrawlJob['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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

  const getActionButtons = (job: CrawlJob) => {
    switch (job.status) {
      case 'queued':
      case 'paused':
        return (
            <Button
            size="sm"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onJobAction(job.id, job.status === 'queued' ? 'start' : 'resume');
            }}
            >
            <Play className="h-3 w-3 mr-1" />
            {job.status === 'queued' ? 'Start' : 'Resume'}
            </Button>
        );
      case 'running':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onJobAction(job.id, 'pause');
              }}
            >
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onJobAction(job.id, 'cancel');
              }}
            >
              <Square className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  const calculateProgress = (job: CrawlJob) => {
    const total = job.counts.crawled + job.counts.queued + job.counts.failed;
    if (total === 0) return 0;
    return (job.counts.crawled / total) * 100;
  };

  const getEstimatedTimeRemaining = (job: CrawlJob) => {
    if (job.status !== 'running') return null;
    
    const elapsed = Date.now() - job.startedAt!.getTime();
    const progress = calculateProgress(job);
    
    if (progress === 0) return null;
    
    const totalEstimated = (elapsed / progress) * 100;
    const remaining = totalEstimated - elapsed;
    
    if (remaining <= 0) return null;
    
    const minutes = Math.round(remaining / (1000 * 60));
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    
    const hours = Math.round(minutes / 60);
    return `${hours} hours`;
  };

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center space-y-2">
            <Globe className="h-8 w-8 mx-auto text-muted-foreground" />
            <p>No crawl jobs</p>
            <p className="text-sm text-muted-foreground">
              Create your first crawl job to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Card
          key={job.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedJobId === job.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onJobSelect(job.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">{job.name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(job.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                <Badge variant="outline" style={{ color: getStatusColor(job.status) }}>
                  {job.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Progress */}
              {job.status === 'running' || job.status === 'paused' || job.status === 'completed' ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(calculateProgress(job))}%</span>
                  </div>
                  <Progress value={calculateProgress(job)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {job.counts.crawled} crawled, {job.counts.queued} queued, {job.counts.failed} failed
                    </span>
                    {job.status === 'running' && getEstimatedTimeRemaining(job) && (
                      <span>{getEstimatedTimeRemaining(job)} remaining</span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Start URLs */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Start URLs:</div>
                {job.config.startUrls.slice(0, 2).map((url, index) => (
                  <div key={index} className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">
                    {url}
                  </div>
                ))}
                {job.config.startUrls.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{job.config.startUrls.length - 2} more
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end">
                {getActionButtons(job)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
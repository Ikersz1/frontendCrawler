import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import type { CrawlConfig } from '../services/job-service';
import { postJSON } from '../services/api';

interface CrawlJobFormProps {
  onSubmit: (config: CrawlConfig) => void;
}

export function CrawlJobForm({ onSubmit }: CrawlJobFormProps) {
  const [config, setConfig] = useState<CrawlConfig>({
    name: '',
    startUrls: [''],
    maxPages: 100,
    maxDepth: 3,
    sameDomainOnly: true,
    includeSubdomains: false,
    includePatterns: ['**/*'],
    excludePatterns: ['**/*?*utm_*', '**/calendar/**', '**/wp-admin/**'],
    useSitemap: true,
    prioritizeSitemap: false,
    renderJs: false,
    timeout: 10000,
    retries: 3,
    concurrency: 2,
    requestsPerMinute: 60,
    userAgent: 'WebCrawler/1.0 (+https://example.com/bot)',
    headers: {},
    stripQueryParams: true,
    canonicalOnly: false,
    respectRobots: true,
    overrideRobots: false,
    extractTitle: true,
    extractMetaDescription: true,
    extractHeadings: true,
    extractMainContent: true,
    extractLinks: true,
    extractImages: true,
    saveRawHtml: false
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // === NUEVO: guardamos el último job para mostrar descargas ===
  const [lastJob, setLastJob] = useState<null | { jobName: string; jobDir: string }>(null);

  // === NUEVO: API base para construir enlaces de descarga
  const API_BASE =
    (import.meta as any).env?.VITE_API_URL ||
    (import.meta as any).env?.VITE_API_BASE ||
    'http://127.0.0.1:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config.name.trim()) {
      alert('Please provide a job name');
      return;
    }
    if (config.startUrls.length === 0 || !config.startUrls[0].trim()) {
      alert('Please provide at least one start URL');
      return;
    }

    try {
      // usa '/crawl' (sin hardcodear host) y deja que BASE_URL venga de VITE_API_URL en postJSON
      const data = await postJSON<{ status: string; results?: Array<{ startUrl: string; jobDir: string; pages: number }>; error?: string }>(
        '/crawl',
        config
      );

      console.log('Crawler response:', data);
      if (data.status === 'ok') {
        alert('Crawl started successfully!');
        const first = data.results?.[0];
        if (first?.jobDir) {
          const parts = first.jobDir.split(/[\\/]/);
          const jobName = parts[parts.length - 1];
          setLastJob({ jobName, jobDir: first.jobDir });
        }
        // opcional: notificar al padre si quieres mantener el callback
        onSubmit?.(config);
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to connect to backend: ${err?.message || err}`);
    }
  };

  const updateStartUrl = (index: number, value: string) => {
    const newUrls = [...config.startUrls];
    newUrls[index] = value;
    setConfig(prev => ({ ...prev, startUrls: newUrls }));
  };

  const addStartUrl = () => {
    setConfig(prev => ({ ...prev, startUrls: [...prev.startUrls, ''] }));
  };

  const removeStartUrl = (index: number) => {
    if (config.startUrls.length > 1) {
      const newUrls = config.startUrls.filter((_, i) => i !== index);
      setConfig(prev => ({ ...prev, startUrls: newUrls }));
    }
  };

  const updatePatterns = (type: 'include' | 'exclude', index: number, value: string) => {
    const patterns = type === 'include' ? config.includePatterns : config.excludePatterns;
    const newPatterns = [...patterns];
    newPatterns[index] = value;
    setConfig(prev => ({
      ...prev,
      [type === 'include' ? 'includePatterns' : 'excludePatterns']: newPatterns
    }));
  };

  const addPattern = (type: 'include' | 'exclude') => {
    const patterns = type === 'include' ? config.includePatterns : config.excludePatterns;
    setConfig(prev => ({
      ...prev,
      [type === 'include' ? 'includePatterns' : 'excludePatterns']: [...patterns, '']
    }));
  };

  const removePattern = (type: 'include' | 'exclude', index: number) => {
    const patterns = type === 'include' ? config.includePatterns : config.excludePatterns;
    if (patterns.length > 1) {
      const newPatterns = patterns.filter((_, i) => i !== index);
      setConfig(prev => ({
        ...prev,
        [type === 'include' ? 'includePatterns' : 'excludePatterns']: newPatterns
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Crawl Job</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="jobName">Job Name</Label>
              <Input
                id="jobName"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Website Crawl"
                required
              />
            </div>

            <div>
              <Label>Start URLs</Label>
              {config.startUrls.map((url, index) => (
                <div key={index} className="flex gap-2 mt-1">
                  <Input
                    value={url}
                    onChange={(e) => updateStartUrl(index, e.target.value)}
                    placeholder="https://example.com"
                    required={index === 0}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeStartUrl(index)}
                    disabled={config.startUrls.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStartUrl}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add URL
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxPages">Max Pages</Label>
                <Input
                  id="maxPages"
                  type="number"
                  min="1"
                  max="10000"
                  value={config.maxPages}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxPages: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="maxDepth">Max Depth</Label>
                <Input
                  id="maxDepth"
                  type="number"
                  min="1"
                  max="10"
                  value={config.maxDepth}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxDepth: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Domain & Pattern Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="sameDomain"
                checked={config.sameDomainOnly}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sameDomainOnly: checked }))}
              />
              <Label htmlFor="sameDomain">Same domain only</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="includeSubdomains"
                checked={config.includeSubdomains}
                onCheckedChange={(checked: boolean) => setConfig(prev => ({ ...prev, includeSubdomains: checked }))}
              />
              <Label htmlFor="includeSubdomains">Include subdomains</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="useSitemap"
                checked={config.useSitemap}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useSitemap: checked }))}
              />
              <Label htmlFor="useSitemap">Use sitemap for discovery</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="renderJs"
                checked={config.renderJs}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, renderJs: checked }))}
              />
              <Label htmlFor="renderJs">Render JavaScript (slower)</Label>
            </div>
          </div>

          <Separator />

          {/* Robots.txt Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="respectRobots"
                checked={config.respectRobots}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, respectRobots: checked }))}
              />
              <Label htmlFor="respectRobots">Respect robots.txt</Label>
            </div>

            {config.respectRobots && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="overrideRobots"
                  checked={config.overrideRobots}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, overrideRobots: checked }))}
                />
                <Label htmlFor="overrideRobots">Override robots.txt restrictions</Label>
              </div>
            )}

            {config.overrideRobots && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Overriding robots.txt may violate website terms of service. 
                  Please ensure you have permission to crawl this content.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Advanced Configuration Toggle */}
          <Separator />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </Button>

          {showAdvanced && (
            <div className="space-y-4 border rounded-lg p-4">
              {/* Include/Exclude Patterns */}
              <div>
                <Label>Include Patterns (glob)</Label>
                {config.includePatterns.map((pattern, index) => (
                  <div key={index} className="flex gap-2 mt-1">
                    <Input
                      value={pattern}
                      onChange={(e) => updatePatterns('include', index, e.target.value)}
                      placeholder="**/*"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removePattern('include', index)}
                      disabled={config.includePatterns.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPattern('include')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Include Pattern
                </Button>
              </div>

              <div>
                <Label>Exclude Patterns (glob)</Label>
                {config.excludePatterns.map((pattern, index) => (
                  <div key={index} className="flex gap-2 mt-1">
                    <Input
                      value={pattern}
                      onChange={(e) => updatePatterns('exclude', index, e.target.value)}
                      placeholder="**/admin/**"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removePattern('exclude', index)}
                      disabled={config.excludePatterns.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPattern('exclude')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Exclude Pattern
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="concurrency">Concurrency</Label>
                  <Input
                    id="concurrency"
                    type="number"
                    min="1"
                    max="10"
                    value={config.concurrency}
                    onChange={(e) => setConfig(prev => ({ ...prev, concurrency: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="requestsPerMinute">Requests/Minute</Label>
                  <Input
                    id="requestsPerMinute"
                    type="number"
                    min="1"
                    max="300"
                    value={config.requestsPerMinute}
                    onChange={(e) => setConfig(prev => ({ ...prev, requestsPerMinute: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="userAgent">User Agent</Label>
                <Input
                  id="userAgent"
                  value={config.userAgent}
                  onChange={(e) => setConfig(prev => ({ ...prev, userAgent: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="saveRawHtml"
                  checked={config.saveRawHtml}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, saveRawHtml: checked }))}
                />
                <Label htmlFor="saveRawHtml">Save raw HTML</Label>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">
            Create Crawl Job
          </Button>
        </form>

        {/* === NUEVO: bloque de descargas del último job === */}
        {lastJob && (
          <div className="mt-6 space-y-2 border rounded-lg p-4">
            <div className="font-medium">Job listo: {lastJob.jobName}</div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`${API_BASE}/download/${lastJob.jobName}/all_results.json`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm">Download JSON</Button>
              </a>
              <a
                href={`${API_BASE}/download/${lastJob.jobName}/all_results.csv`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">Download CSV</Button>
              </a>
              <a
                href={`${API_BASE}/download/${lastJob.jobName}/all_results.md`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="secondary">Download Markdown</Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Los archivos se generan en el servidor. Puedes abrirlos y “Guardar como…” para bajarlos localmente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

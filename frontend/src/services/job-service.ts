// src/services/job-service.ts
// Servicio híbrido: MOCK vs REAL backend (FastAPI en Render)

export interface CrawlConfig {
  name: string;
  startUrls: string[];
  maxPages: number;
  maxDepth: number;
  sameDomainOnly: boolean;
  includeSubdomains: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  useSitemap: boolean;
  prioritizeSitemap: boolean;
  renderJs: boolean;
  timeout: number;
  retries: number;
  concurrency: number;
  requestsPerMinute: number;
  userAgent: string;
  headers: Record<string, string>;
  stripQueryParams: boolean;
  canonicalOnly: boolean;
  respectRobots: boolean;
  overrideRobots: boolean;
  extractTitle: boolean;
  extractMetaDescription: boolean;
  extractHeadings: boolean;
  extractMainContent: boolean;
  extractLinks: boolean;
  extractImages: boolean;
  saveRawHtml: boolean;
}

export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled';

export interface CrawlJob {
  id: string;
  name: string;
  config: CrawlConfig;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  updatedAt?: Date;
  counts: {
    crawled: number;
    queued: number;
    failed: number;
  };
  // NUEVO para backend real
  jobDir?: string;   // ej: "output_crawler/job-20251003-101601"
  startUrl?: string; // de dónde vino
}

export interface JobLog {
  id: string;
  jobId: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  meta?: Record<string, any>;
}

export interface CrawledPage {
  id: string;
  jobId: string;
  url: string;
  normalizedUrl: string;
  status: number;
  contentType: string;
  fetchedAt: Date;
  durationMs: number;
  hash: string;
  title: string;
  description: string;
  h1: string;
  headings: string[];
  links: { url: string; text: string; internal: boolean }[];
  images: { src: string; alt: string }[];
  markdown: string;
  html?: string;
  error?: string;
}

// =====================
// Config
// =====================
const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const USE_MOCK = false; // <— cambia a true si quieres usar el mock

// =====================
// Estado en memoria (para mock y cosas sin endpoint)
// =====================
let jobs: CrawlJob[] = [];
let logs: JobLog[] = [];
let pages: CrawledPage[] = [];

// =====================
// Utils
// =====================
function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ========= MOCK helpers =========
function createSampleLogs(jobId: string): JobLog[] {
  const base = Date.now();
  const mk = (n: number, level: JobLog['level'], message: string, meta?: Record<string, any>): JobLog => ({
    id: generateId(),
    jobId,
    level,
    message,
    timestamp: new Date(base - n * 3000),
    meta
  });
  return [
    mk(0, 'info', 'Starting crawl job', { startUrls: ['https://example.com'] }),
    mk(1, 'info', 'Checking robots.txt', { url: 'https://example.com/robots.txt' }),
    mk(2, 'success', 'Found sitemap.xml', { sitemap: 'https://example.com/sitemap.xml', urls: 45 }),
    mk(3, 'info', 'Discovered 15 new URLs from sitemap'),
    mk(4, 'success', 'Successfully crawled: https://example.com/', { status: 200, size: 12345, links: 8 }),
    mk(5, 'warn', 'Rate limiting detected, backing off', { retryAfter: 5 }),
    mk(6, 'error', 'Failed to crawl: https://example.com/broken', { status: 404, error: 'Not Found' })
  ];
}

function simulateCrawling(jobId: string) {
  const job = jobs.find(j => j.id === jobId);
  if (!job || job.status !== 'running') return;

  const interval = setInterval(() => {
    const current = jobs.find(j => j.id === jobId);
    if (!current || current.status !== 'running') { clearInterval(interval); return; }

    const total = Math.min(current.config.maxPages, 50);
    if (current.counts.crawled < total) {
      const inc = Math.min(Math.floor(Math.random() * 3) + 1, total - current.counts.crawled);
      current.counts.crawled += inc;
      current.counts.queued = Math.max(0, current.counts.queued - inc);
      if (Math.random() < 0.1) current.counts.failed += 1;
      current.updatedAt = new Date();
      logs.push({
        id: generateId(),
        jobId,
        level: 'success',
        message: `Successfully crawled: ${current.config.startUrls[0]}/page-${current.counts.crawled}`,
        timestamp: new Date(),
        meta: { status: 200 }
      });
    }
    if (current.counts.crawled + current.counts.failed >= total) {
      current.status = 'completed';
      current.finishedAt = new Date();
      current.counts.queued = 0;
      logs.push({
        id: generateId(),
        jobId,
        level: 'success',
        message: `Crawl job completed. Processed ${current.counts.crawled} pages.`,
        timestamp: new Date(),
        meta: { totalPages: current.counts.crawled }
      });
      clearInterval(interval);
    }
  }, 1500);
}

// ========= REAL helpers =========
type BackendCrawlResult = {
  status: 'ok' | 'error';
  results?: Array<{ startUrl: string; jobDir: string; pages: number }>;
  message?: string;
  error?: string;
};

function jobFromBackend(config: CrawlConfig, r: { startUrl: string; jobDir: string; pages: number }): CrawlJob {
  const now = new Date();
  return {
    id: generateId(),
    name: config.name || 'job',
    config,
    status: 'completed',
    createdAt: now,
    startedAt: now,
    finishedAt: now,
    updatedAt: now,
    counts: { crawled: r.pages ?? 0, queued: 0, failed: 0 },
    jobDir: r.jobDir,
    startUrl: r.startUrl
  };
}

function extractJobFolder(jobDir?: string | null) {
  if (!jobDir) return null;
  const parts = jobDir.split('/');
  return parts[1] || parts[0] || null; // "job-YYYYMMDD-HHMMSS"
}

export function buildDownloadUrl(jobDir: string | undefined, fileName: string) {
  const folder = extractJobFolder(jobDir);
  if (!folder) return null;
  return `${API_URL}/download/${folder}/${fileName}`;
}

// =====================
// Servicio
// =====================
export const JobService = {
  async createJob(config: CrawlConfig): Promise<CrawlJob> {
    if (USE_MOCK) {
      const job: CrawlJob = {
        id: generateId(),
        name: config.name,
        config,
        status: 'queued',
        createdAt: new Date(),
        counts: { crawled: 0, queued: Math.min(config.maxPages, 20), failed: 0 }
      };
      jobs.push(job);
      logs.push(...createSampleLogs(job.id));
      return job;
    }

    // REAL: llamamos a /crawl/
    const res = await fetch(`${API_URL}/crawl/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Backend error (${res.status}): ${txt || res.statusText}`);
    }
    const data: BackendCrawlResult = await res.json();
    if (data.status !== 'ok' || !data.results || data.results.length === 0) {
      throw new Error(data.message || data.error || 'Unknown crawler error');
    }

    // La API devuelve un objeto por cada startUrl.
    // Para no romper tu UI “de a uno”, devolvemos el primero
    // y guardamos todos en memoria para “JobsList”.
    const completedJobs = data.results.map(r => jobFromBackend(config, r));
    jobs = [...completedJobs, ...jobs]; // prepend
    // Devolvemos el primero como “job creado”
    return completedJobs[0];
  },

  getJobs(): CrawlJob[] {
    return [...jobs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getJob(jobId: string): CrawlJob | undefined {
    return jobs.find(j => j.id === jobId);
  },

  async performJobAction(jobId: string, action: 'start' | 'pause' | 'resume' | 'cancel'): Promise<void> {
    if (USE_MOCK) {
      const job = jobs.find(j => j.id === jobId);
      if (!job) throw new Error('Job not found');
      const now = new Date();
      if (action === 'start' && job.status === 'queued') {
        job.status = 'running'; job.startedAt = now; job.updatedAt = now;
        logs.push({ id: generateId(), jobId, level: 'info', message: 'Crawl job started', timestamp: now });
        simulateCrawling(jobId);
      } else if (action === 'pause' && job.status === 'running') {
        job.status = 'paused'; job.updatedAt = now;
        logs.push({ id: generateId(), jobId, level: 'warn', message: 'Crawl job paused', timestamp: now });
      } else if (action === 'resume' && job.status === 'paused') {
        job.status = 'running'; job.updatedAt = now;
        logs.push({ id: generateId(), jobId, level: 'info', message: 'Crawl job resumed', timestamp: now });
        simulateCrawling(jobId);
      } else if (action === 'cancel' && ['queued','running','paused'].includes(job.status)) {
        job.status = 'canceled'; job.finishedAt = now; job.updatedAt = now;
        logs.push({ id: generateId(), jobId, level: 'error', message: 'Crawl job canceled', timestamp: now });
      }
      return;
    }

    // REAL: (aún no hay endpoints para controlar el job)
    // No hacemos nada, solo informamos
    console.warn('Job control not supported by backend yet:', action);
  },

  getJobLogs(jobId: string): JobLog[] {
    // En real no tenemos endpoint, mantenemos logs locales
    return logs.filter(l => l.jobId === jobId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  },

  async exportJob(jobId: string, formats: string[]): Promise<string> {
    const job = jobs.find(j => j.id === jobId);
    if (!job) throw new Error('Job not found');

    if (USE_MOCK) {
      // Mock: genera un blob descargable
      const mock = {
        jobId,
        formats,
        exportedAt: new Date().toISOString(),
        files: formats.map(f => ({ format: f, filename: `export.${f}`, size: 12_345 }))
      };
      const blob = new Blob([JSON.stringify(mock, null, 2)], { type: 'application/json' });
      return URL.createObjectURL(blob);
    }

    // REAL: construimos link directo a all_results.*
    const links = ['all_results.json', 'all_results.csv', 'all_results.md']
      .map(fn => ({ fn, url: buildDownloadUrl(job.jobDir, fn) }))
      .filter(x => !!x.url) as { fn: string; url: string }[];

    if (!links.length) throw new Error('No download links available for this job.');

    // Devuelve el primero (o puedes devolver un listado y pintarlo en UI)
    return links[0].url;
  },

  getJobPages(jobId: string): CrawledPage[] {
    // Sin endpoint en backend, seguimos devolviendo “mock pages” a partir del conteo
    const job = jobs.find(j => j.id === jobId);
    if (!job) return [];
    const arr: CrawledPage[] = [];
    for (let i = 0; i < job.counts.crawled; i++) {
      arr.push({
        id: generateId(),
        jobId,
        url: `${job.startUrl || job.config.startUrls[0]}/page-${i+1}`,
        normalizedUrl: `${job.startUrl || job.config.startUrls[0]}/page-${i+1}`,
        status: 200,
        contentType: 'text/html',
        fetchedAt: new Date(Date.now() - (job.counts.crawled - i) * 20000),
        durationMs: 800,
        hash: `hash-${i}`,
        title: `Page ${i + 1}`,
        description: `Mock page ${i + 1}`,
        h1: `Page ${i + 1} Heading`,
        headings: [`Page ${i + 1} Heading`, 'Section A', 'Section B'],
        links: [
          { url: '/about', text: 'About', internal: true },
          { url: '/contact', text: 'Contact', internal: true }
        ],
        images: [{ src: '/image.jpg', alt: 'img' }],
        markdown: `# Page ${i + 1}\n\nMock content.`,
      });
    }
    return arr;
  },

  clearAll(): void {
    jobs = []; logs = []; pages = [];
  }
};

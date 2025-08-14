import { spawn } from 'child_process';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ScrapingJob {
  campaignId: string;
  userId: string;
  keyword: string;
  location: string;
  industry: string;
  maxPages?: number;
}

export class ScrapingService {
  private runningJobs = new Map<string, AbortController>();

  // Run get_emails.py to enrich existing profiles with emails
  async enrichEmails(job: ScrapingJob): Promise<void> {
    const { campaignId, userId } = job;

    // Check if FinalScout credentials are available
    if (!process.env.SCOUT_EMAIL || !process.env.SCOUT_PASSWORD) {
      const error = new Error('FinalScout credentials not configured. Please set SCOUT_EMAIL and SCOUT_PASSWORD environment variables.');
      console.error(`Email enrichment failed for campaign ${campaignId}:`, error.message);
      await this.updateCampaignStatus(campaignId, 'failed');
      throw error;
    }

    if (this.runningJobs.has(`enrich-${campaignId}`)) {
      console.log(`Email enrichment already in progress for campaign ${campaignId}`);
      return;
    }

    const abortController = new AbortController();
    this.runningJobs.set(`enrich-${campaignId}`, abortController);

    try {
      await this.updateCampaignStatus(campaignId, 'running');

      console.log(`Starting email enrichment for campaign ${campaignId} (with visible browser)`);
      await this.runPythonScript('get_emails.py', [], abortController.signal, false); // false = show browser

      await this.updateCampaignStatus(campaignId, 'completed');
      console.log(`Email enrichment completed for campaign ${campaignId}`);

    } catch (error) {
      console.error(`Email enrichment failed for campaign ${campaignId}:`, error);
      await this.updateCampaignStatus(campaignId, 'failed');
      throw error;
    } finally {
      this.runningJobs.delete(`enrich-${campaignId}`);
    }
  }

  // Run find_profiles.py to find LinkedIn profiles
  async findProfiles(job: ScrapingJob): Promise<void> {
    const { campaignId, userId, keyword, location, industry, maxPages = 1 } = job;

    // Check if LinkedIn credentials are available
    if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
      const error = new Error('LinkedIn credentials not configured. Please set LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables.');
      console.error(`Profile finding failed for campaign ${campaignId}:`, error.message);
      await this.updateCampaignStatus(campaignId, 'failed');
      throw error;
    }

    if (this.runningJobs.has(`profiles-${campaignId}`)) {
      console.log(`Profile finding already in progress for campaign ${campaignId}`);
      return;
    }

    const abortController = new AbortController();
    this.runningJobs.set(`profiles-${campaignId}`, abortController);

    try {
      await this.updateCampaignStatus(campaignId, 'running');

      console.log(`Starting profile search for campaign ${campaignId}`);
      console.log(`Command: python find_profiles.py "${keyword}" "${location}" "${industry}" ${maxPages} --campaign-id ${campaignId} --user-id ${userId}`);
      
      await this.runPythonScript('find_profiles.py', [
        keyword,
        location,
        industry,
        maxPages.toString(),
        '--campaign-id', campaignId,
        '--user-id', userId
      ], abortController.signal, false); // false = visible browser mode

      await this.updateCampaignStatus(campaignId, 'completed');
      console.log(`Profile finding completed for campaign ${campaignId}`);

    } catch (error) {
      console.error(`Profile finding failed for campaign ${campaignId}:`, error);
      await this.updateCampaignStatus(campaignId, 'failed');
      throw error;
    } finally {
      this.runningJobs.delete(`profiles-${campaignId}`);
    }
  }

  // Combined: Run find_profiles.py first, then get_emails_individual.py
  async combinedScrapingAndEnrichment(job: ScrapingJob): Promise<void> {
    const { campaignId, userId, keyword, location, industry, maxPages = 1 } = job;

    // Check if both LinkedIn and FinalScout credentials are available
    if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
      const error = new Error('LinkedIn credentials not configured. Please set LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables.');
      console.error(`Combined scraping failed for campaign ${campaignId}:`, error.message);
      await this.updateCampaignStatus(campaignId, 'failed');
      throw error;
    }

    if (!process.env.SCOUT_EMAIL || !process.env.SCOUT_PASSWORD) {
      const error = new Error('FinalScout credentials not configured. Please set SCOUT_EMAIL and SCOUT_PASSWORD environment variables.');
      console.error(`Combined scraping failed for campaign ${campaignId}:`, error.message);
      await this.updateCampaignStatus(campaignId, 'failed');
      throw error;
    }

    if (this.runningJobs.has(`combined-${campaignId}`)) {
      console.log(`Combined scraping already in progress for campaign ${campaignId}`);
      return;
    }

    const abortController = new AbortController();
    this.runningJobs.set(`combined-${campaignId}`, abortController);

    try {
      await this.updateCampaignStatus(campaignId, 'running');

      // Step 1: Find profiles
      console.log(`Starting profile search for campaign ${campaignId}`);
      await this.runPythonScript('find_profiles.py', [
        keyword,
        location,
        industry,
        maxPages.toString(),
        '--campaign-id', campaignId,
        '--user-id', userId
      ], abortController.signal, false); // visible browser mode

      // Step 2: Individual email enrichment
      console.log(`Starting individual email enrichment for campaign ${campaignId}`);
      await this.runPythonScript('get_emails_individual.py', [
        campaignId, // pass campaign ID
        userId      // pass user ID
      ], abortController.signal, false); // visible browser for FinalScout

      await this.updateCampaignStatus(campaignId, 'completed');
      console.log(`Combined scraping and enrichment completed for campaign ${campaignId}`);

    } catch (error) {
      console.error(`Combined scraping failed for campaign ${campaignId}:`, error);
      await this.updateCampaignStatus(campaignId, 'failed');
      throw error;
    } finally {
      this.runningJobs.delete(`combined-${campaignId}`);
    }
  }

  async stopScraping(campaignId: string): Promise<void> {
    // Check all possible job types
    const jobKeys = [`enrich-${campaignId}`, `profiles-${campaignId}`, `combined-${campaignId}`];
    
    for (const key of jobKeys) {
      const controller = this.runningJobs.get(key);
      if (controller) {
        controller.abort();
        this.runningJobs.delete(key);
      }
    }
    
    await this.updateCampaignStatus(campaignId, 'idle');
  }

  isScrapingRunning(campaignId: string): boolean {
    return this.runningJobs.has(`enrich-${campaignId}`) || 
           this.runningJobs.has(`profiles-${campaignId}`) ||
           this.runningJobs.has(`combined-${campaignId}`);
  }

  private async updateCampaignStatus(campaignId: string, status: 'idle' | 'running' | 'completed' | 'failed'): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .update({ 
        scraping_status: status,
        scraping_updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (error) {
      console.error(`Failed to update campaign status:`, error);
    }
  }

  private runPythonScript(scriptName: string, args: string[], signal: AbortSignal, headless: boolean = true): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'python', scriptName);
      // Use the virtual environment Python
      const pythonCommand = path.join(process.cwd(), 'python', 'venv', 'bin', 'python');
      
      const child = spawn(pythonCommand, [scriptPath, ...args], {
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          HEADLESS_BROWSER: headless ? 'true' : 'false',  // Control browser visibility
          // Add LinkedIn credentials if available
          LINKEDIN_EMAIL: process.env.LINKEDIN_EMAIL || '',
          LINKEDIN_PASSWORD: process.env.LINKEDIN_PASSWORD || '',
          // Add FinalScout credentials if available
          SCOUT_EMAIL: process.env.SCOUT_EMAIL || '',
          SCOUT_PASSWORD: process.env.SCOUT_PASSWORD || ''
        },
        signal
      });

      child.stdout.on('data', (data) => {
        console.log(`[${scriptName}]: ${data.toString()}`);
      });

      child.stderr.on('data', (data) => {
        console.error(`[${scriptName} ERROR]: ${data.toString()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else if (signal.aborted) {
          reject(new Error('Script execution cancelled'));
        } else {
          reject(new Error(`Script exited with code ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  async getScrapingProgress(campaignId: string): Promise<{
    totalProfiles: number;
    enrichedProfiles: number;
    totalContacts: number;
  }> {
    const { count: totalProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);

    const { count: enrichedProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('is_enriched', true);

    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);

    return {
      totalProfiles: totalProfiles || 0,
      enrichedProfiles: enrichedProfiles || 0,
      totalContacts: totalContacts || 0
    };
  }
}

export const scrapingService = new ScrapingService();
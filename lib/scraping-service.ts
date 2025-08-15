import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
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

    } catch (error: any) {
      // Check if it's an abort error
      if (error?.message === 'Script execution cancelled' || error?.code === 'ABORT_ERR' || abortController.signal.aborted) {
        console.log(`Email enrichment was cancelled for campaign ${campaignId}`);
        // Status already set to 'idle' by stopScraping method
      } else {
        console.error(`Email enrichment failed for campaign ${campaignId}:`, error);
        await this.updateCampaignStatus(campaignId, 'failed');
      }
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

    } catch (error: any) {
      // Check if it's an abort error
      if (error?.message === 'Script execution cancelled' || error?.code === 'ABORT_ERR' || abortController.signal.aborted) {
        console.log(`Profile finding was cancelled for campaign ${campaignId}`);
        // Status already set to 'idle' by stopScraping method
      } else {
        console.error(`Profile finding failed for campaign ${campaignId}:`, error);
        await this.updateCampaignStatus(campaignId, 'failed');
      }
      throw error;
    } finally {
      this.runningJobs.delete(`profiles-${campaignId}`);
    }
  }

  // Smart Combined: Check for unenriched profiles first, then decide what to run
  async smartCombinedScraping(job: ScrapingJob): Promise<void> {
    const { campaignId, userId } = job;

    if (this.runningJobs.has(`smart-${campaignId}`)) {
      console.log(`Smart scraping already in progress for campaign ${campaignId}`);
      return;
    }

    const abortController = new AbortController();
    this.runningJobs.set(`smart-${campaignId}`, abortController);

    try {
      await this.updateCampaignStatus(campaignId, 'running');

      // Check if there are profiles with enrich=false
      const { count: unenrichedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('is_enriched', false);

      console.log(`Found ${unenrichedCount || 0} unenriched profiles for campaign ${campaignId}`);

      if (unenrichedCount && unenrichedCount > 0) {
        // Only run FinalScout email enrichment on existing profiles
        console.log(`Running FinalScout email enrichment only for ${unenrichedCount} existing profiles`);
        await this.runPythonScript('get_emails_individual.py', [
          campaignId,
          userId
        ], abortController.signal, false);
      } else {
        // No unenriched profiles, run full process: LinkedIn + FinalScout
        console.log(`No unenriched profiles found, running full LinkedIn + FinalScout process`);
        
        // Step 1: Find profiles on LinkedIn
        await this.runPythonScript('find_profiles.py', [
          job.keyword,
          job.location,
          job.industry,
          (job.maxPages || 1).toString(),
          '--campaign-id', campaignId,
          '--user-id', userId
        ], abortController.signal, false);

        // Step 2: Enrich found profiles with emails
        await this.runPythonScript('get_emails_individual.py', [
          campaignId,
          userId
        ], abortController.signal, false);
      }

      await this.updateCampaignStatus(campaignId, 'completed');
      console.log(`Smart scraping completed for campaign ${campaignId}`);

    } catch (error: any) {
      // Check if it's an abort error
      if (error?.message === 'Script execution cancelled' || error?.code === 'ABORT_ERR' || abortController.signal.aborted) {
        console.log(`Smart scraping was cancelled for campaign ${campaignId}`);
        // Status already set to 'idle' by stopScraping method
      } else {
        console.error(`Smart scraping failed for campaign ${campaignId}:`, error);
        await this.updateCampaignStatus(campaignId, 'failed');
      }
      throw error;
    } finally {
      this.runningJobs.delete(`smart-${campaignId}`);
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

    } catch (error: any) {
      // Check if it's an abort error
      if (error?.message === 'Script execution cancelled' || error?.code === 'ABORT_ERR' || abortController.signal.aborted) {
        console.log(`Combined scraping was cancelled for campaign ${campaignId}`);
        // Status already set to 'idle' by stopScraping method
      } else {
        console.error(`Combined scraping failed for campaign ${campaignId}:`, error);
        await this.updateCampaignStatus(campaignId, 'failed');
      }
      throw error;
    } finally {
      this.runningJobs.delete(`combined-${campaignId}`);
    }
  }

  async stopScraping(campaignId: string): Promise<void> {
    // Check all possible job types
    const jobKeys = [`enrich-${campaignId}`, `profiles-${campaignId}`, `combined-${campaignId}`, `smart-${campaignId}`];
    
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
           this.runningJobs.has(`combined-${campaignId}`) ||
           this.runningJobs.has(`smart-${campaignId}`);
  }

  private async updateCampaignStatus(campaignId: string, status: 'idle' | 'running' | 'completed' | 'failed'): Promise<void> {
    console.log(`Updating campaign ${campaignId} status to: ${status}`);
    const { error } = await supabase
      .from('campaigns')
      .update({ 
        scraping_status: status,
        scraping_updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (error) {
      console.error(`Failed to update campaign status:`, error);
    } else {
      console.log(`Successfully updated campaign ${campaignId} status to: ${status}`);
    }
  }

  private runPythonScript(scriptName: string, args: string[], signal: AbortSignal, headless: boolean = true): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'python', scriptName);
      // Use the virtual environment Python
      const pythonCommand = path.join(process.cwd(), 'python', 'venv', 'bin', 'python');
      
      console.log(`🐍 Starting Python script: ${scriptName} with args:`, args);
      console.log(`🐍 Python command: ${pythonCommand}`);
      console.log(`🐍 Script path: ${scriptPath}`);
      
      // Check if files exist before running
      if (!fs.existsSync(scriptPath)) {
        reject(new Error(`Python script not found: ${scriptPath}`));
        return;
      }
      
      if (!fs.existsSync(pythonCommand)) {
        reject(new Error(`Python interpreter not found: ${pythonCommand}`));
        return;
      }
      
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
          SCOUT_PASSWORD: process.env.SCOUT_PASSWORD || '',
          // Add Supabase credentials for Python scripts
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        },
        signal,
        detached: true // Create a new process group
      });

      // Listen for abort signal to kill the process
      signal.addEventListener('abort', () => {
        console.log(`🛑 Abort signal received, killing Python process ${scriptName} (PID: ${child.pid})`);
        
        // Kill the entire process group to ensure browser instances are also terminated
        try {
          // Use negative PID to kill the entire process group
          process.kill(-child.pid, 'SIGTERM');
          console.log(`🛑 Sent SIGTERM to process group ${child.pid}`);
        } catch (err) {
          // Fallback to killing just the child process
          console.log(`⚠️ Could not kill process group, killing child process only`);
          child.kill('SIGTERM');
        }
        
        // Force kill after timeout if still running
        setTimeout(() => {
          if (!child.killed) {
            console.log(`🔨 Force killing Python process ${scriptName} (PID: ${child.pid})`);
            try {
              process.kill(-child.pid, 'SIGKILL');
            } catch (err) {
              child.kill('SIGKILL');
            }
          }
        }, 2000); // Give it 2 seconds to terminate gracefully
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutBuffer += output;
        console.log(`[${scriptName}]: ${output}`);
      });

      child.stderr.on('data', (data) => {
        const error = data.toString();
        stderrBuffer += error;
        console.error(`[${scriptName} ERROR]: ${error}`);
      });

      child.on('close', (code, killSignal) => {
        console.log(`🐍 Script ${scriptName} finished with code: ${code}, signal: ${killSignal}`);
        
        if (code === 0) {
          resolve();
        } else if (signal.aborted || killSignal === 'SIGTERM' || killSignal === 'SIGKILL') {
          console.log(`🛑 Python script ${scriptName} was cancelled/terminated`);
          reject(new Error('Script execution cancelled'));
        } else {
          // Include stderr output in error message for better debugging
          const errorMsg = `Script ${scriptName} exited with code ${code}. 
STDERR: ${stderrBuffer}
STDOUT: ${stdoutBuffer}`;
          console.error(`🐍 Full error details: ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      });

      child.on('error', (err) => {
        console.error(`🐍 Process error for ${scriptName}:`, err);
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
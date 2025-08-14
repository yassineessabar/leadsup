import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ScrapingUpdate {
  campaignId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: {
    totalProfiles: number;
    enrichedProfiles: number;
    totalContacts: number;
  };
}

export function useScrapingUpdates(campaignId: string | number | undefined) {
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingUpdate['status']>('idle');
  const [scrapingProgress, setScrapingProgress] = useState<ScrapingUpdate['progress']>({
    totalProfiles: 0,
    enrichedProfiles: 0,
    totalContacts: 0
  });

  useEffect(() => {
    if (!campaignId) return;

    // Initial status fetch
    fetchScrapingStatus();

    // Subscribe to profiles table changes
    const profilesSubscription = supabase
      .channel(`profiles-${campaignId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: `campaign_id=eq.${campaignId}`
        }, 
        (payload) => {
          console.log('Profile change:', payload);
          updateProgress();
        }
      )
      .subscribe();

    // Subscribe to contacts table changes
    const contactsSubscription = supabase
      .channel(`contacts-${campaignId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'contacts',
          filter: `campaign_id=eq.${campaignId}`
        }, 
        (payload) => {
          console.log('Contact change:', payload);
          updateProgress();
        }
      )
      .subscribe();

    // Subscribe to campaign status changes
    const campaignSubscription = supabase
      .channel(`campaign-${campaignId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'campaigns',
          filter: `id=eq.${campaignId}`
        }, 
        (payload) => {
          console.log('Campaign update:', payload);
          if (payload.new && 'scraping_status' in payload.new) {
            setScrapingStatus(payload.new.scraping_status as ScrapingUpdate['status']);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesSubscription);
      supabase.removeChannel(contactsSubscription);
      supabase.removeChannel(campaignSubscription);
    };
  }, [campaignId]);

  const fetchScrapingStatus = async () => {
    if (!campaignId) return;

    try {
      // Get campaign scraping status
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('scraping_status')
        .eq('id', campaignId)
        .single();

      if (campaign?.scraping_status) {
        setScrapingStatus(campaign.scraping_status);
      }

      // Get progress
      await updateProgress();
    } catch (error) {
      console.error('Error fetching scraping status:', error);
    }
  };

  const updateProgress = async () => {
    if (!campaignId) return;

    try {
      // Get profile counts
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      const { count: enrichedProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('is_enriched', true);

      // Get contact count
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      setScrapingProgress({
        totalProfiles: totalProfiles || 0,
        enrichedProfiles: enrichedProfiles || 0,
        totalContacts: totalContacts || 0
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  return {
    scrapingStatus,
    scrapingProgress,
    refetch: fetchScrapingStatus
  };
}
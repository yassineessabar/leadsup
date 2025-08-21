#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkYourActualResponses() {
  console.log('🔍 Checking for your actual email responses...');
  console.log('📧 Looking for messages from: essabar.yassine@gmail.com');
  console.log('');
  
  try {
    // Check inbox_messages for inbound messages
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .eq('contact_email', 'essabar.yassine@gmail.com')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    if (!messages || messages.length === 0) {
      console.log('❌ No inbound messages found from your email address');
      console.log('   This might mean:');
      console.log('   1. Your replies went to production webhook (app.leadsup.io)');
      console.log('   2. The replies haven\'t been stored yet');
      console.log('   3. They\'re stored under a different email or direction');
      
      // Let's also check for any messages containing your email
      console.log('');
      console.log('🔍 Checking for any messages mentioning your email...');
      
      const { data: anyMessages, error: anyError } = await supabase
        .from('inbox_messages')
        .select('*')
        .or(`contact_email.eq.essabar.yassine@gmail.com,sender_email.eq.essabar.yassine@gmail.com,body_text.ilike.%essabar%`)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (anyMessages && anyMessages.length > 0) {
        console.log(`📧 Found ${anyMessages.length} messages related to your email:`);
        anyMessages.forEach((msg, i) => {
          console.log(`${i+1}. ${msg.direction} | ${msg.subject} | ${msg.created_at}`);
        });
      } else {
        console.log('❌ No messages found at all with your email');
      }
      
      return;
    }
    
    console.log(`✅ Found ${messages.length} inbound messages from you:`);
    console.log('=' + '='.repeat(80));
    
    messages.forEach((msg, i) => {
      const date = new Date(msg.created_at).toLocaleString();
      console.log(`${i + 1}. 📧 RESPONSE #${i + 1}`);
      console.log(`   📅 Date: ${date}`);
      console.log(`   📨 Message ID: ${msg.message_id || msg.id}`);
      console.log(`   📧 Subject: ${msg.subject || 'No subject'}`);
      console.log(`   📍 From: ${msg.contact_email}`);
      console.log(`   📍 To: ${msg.sender_email}`);
      console.log(`   🔄 Direction: ${msg.direction}`);
      console.log(`   📝 YOUR ACTUAL RESPONSE:`);
      console.log(`   "${msg.body_text || 'No text content'}"`);
      
      if (msg.body_html && msg.body_html !== msg.body_text) {
        console.log(`   🌐 HTML Content: ${msg.body_html.substring(0, 150)}...`);
      }
      
      if (msg.provider_data) {
        try {
          const providerData = typeof msg.provider_data === 'string' 
            ? JSON.parse(msg.provider_data) 
            : msg.provider_data;
          if (providerData.headers) {
            console.log(`   📋 Headers: ${JSON.stringify(providerData.headers).substring(0, 100)}...`);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      
      console.log('─' + '─'.repeat(80));
    });
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

checkYourActualResponses();
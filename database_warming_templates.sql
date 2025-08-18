-- Additional warming email templates
-- Run this to add more diverse templates to your warming system

INSERT INTO warmup_templates (name, category, phase, subject_templates, content_templates, weight) VALUES

-- Phase 1 Templates (Foundation)
(
  'Account Setup Notifications',
  'transactional',
  1,
  ARRAY[
    'Your account setup is complete',
    'Welcome! Your profile has been created',
    'Account verification successful'
  ],
  ARRAY[
    'Hi! Your account has been successfully set up and is ready to use.',
    'Welcome aboard! We''ve completed your account setup process.',
    'Great news! Your account verification was successful and you''re all set.'
  ],
  2
),
(
  'System Updates',
  'informational', 
  1,
  ARRAY[
    'System maintenance update',
    'Performance improvements deployed',
    'New security features added'
  ],
  ARRAY[
    'We''ve completed routine system maintenance to improve performance.',
    'Our latest update includes several performance improvements you''ll notice.',
    'We''ve added new security features to better protect your account.'
  ],
  1
),

-- Phase 2 Templates (Engagement Building)
(
  'Weekly Insights',
  'informational',
  2,
  ARRAY[
    'Your weekly summary is ready',
    'This week''s insights and updates',
    'Weekly performance report'
  ],
  ARRAY[
    'Here''s your weekly summary with key insights and metrics.',
    'This week brought some interesting developments we wanted to share.',
    'Your weekly performance report shows positive trends across the board.'
  ],
  3
),
(
  'Feature Announcements',
  'informational',
  2,
  ARRAY[
    'Exciting new feature launched',
    'Product update: New capabilities',
    'Enhanced functionality now available'
  ],
  ARRAY[
    'We''re excited to announce a new feature that will streamline your workflow.',
    'Our latest product update includes several new capabilities you''ve requested.',
    'Enhanced functionality is now available to help you accomplish more.'
  ],
  2
),
(
  'Community Updates',
  'conversational',
  2,
  ARRAY[
    'What''s happening in our community',
    'Community spotlight this week',
    'Updates from fellow users'
  ],
  ARRAY[
    'Here''s what''s been happening in our community this week.',
    'We''re highlighting some amazing work from community members.',
    'Fellow users have been sharing great insights and tips recently.'
  ],
  2
),

-- Phase 3 Templates (Scale Up)
(
  'Personal Check-ins',
  'conversational',
  3,
  ARRAY[
    'How has your experience been?',
    'Quick check-in on your progress',
    'Seeing great results with your account'
  ],
  ARRAY[
    'I wanted to personally check in and see how your experience has been so far.',
    'Your account has been showing great activity and I wanted to see how things are going.',
    'We''ve noticed some excellent progress on your account and wanted to touch base.'
  ],
  3
),
(
  'Success Stories',
  'informational',
  3,
  ARRAY[
    'Success story we thought you''d enjoy',
    'Inspiring results from our community',
    'Case study: Amazing outcomes achieved'
  ],
  ARRAY[
    'I wanted to share a success story that I thought would inspire you.',
    'Here''s an inspiring example of the results our community is achieving.',
    'This case study shows the kind of amazing outcomes that are possible.'
  ],
  2
),
(
  'Optimization Tips',
  'informational',
  3,
  ARRAY[
    'Tips to optimize your results',
    'Advanced strategies that work',
    'Best practices from top performers'
  ],
  ARRAY[
    'Here are some advanced tips to help you optimize your results even further.',
    'I''ve compiled some strategies that our top performers use consistently.',
    'These best practices can help take your results to the next level.'
  ],
  2
),
(
  'Feedback Requests',
  'conversational',
  3,
  ARRAY[
    'Your feedback would be valuable',
    'Quick question about your experience',
    'Help us improve with your input'
  ],
  ARRAY[
    'Your feedback would be incredibly valuable as we continue to improve.',
    'I have a quick question about your experience that would help us tremendously.',
    'Your input could help us make improvements that benefit everyone.'
  ],
  1
),

-- Multi-phase Templates (work across all phases)
(
  'Helpful Resources',
  'informational',
  NULL,
  ARRAY[
    'Resource that might help you',
    'Useful guide for your reference',
    'Documentation update available'
  ],
  ARRAY[
    'I came across a resource that might be helpful for what you''re working on.',
    'Here''s a useful guide that covers some common questions we receive.',
    'We''ve updated our documentation with some clearer explanations.'
  ],
  2
),
(
  'Quick Questions',
  'conversational', 
  NULL,
  ARRAY[
    'Quick question for you',
    'Wondering about your setup',
    'Checking on your configuration'
  ],
  ARRAY[
    'I have a quick question about your current setup if you have a moment.',
    'Just wondering how your configuration is working out for you.',
    'Wanted to check if your current settings are meeting your needs.'
  ],
  1
),
(
  'Industry Updates',
  'informational',
  NULL,
  ARRAY[
    'Industry news you might find interesting',
    'Trends we''re seeing in the market',
    'Update on industry developments'
  ],
  ARRAY[
    'Here''s some industry news that might be relevant to your work.',
    'We''re seeing some interesting trends in the market that might interest you.',
    'Wanted to share an update on recent industry developments.'
  ],
  1
),

-- Holiday/Seasonal Templates
(
  'Seasonal Greetings',
  'conversational',
  NULL,
  ARRAY[
    'Seasonal greetings from our team',
    'Holiday wishes from all of us',
    'Celebrating the season with you'
  ],
  ARRAY[
    'The whole team wanted to send you warm seasonal greetings.',
    'Holiday wishes from all of us here at the company.',
    'We''re celebrating the season and thinking of our valued community.'
  ],
  1
),

-- Educational Content
(
  'Learning Series',
  'informational',
  NULL,
  ARRAY[
    'Learning opportunity for you',
    'Educational content we''ve prepared',
    'Knowledge sharing from our experts'
  ],
  ARRAY[
    'We''ve prepared some educational content that might interest you.',
    'Our experts have put together a learning resource on this topic.',
    'Here''s a knowledge-sharing piece that could be valuable for your work.'
  ],
  2
);

-- Update the initial templates with more variety
UPDATE warmup_templates 
SET content_templates = ARRAY[
  'Hi there! Welcome to our platform. We''re excited to have you on board and can''t wait to see what you accomplish.',
  'Hello! Your account has been successfully created. Here''s a quick overview of how to get started with your first project.',
  'Welcome! We''re here to help you succeed every step of the way. Don''t hesitate to reach out if you need anything.',
  'Great to have you with us! Your account is all set up and ready for you to dive in.',
  'Welcome aboard! We''ve prepared some helpful resources to get you started on the right foot.'
]
WHERE name = 'Welcome Series';

UPDATE warmup_templates
SET content_templates = ARRAY[
  'Here''s a quick tip that could help improve your workflow and save you time.',
  'We wanted to share some updates about what''s new this week and how it might benefit you.',
  'We''ve added a new feature that we think you''ll love based on feedback from users like you.',
  'This week''s update includes several improvements that address common user requests.',
  'Here''s an insight that could help you get better results from your current setup.'
]
WHERE name = 'Tips and Updates';

UPDATE warmup_templates
SET content_templates = ARRAY[
  'Hi! Just checking in to see how everything is going with your account.',
  'Hope you''re having a great week! Any questions about anything we can help with?',
  'Following up on your recent activity - everything looking good on your end?',
  'Wanted to touch base and see if there''s anything we can do to improve your experience.',
  'How are things progressing? We''re here if you need any assistance or have questions.'
]
WHERE name = 'Check-in Messages';

SELECT 'Additional warming templates added successfully!' as result;
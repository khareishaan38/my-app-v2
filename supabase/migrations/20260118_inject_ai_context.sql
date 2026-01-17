-- ===========================================
-- AI CONTEXT INJECTION FOR ALL PROBLEMS
-- Run after: ALTER TABLE problems ADD COLUMN IF NOT EXISTS ai_context TEXT;
-- ===========================================

-- 1. MEDIUM: Onboarding Funnel Drop (c974000c-7fe1-42c2-8a0b-52852af863b6)
-- Simpler context for a foundational problem
UPDATE problems SET ai_context = 'SIMULATION TRUTH (Hidden Root Cause):
The onboarding completion rate dropped because your Email OTP provider (SendGrid) had a regional outage affecting Southeast Asia for 72 hours. Users could not receive verification codes, so they abandoned at step 2 (email verification).

DATA YOU CAN REVEAL WHEN ASKED:
- If user asks about platform segmentation: "Interesting you ask - the drop is actually 90% from users in Southeast Asia. Other regions are flat."
- If user asks about third-party services: "Good thinking. I can check with DevOps. Actually, our SendGrid dashboard shows delivery rates dropped from 99% to 40% for the SG/MY/ID region starting 7 days ago."
- If user asks about error logs: "Frontend logs show a spike in ''OTP timeout'' errors on the email verification screen."
- If user asks about step-level data: "Step 1 completion is normal. Step 2 (email verification) shows a 60% drop-off."

WHAT NOT TO REVEAL:
- Do not say "SendGrid had an outage" directly. Let them discover it by asking the right questions about third-party dependencies.
- Do not mention the SEA region unless they specifically ask about geographic segmentation.

EVALUATION HINTS:
- Good PMs will ask about step-level funnel data before jumping to conclusions.
- Great PMs will consider third-party dependencies, not just internal bugs.
- A common mistake is assuming a UX change or A/B test caused this without checking data.'
WHERE id = 'c974000c-7fe1-42c2-8a0b-52852af863b6';

-- ===========================================

-- 2. MEDIUM: 15% Drop in iOS Checkout Completion (2e6d68f0-8dab-40ca-b33f-914f271e3afe)
UPDATE problems SET ai_context = 'SIMULATION TRUTH (Hidden Root Cause):
A Firebase Remote Config flag called "checkout_new_ui_ios" was accidentally toggled ON by a backend engineer during an unrelated deployment. This flag enables an experimental checkout UI that has a broken "Place Order" button on iOS 17.4+ devices. The button renders off-screen on smaller iPhones (SE, Mini).

DATA YOU CAN REVEAL WHEN ASKED:
- If user asks about iOS version segmentation: "Great question. Let me check... Actually, the drop is entirely on iOS 17.4 and above. Older iOS versions are unaffected."
- If user asks about device types: "Interesting. The crash rate is highest on iPhone SE and iPhone Mini models."
- If user asks about feature flags/remote config: "Hmm, let me check our Remote Config dashboard... I see ''checkout_new_ui_ios'' was toggled ON 26 hours ago. That matches the timeline of the drop."
- If user asks about frontend errors: "Sentry shows warnings about ''button element overflow'' on specific screen sizes, but no crashes."

WHAT NOT TO REVEAL:
- Do not volunteer the flag name. Wait until they ask about feature flags or recent backend changes.
- Do not mention the broken button directly - guide them toward it with clues.

EVALUATION HINTS:
- Good PMs will segment by iOS version, not just assume a blanket iOS issue.
- Great PMs will ask about hidden changes like Feature Flags or Remote Config even when "no deployment" is mentioned.
- Common mistake: Assuming Apple pushed an OS update that broke things, without checking internal tooling.'
WHERE id = '2e6d68f0-8dab-40ca-b33f-914f271e3afe';

-- ===========================================

-- 3. MEDIUM: 8% Decline in DAU despite High Notification Engagement (90326aca-e5a4-4015-8ad8-0adf2d9165bc)
UPDATE problems SET ai_context = 'SIMULATION TRUTH (Hidden Root Cause):
The new AI-driven notification engine optimizes for Click-Through Rate (CTR), not user satisfaction. It sends clickbait-style notifications like "You won''t believe what your friend posted!" that get clicks but lead to irrelevant or low-quality content. Users feel annoyed, clear the notification, and leave the app. Notification fatigue is causing users to disable notifications entirely or uninstall the app.

DATA YOU CAN REVEAL WHEN ASKED:
- If user asks about notification content: "The AI writes more ''urgent'' copy. Example: ''Someone is looking at your profile right now!'' vs the old generic ones."
- If user asks about session length post-notification: "Users who click notifications have an average session length of 12 seconds. Organic users average 3 minutes."
- If user asks about opt-out rates: "Good catch. Notification opt-out requests have increased 300% in the last week."
- If user asks about uninstalls: "Yes, uninstall rate is up 15%, and exit surveys mention ''too many notifications'' as the #1 reason."
- If user asks about the algorithm goal: "The ML team set CTR as the north star metric for the notification engine."

WHAT NOT TO REVEAL:
- Do not say "clickbait" or "notification fatigue" directly. Let them discover the disconnect between CTR and user satisfaction.

EVALUATION HINTS:
- Good PMs will question why high engagement (CTR) would cause DAU decline - a counterintuitive signal.
- Great PMs will ask about session quality metrics, not just click counts.
- Common mistake: Celebrating high CTR without looking at downstream retention impact.'
WHERE id = '90326aca-e5a4-4015-8ad8-0adf2d9165bc';

-- ===========================================

-- 4. HARD: 30% Drop in Organic Search Traffic (87ef4d36-2594-4d96-80bf-c46cb90dee1f)
-- More complex, multi-layered context
UPDATE problems SET ai_context = 'SIMULATION TRUTH (Hidden Root Cause):
This is a MULTI-FACTOR issue:
1. PRIMARY: Google rolled out a "Helpful Content Update" 3 days ago that penalizes thin, AI-generated content. Your SEO team had been using AI to generate product descriptions at scale, and these pages lost 80% of their rankings.
2. SECONDARY: A competitor launched a comprehensive "state of the industry" report that now ranks #1 for your top 5 keywords.
3. TERTIARY: Your DevOps team accidentally blocked /blog/* from Googlebot in robots.txt during a security update 5 days ago.

DATA YOU CAN REVEAL WHEN ASKED:
- If user asks about Google Search Console: "GSC shows a warning: ''Some pages may not meet Helpful Content standards.'' Also, 47 pages under /blog/* are marked as ''Blocked by robots.txt''."
- If user asks about specific keyword rankings: "Your #1 keyword ''B2B workflow automation'' dropped from position 2 to position 19. A new competitor article is now in position 1."
- If user asks about competitor analysis: "Semrush shows your main competitor gained 25% visibility this week. They published a major industry report."
- If user asks about robots.txt: "Ah, let me check... Actually, someone added ''Disallow: /blog/'' to robots.txt 5 days ago. That''s a problem."
- If user asks about content quality: "Many of your product pages were auto-generated by our new AI tool last month. 200+ pages."

WHAT NOT TO REVEAL:
- Do not offer all three factors at once. Let them uncover each layer through investigation.
- Start with the most obvious (robots.txt), then reveal algorithm update, then competitor.

EVALUATION HINTS:
- Good PMs will check crawl errors first (low-hanging fruit).
- Great PMs will consider both technical issues AND market/algorithm shifts.
- Expert PMs will propose diversifying away from SEO dependency long-term.
- Common mistake: Blaming only Google algorithm without checking internal issues like robots.txt.'
WHERE id = '87ef4d36-2594-4d96-80bf-c46cb90dee1f';

-- ===========================================

-- 5. HARD: 10% Drop in Successful Logins (ced5854a-923c-415f-b625-02cd7ce8c68b)
-- Crisis scenario with external dependency
UPDATE problems SET ai_context = 'SIMULATION TRUTH (Hidden Root Cause):
Google OAuth is NOT having a global outage. The issue is specific to YOUR app:
1. Your Google OAuth Client Secret expired 2 hours ago. The secret was created 1 year ago and set to auto-expire.
2. This affects 100% of NEW login sessions but NOT users with existing refresh tokens.
3. The 10% who fail are all users whose refresh tokens expired or who cleared cookies.

DATA YOU CAN REVEAL WHEN ASKED:
- If user asks about global Google status: "Downdetector and Google Workspace Status both show green - no global outage reported."
- If user asks about new vs returning users: "Interesting segmentation. All failing users are ''new sessions.'' Users who were already logged in and have refresh tokens are fine."
- If user asks about API error codes: "Our logs show consistent ''invalid_client'' errors with a 401 status. Not a 500 or 503."
- If user asks about credentials/secrets: "Let me check the GCP console... The OAuth Client Secret shows ''Status: Expired'' as of 2 hours ago."
- If user asks about affected user cohort: "It''s not regional. It''s session-based. Users with active sessions are fine; users who need to re-authenticate are failing."

WHAT NOT TO REVEAL:
- Do not immediately say "credentials expired." Let them discover it by asking about error codes and API logs.
- Misdirect initially toward a Google outage, then help them eliminate that hypothesis.

EVALUATION HINTS:
- Good PMs will verify if this is a global outage before panicking.
- Great PMs will segment by new sessions vs returning users to localize the issue.
- Expert PMs will ask about credential/certificate expiry since there were no internal deployments.
- Common mistake: Assuming it''s Google''s fault without checking internal API key/secret status.'
WHERE id = 'ced5854a-923c-415f-b625-02cd7ce8c68b';

-- ===========================================
-- END OF AI CONTEXT INJECTION
-- ===========================================

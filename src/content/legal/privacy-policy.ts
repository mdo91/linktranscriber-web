import type { LegalPageContent } from './types';
import { siteConfig } from '../config/site';

const email = siteConfig.contactEmail;
const website = siteConfig.websiteUrl;
const domain = siteConfig.websiteDomain;
const privacyUrl = siteConfig.privacyPolicyUrl;

export const privacyPolicyPage: LegalPageContent = {
  filename: 'privacy-policy.html',
  path: '/privacy-policy.html',
  documentTitle: 'Privacy Policy | Damas Technologies',
  mascot: '🔒',
  heading: 'Privacy Policy',
  subtitle: 'How Damas Technologies LLC collects, uses, and protects your information.',
  layout: 'long-form',
  meta: {
    lastUpdated: 'November 2, 2026',
    effectiveDate: 'July 15, 2026',
  },
  sections: [
    {
      title: '1. INTRODUCTION',
      paragraphs: [
        `This Privacy Policy explains how Damas Technologies LLC ("Damas," "we," "us," or "our") collects, uses, stores, and shares information when you use the Damas mobile application for iPhone (the "App") and related services available at <a href="${website}">${domain}</a>.`,
        'Damas helps you turn public social video links and, where available, audio you provide into transcripts, translations, and AI-generated notes and summaries.',
        'By using the App, you agree to this Privacy Policy. If you do not agree, please do not use the App.',
        `<strong>Data controller:</strong><br>Damas Technologies LLC<br>Contact: <a href="mailto:${email}">${email}</a>`,
      ],
    },
    {
      title: '2. SCOPE',
      paragraphs: ['This policy applies to:'],
      list: [
        'The Damas iOS App (bundle ID: com.damas.ai.recording.technologies)',
        'Our API and processing services that power transcription, translation, and summarization',
        `Our website at ${domain} (including this policy)`,
      ],
      subsections: [
        {
          title: 'This policy does not apply to:',
          list: [
            'Third-party platforms whose links you paste (for example, social video hosts)',
            'Apple (App Store, payments, push delivery infrastructure)',
            'OpenAI and Google Gemini (when we use their APIs as subprocessors — see Section 8)',
            'Third-party websites linked from the App',
          ],
        },
      ],
    },
    {
      title: '3. SUMMARY',
      list: [
        '<strong>Accounts:</strong> We do not offer user accounts. We use a device identifier to operate the service.',
        '<strong>What you provide:</strong> Public video post links, language choices, transcript text (for summaries), and optionally audio for transcription.',
        '<strong>AI processing:</strong> Content is processed on our servers and may be processed by OpenAI and Google Gemini after you give explicit in-app consent.',
        '<strong>Local storage:</strong> Notes, transcripts, and recordings are stored on your device unless you delete them.',
        '<strong>Payments:</strong> Subscriptions are handled by Apple; we do not receive your payment card details.',
        '<strong>Advertising / tracking:</strong> We do not use third-party advertising or cross-app tracking SDKs in the current App.',
        '<strong>Children:</strong> The App is not directed to children under 13.',
      ],
    },
    {
      title: '4. INFORMATION WE COLLECT',
      subsections: [
        {
          title: '4.1 Information you provide',
          list: [
            '<strong>Video post links:</strong> Public HTTPS links you paste (validated for supported social video hosts).',
            '<strong>Language preferences:</strong> Target language for translation jobs.',
            '<strong>Transcript and note content:</strong> Text generated or edited in the App, including content you submit for AI summarization.',
            '<strong>Audio recordings:</strong> If you use voice recording features, audio captured via the microphone and saved on your device; audio may be uploaded for server-side transcription when that feature is enabled.',
            '<strong>Onboarding choices (optional):</strong> Occupation and interest tags you select during onboarding. These are stored on your device only and are not sent to our servers in the current App version.',
            '<strong>Clipboard:</strong> If you use "Paste," the App reads a URL from your clipboard only when you initiate that action. You may copy note text to the clipboard from the editor.',
          ],
        },
        {
          title: '4.2 Information collected automatically',
          list: [
            '<strong>Device identifier (device_id):</strong> A random UUID generated on first launch, stored in the iOS Keychain, and sent with job requests so we can process jobs, enforce fair-use limits, and correlate notifications. It is not your Apple ID.',
            '<strong>Push notification token:</strong> If you allow notifications, we may send your device\'s APNs token (as a hexadecimal string) when starting a job so we can notify you when processing completes.',
            '<strong>Request metadata:</strong> Such as request timestamps, job IDs, job status, error codes, and a per-request X-Request-ID for troubleshooting.',
            '<strong>Subscription status:</strong> Whether you have an active in-app subscription, determined via Apple StoreKit on your device.',
            '<strong>App version and device type:</strong> May be included in server logs for support and security.',
          ],
        },
        {
          title: '4.3 Information we do not collect',
          paragraphs: ['Based on the current App, we do not intentionally collect:'],
          list: [
            'Your name, email, or phone number (unless you contact us voluntarily)',
            'Precise location, contacts, photos, or browsing history outside the App',
            'Apple ID or advertising identifiers (IDFA) for advertising',
            'Data through third-party analytics or crash-reporting SDKs (none are integrated in the current iOS App)',
          ],
        },
      ],
    },
    {
      title: '5. HOW WE USE INFORMATION',
      paragraphs: ['We use information to:'],
      orderedList: [
        'Provide the service (transcribe public video links, translate content, generate AI summaries, and deliver results in the App)',
        'Run async jobs (queue, process, poll, and complete long-running transcription and translation tasks)',
        'Send notifications when a job finishes (if you opted in to push notifications)',
        'Enforce fair-use and abuse-prevention limits per device (for example, daily job counts and processing minutes)',
        'Improve reliability, debug errors, prevent fraud, and maintain security',
        'Comply with applicable law',
      ],
      subsections: [
        {
          title: '',
          paragraphs: ['We do not sell your personal information.'],
        },
      ],
    },
    {
      title: '6. LEGAL BASES FOR PROCESSING (EEA / UK USERS)',
      paragraphs: ['Where GDPR or UK GDPR applies, we rely on:'],
      list: [
        '<strong>Providing transcription, translation, and summaries:</strong> Contract (necessary to deliver the service you request)',
        '<strong>AI processing via OpenAI and Google Gemini:</strong> Consent (you agree in the in-app AI consent screen before data is sent)',
        '<strong>Push notifications:</strong> Consent (iOS system permission)',
        '<strong>Device identifier and usage limits:</strong> Legitimate interests (operate, secure, and fairly allocate the service)',
        '<strong>Subscription via Apple:</strong> Contract',
      ],
      subsections: [
        {
          title: '',
          paragraphs: [
            'You may withdraw AI consent at any time in the App (Settings → Privacy → Revoke AI consent). Withdrawal stops new AI processing requests but does not affect processing already performed.',
          ],
        },
      ],
    },
    {
      title: '7. AI PROCESSING AND YOUR CONSENT',
      paragraphs: [
        'Before your data is sent for AI-powered transcription, translation, or Insight Studio outputs, the App asks for explicit permission.',
        'With your permission, our servers, OpenAI and Google Gemini process the video links, transcripts, selected language and optional context you submit to create the output you request. Subscribing or restoring purchases does not itself grant AI processing permission.',
      ],
      list: [
        '<strong>What is sent:</strong> video links, transcript text, selected language, and optional context you provide for the requested output (as applicable)',
        '<strong>Who processes it:</strong> our servers and AI providers, including OpenAI and Google Gemini',
        '<strong>What we do not do:</strong> we do not host or redistribute third-party videos; we display transcripts and AI-generated notes',
      ],
      subsections: [
        {
          title: '',
          paragraphs: [
            'You may decline consent and still browse the App without starting new AI jobs. You may revoke consent later in Privacy settings. Revoking consent stops new server AI processing; content already saved on your device remains until you delete it.',
            'OpenAI\'s practices are governed by its own policies: <a href="https://openai.com/policies/privacy-policy">https://openai.com/policies/privacy-policy</a>',
            'Google\'s privacy policy: <a href="https://policies.google.com/privacy">https://policies.google.com/privacy</a>',
          ],
        },
      ],
    },
    {
      title: '8. HOW WE SHARE INFORMATION',
      subsections: [
        {
          title: '8.1 Service providers (processors)',
          paragraphs: [
            '<strong>Cloud hosting (for example, Google Cloud Run)</strong><br>Purpose: API, job orchestration, storage<br>Data shared: Links, audio, text, device ID, tokens, logs',
            '<strong>OpenAI</strong><br>Purpose: Transcription and AI note generation<br>Data shared: Content you submit for processing (after consent)',
            '<strong>Google Gemini</strong><br>Purpose: Transcription of supported video links<br>Data shared: Video links and processing context you submit (after consent)',
            '<strong>Apple</strong><br>Purpose: App distribution, payments, push infrastructure<br>Data shared: Subscription transactions; push delivery metadata',
            'We require processors to handle data only on our instructions and subject to appropriate safeguards.',
          ],
        },
        {
          title: '8.2 Legal and safety',
          paragraphs: [
            'We may disclose information if we believe it is necessary to comply with law, regulation, legal process, or governmental request; protect the rights, property, or safety of Damas, our users, or others; or detect and prevent fraud, abuse, or security issues.',
          ],
        },
        {
          title: '8.3 Business transfers',
          paragraphs: [
            'If we are involved in a merger, acquisition, or asset sale, your information may transfer as part of that transaction. We will notify you of any material change in ownership or use.',
          ],
        },
        {
          title: '8.4 We do not sell personal information',
          paragraphs: [
            'We do not sell or share personal information for cross-context behavioral advertising.',
          ],
        },
      ],
    },
    {
      title: '9. INTERNATIONAL DATA TRANSFERS',
      paragraphs: [
        'Our servers and subprocessors may process data in the United States and other countries where they or we operate. These countries may have different data protection laws than your country.',
        'Where required, we implement appropriate safeguards (such as standard contractual clauses) for transfers from the EEA/UK.',
      ],
    },
    {
      title: '10. DATA STORAGE AND RETENTION',
      subsections: [
        {
          title: '10.1 On your device',
          paragraphs: [
            'The App stores recordings, transcripts, summaries, and notes locally using SwiftData and the App\'s document storage. You can delete individual recordings from the App; deletion removes associated local files and note data.',
            'Preferences (for example, AI consent, onboarding completion, subscription cache) may be stored in UserDefaults. Your device_id is stored in the iOS Keychain.',
          ],
        },
        {
          title: '10.2 On our servers',
          paragraphs: [
            'When you submit a job, we and our providers may temporarily or persistently store job identifiers and status, source URLs and derived text (transcripts, translations, summaries), device identifier and optional push token, and usage metadata (for example, processing duration for fair-use limits).',
            'Server-side data is kept only as long as reasonably necessary to provide the service, enforce limits, resolve disputes, meet legal obligations, and maintain security. Unless a longer period is required by law, we aim to delete or anonymize operational logs within 90 days and job-related content within 30–90 days after completion, subject to backup cycles.',
            `We do not offer a self-service "delete all server data" button in the current App. To request deletion of server-side data associated with your device identifier, contact <a href="mailto:${email}">${email}</a>.`,
          ],
        },
        {
          title: '10.3 Apple',
          paragraphs: [
            'Subscription and payment records are retained by Apple under Apple\'s policies.',
          ],
        },
      ],
    },
    {
      title: '11. THIRD-PARTY CONTENT AND PLATFORMS',
      subsections: [
        {
          title: '11.1 Social video links',
          paragraphs: [
            'The App is designed to process public video post links that you choose to submit. Damas Technologies LLC is not affiliated with, endorsed by, or sponsored by X Corp. or any social platform. Platform names are used only to describe compatibility.',
            'You are responsible for ensuring you have the right to use and process content you submit. Private, restricted, or non-public links may fail or be unsupported.',
          ],
        },
        {
          title: '11.2 No redistribution of third-party video',
          paragraphs: [
            'Damas does not host or redistribute third-party videos in the App. We process audio and text derived from links you provide and show transcripts and AI-generated notes to you.',
          ],
        },
      ],
    },
    {
      title: '12. SUBSCRIPTIONS AND PAYMENTS',
      paragraphs: [
        'Damas offers optional premium subscriptions through Apple\'s In-App Purchase system (StoreKit).',
      ],
      list: [
        'Payment processing is performed entirely by Apple.',
        'We receive subscription entitlement status, not your full payment card details.',
        'Manage, cancel, or request refunds through your Apple ID → Subscriptions settings or Apple Support.',
        'Free trials and pricing are shown in the App and App Store at purchase time.',
      ],
    },
    {
      title: '13. PUSH NOTIFICATIONS',
      paragraphs: [
        'If you enable notifications, we may send alerts when a transcription or translation job completes. You can disable notifications anytime in iOS Settings → Damas → Notifications.',
      ],
    },
    {
      title: '14. PERMISSIONS',
      paragraphs: [
        '<strong>Microphone:</strong> Only if you use in-app voice recording; to capture audio notes for transcription.',
        '<strong>Notifications:</strong> To notify you when long-running jobs complete.',
        'The App does not request access to your photo library, contacts, or location for core features.',
      ],
    },
    {
      title: '15. SECURITY',
      paragraphs: [
        'We use reasonable technical and organizational measures to protect information, including HTTPS for data in transit, Keychain storage for device identifiers, access controls on production infrastructure, and transaction verification for App Store purchases.',
        'No method of transmission or storage is 100% secure. We cannot guarantee absolute security.',
      ],
    },
    {
      title: '16. YOUR RIGHTS AND CHOICES',
      paragraphs: [
        'Depending on your location, you may have rights to access, correct, delete, restrict, or object to certain processing; withdraw consent; request data portability; and lodge a complaint with a supervisory authority (EEA/UK).',
      ],
      subsections: [
        {
          title: 'In the App today, you can:',
          list: [
            'Revoke AI consent (Privacy settings)',
            'Delete local recordings and notes',
            'Disable push notifications (iOS Settings)',
            'Cancel subscriptions (Apple)',
          ],
        },
        {
          title: '',
          paragraphs: [
            `For other requests, email <a href="mailto:${email}">${email}</a>. We may need to verify your request and your device identifier.`,
            '<strong>California residents (CCPA/CPRA):</strong> We do not sell personal information. California residents may request access, deletion, and correction as described above. We will not discriminate against you for exercising privacy rights.',
          ],
        },
      ],
    },
    {
      title: '17. CHILDREN\'S PRIVACY',
      paragraphs: [
        `Damas is not directed to children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children. If you believe a child has provided us information, contact <a href="mailto:${email}">${email}</a> and we will take steps to delete it.`,
      ],
    },
    {
      title: '18. CHANGES TO THIS POLICY',
      paragraphs: [
        `We may update this Privacy Policy from time to time. We will post the revised policy at <a href="${privacyUrl}">${privacyUrl}</a> and update the "Last updated" date. If changes are material, we may provide additional notice in the App or require renewed consent where required by law.`,
      ],
    },
    {
      title: '19. CONTACT US',
      paragraphs: [
        'Damas Technologies LLC',
        `Email: <a href="mailto:${email}">${email}</a>`,
        `Website: <a href="${website}">${website}</a>`,
        'Questions about this Privacy Policy or our data practices may be sent to the email above.',
      ],
    },
    {
      title: 'APPENDIX A — DATA INVENTORY',
      table: {
        headers: [
          'Data type',
          'Source',
          'Stored locally',
          'Sent to our servers',
          'Sent to OpenAI',
          'Purpose',
        ],
        rows: [
          [
            'Video post URL',
            'You paste',
            'Yes',
            'Yes',
            'Possibly',
            'Transcribe / translate',
          ],
          [
            'Target language',
            'You select',
            'Yes',
            'Yes',
            'Possibly',
            'Translation',
          ],
          [
            'Transcript text',
            'Generated / edited',
            'Yes',
            'Yes (summarize)',
            'Yes (summarize)',
            'AI summaries',
          ],
          [
            'Audio file',
            'Microphone (if enabled)',
            'Yes',
            'Yes',
            'Possibly',
            'Transcription',
          ],
          [
            'AI summary / notes',
            'Generated',
            'Yes',
            'No',
            'No',
            'Display / edit',
          ],
          [
            'Device ID (UUID)',
            'Auto-generated',
            'Keychain',
            'Yes',
            'No',
            'Jobs, limits, support',
          ],
          [
            'Push token',
            'iOS (if allowed)',
            'Memory only',
            'Yes (optional)',
            'No',
            'Job completion alerts',
          ],
          [
            'Subscription status',
            'Apple StoreKit',
            'Cached',
            'No',
            'No',
            'Access control',
          ],
          [
            'Onboarding profile',
            'You select',
            'UserDefaults',
            'No',
            'No',
            'Personalization (local only)',
          ],
        ],
      },
      paragraphs: [
        '<strong>Note:</strong> Subscription verification is performed on-device via StoreKit. If server-side receipt verification is added in the future, this policy will be updated accordingly.',
        '<strong>END OF PRIVACY POLICY</strong>',
      ],
    },
  ],
};

// B5 — the policy set and the text of each policy.
//
// THE SET (B5.1). Adding a policy is one entry here plus the sections below.
// Nothing else needs touching: the index lists whatever is in this array, and
// /policies/:slug resolves against it.
//
// `group` is what the index groups by. Four policies do not strictly need
// grouping, but the set is expected to grow (an accessibility statement, a
// complaints policy, a modern slavery statement have all been raised), and
// grouping added later to a list people have learned is a worse change than
// grouping present from the start.
export const POLICIES = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    group: 'Your information',
    summary: 'What personal information we collect, how we use it, and the choices you have.',
  },
  {
    // Sits with Privacy rather than under "Using this site": a visitor looking
    // for what we track looks under their information, and the two documents
    // cross-reference each other throughout.
    slug: 'cookies',
    title: 'Cookie Policy',
    group: 'Your information',
    summary:
      'Every cookie and tracking technology we use, what each one does, and how to control them.',
  },
  {
    slug: 'terms',
    title: 'Website Terms of Use',
    group: 'Using this site',
    summary: 'The terms that govern your use of this website, our courses, and anything you post.',
  },
  {
    slug: 'conflicts-of-interest',
    title: 'Conflict of Interest Policy',
    group: 'How we work',
    summary:
      'How we identify, declare and manage conflicts across advisory and probity engagements.',
  },
];

export const POLICY_BY_SLUG = Object.fromEntries(POLICIES.map((p) => [p.slug, p]));

// Below the index page shows a search box. Under this many policies it does not:
// a filter over four items is a control that costs more attention than it saves.
export const SEARCH_THRESHOLD = 5;

/* THE POLICY TEXT.

   This was PLACEHOLDER_SECTIONS: scaffolding written to give the template
   something of realistic shape to be designed against, carrying a comment
   saying in as many words that it was not policy. It is policy now. These are
   the four approved documents, verbatim, and the name changed with the content
   because a variable called PLACEHOLDER holding the Privacy Policy is a trap
   for whoever reads this file next.

   Source of truth is docs/GovProcurement_*.md. The conversion from those
   documents into the shape below was done mechanically rather than retyped —
   a thousand lines of legal prose transcribed by hand is a thousand chances to
   drop a "not". When a document is revised, revise the markdown and convert
   again; do not edit a clause here and leave the two disagreeing.

   A section body is a list of blocks:

     'a string'                     a paragraph
     { lead, text }                 a paragraph opening with a bold lead-in
     { sub }                        a sub-heading inside the section
     { list: [...] }                a bulleted list
     { table: { head, rows } }      a table

   The CMS still wins. Publish a page under the matching slug and its sections
   replace what is here — see PolicyDocument.jsx. */
export const POLICY_SECTIONS = {
  'privacy': [
    {
      heading: 'Who we are',
      body: [
        'Gov Procurement Pty Ltd (ABN 60 700 511 002), trading as Government Procurement, operates the website govprocurement.com.au and its associated learning management system (LMS). In this policy, "we", "us" and "our" refers to Gov Procurement Pty Ltd.',
      ],
    },
    {
      heading: 'Who this policy applies to',
      body: [
        'This policy applies to anyone who:',
        {
          list: [
            'visits or uses govprocurement.com.au;',
            'enrols in a course or accesses our LMS;',
            'submits a question through our Q&A feature;',
            'applies for or holds a listing in our Bid Writer Directory; or',
            'contacts us directly by email, phone, or through our website.',
          ],
        },
        'Our platform is intended for working professionals. We do not knowingly collect personal information from individuals under 18 years of age. If we become aware that we hold personal information about a person under 18, we will delete it.',
      ],
    },
    {
      heading: 'What personal information we collect',
      body: [
        {
          sub: 'Website visitors',
        },
        'When you browse our website, we may automatically collect:',
        {
          list: [
            'IP address, device type and browser type;',
            'pages visited, time on site, and scroll or click behaviour;',
            'referring URL.',
          ],
        },
        'This is collected using Google Analytics 4, Microsoft Clarity, and Google Tag Manager, and, where you consent, using advertising and social media tracking technologies described in our Cookie Policy.',
        {
          lead: 'Microsoft Clarity',
          text: 'is a session recording and heatmap tool. In addition to standard analytics, it records mouse movement, clicks, scrolling, and page interactions to produce a replay of your visit and aggregated heatmaps. Clarity is configured to mask text entered into form fields.',
        },
        'Non-essential cookies and tracking scripts are not loaded until you consent through our cookie notice. Full details of every cookie and tracking technology we use are set out in our Cookie Policy.',
        {
          sub: 'Course enrolments and LMS accounts',
        },
        'Our LMS is software we have built ourselves and host on Amazon Web Services in the Asia Pacific (Sydney) region. When you create an account or enrol in a course, we collect:',
        {
          list: [
            'full name;',
            'email address;',
            'employer or organisation name (optional);',
            'account credentials, stored in encrypted form;',
            'course enrolment, progress, and completion records;',
            'assessment attempts and results;',
            'certificate records;',
            'login timestamps and IP address, for account security.',
          ],
        },
        {
          sub: 'Payments',
        },
        'Payment card processing is handled by Stripe. We do not collect or store your payment card details. We receive from Stripe a transaction record, which includes your name, email address, the amount paid, and the last four digits of the card.',
        {
          sub: 'Consultation requests',
        },
        'When you submit a Request a Consultation form, we collect your full name, email address, contact number, organisation, role, reason for contacting us, and your message.',
        {
          sub: 'Q&A submissions',
        },
        'When you submit a question through our Q&A feature, we collect your name, email address, and the question itself.',
        {
          lead: 'What we publish:',
          text: 'only the question and our answer. We do not publish your name, your email address, or any other identifying detail. Before publication we edit the question as necessary to remove any detail capable of identifying you, your employer, your client, or the specific procurement you are referring to.',
        },
        {
          lead: 'What we retain:',
          text: 'your name and email address are retained in our form records for 3 years from the date of submission. We keep them so that we can verify a removal request, respond to a complaint, and administer the feature. They are not published, not used for marketing unless you have separately opted in, and not disclosed to any third party. After 3 years they are deleted.',
        },
        'You may request removal of a published question at any time by contacting us.',
        {
          sub: 'Bid Writer Directory listings',
        },
        'If you apply for or hold a listing in our Bid Writer Directory, we collect your organisation name, ABN, contact name, email address, phone number, website address, service description, logo or images, and billing details. Listing content that you supply is published publicly on our website. You may request amendment or removal of your listing at any time.',
        {
          sub: 'Job applications',
        },
        'If you apply for a role with us, your application is sent to us by email. We collect the information contained in your application, which may include your name, contact details, employment history, qualifications, and any other information you choose to provide.',
        {
          sub: 'Contact, enquiries, and bookings',
        },
        'If you contact us directly by email, phone, live chat, or through an online booking tool, we collect the information you provide, including your name, email address, phone number, and the content of your message or the details of your booking.',
        {
          sub: 'Sourcing Advisor and free tools',
        },
        'The Sourcing Advisor, AI Prompt Library, Templates, Tender Websites, Jurisdictional Links, and How to Engage Us pages do not require an account and do not collect personal information beyond the website analytics described above.',
        'Please do not enter confidential, commercially sensitive, or procurement-identifying information into the Sourcing Advisor. It is a general rules-based tool and is not a channel for advice on a specific procurement.',
      ],
    },
    {
      heading: 'Why we collect your information',
      body: [
        'We collect personal information to:',
        {
          list: [
            'create, secure, and manage your account;',
            'process course enrolments and track your progress;',
            'issue certificates of completion;',
            'send you transactional emails, for example enrolment confirmations and receipts;',
            'publish and respond to Q&A submissions in anonymised form, and administer removal requests;',
            'create, publish, and administer Bid Writer Directory listings;',
            'respond to enquiries, consultation requests, and bookings;',
            'assess job applications;',
            'send you marketing communications where you have opted in;',
            'measure the performance of our advertising, where you have consented to advertising cookies;',
            'improve our website and course content;',
            'comply with our legal obligations.',
          ],
        },
      ],
    },
    {
      heading: 'How we use your information for marketing',
      body: [
        'We may send you updates about new courses, articles, or services we think are relevant to your work. You can unsubscribe at any time by clicking the unsubscribe link in any email or by contacting us at mkheir@govprocurement.com.au.',
        'Where you have consented to advertising cookies, we may use advertising platforms to show you our content on other websites and social media platforms, and to measure how our advertising performs. You can withdraw that consent at any time through the Cookie preferences link in our website footer.',
        {
          lead: 'We do not sell your personal information to any third party.',
          text: '',
        },
        'We do not disclose your personal information to government bodies, agencies, or panel administrators for any commercial, marketing, referral, or recruitment purpose. We may disclose personal information where we are required or authorised to do so by law, including in response to a court order, a lawful request from a regulator or law enforcement agency, or where disclosure is necessary to report suspected serious misconduct to an integrity agency.',
      ],
    },
    {
      heading: 'Third parties we share information with',
      body: [
        'We use the following third-party services, which may process your personal information on our behalf or in connection with our website:',
        {
          table: {
            head: [
              'Service',
              'Purpose',
              'Where data is stored',
            ],
            rows: [
              [
                'Amazon Web Services',
                'LMS hosting, course and account data',
                'Australia (Sydney region)',
              ],
              [
                'Kinsta',
                'Website hosting',
                'Australia (Sydney region)',
              ],
              [
                'Amazon Simple Email Service',
                'Marketing email delivery',
                'Australia (Sydney region)',
              ],
              [
                'Postmark',
                'Transactional and account email delivery',
                'United States',
              ],
              [
                'Stripe',
                'Payment processing',
                'United States and Ireland',
              ],
              [
                'Google Analytics 4',
                'Website analytics',
                'United States',
              ],
              [
                'Microsoft Clarity',
                'Session recording and heatmaps',
                'United States',
              ],
              [
                'Google Tag Manager',
                'Tag management',
                'United States',
              ],
              [
                'Google Workspace',
                'Business email and document storage',
                'United States',
              ],
              [
                'LinkedIn',
                'Advertising measurement and audience building',
                'United States and Ireland',
              ],
              [
                'Meta Platforms',
                'Advertising measurement and audience building',
                'United States and Ireland',
              ],
              [
                'YouTube and Vimeo',
                'Embedded video playback',
                'United States',
              ],
              [
                'Online booking provider',
                'Scheduling consultations',
                'United States',
              ],
              [
                'Live chat provider',
                'Responding to website enquiries',
                'United States',
              ],
            ],
          },
        },
        'These providers are contractually required to handle your information securely and only for the purposes we specify.',
      ],
    },
    {
      heading: 'Overseas disclosure',
      body: [
        'Your course, account, and assessment data is stored in Australia. Several of the providers listed above store or process data on servers outside Australia, including in the United States and Ireland. By providing your personal information to us, you consent to this disclosure.',
        'Where personal information is disclosed overseas, we take reasonable steps under Australian Privacy Principle 8 to ensure the recipient handles it in a manner consistent with the Australian Privacy Principles. You should be aware that overseas recipients may be subject to laws that differ from Australian privacy law, and that in some cases you may not be able to seek redress under the Privacy Act 1988 (Cth) in relation to an overseas recipient.',
      ],
    },
    {
      heading: 'Legal basis and applicable law',
      body: [
        'We comply with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). Where applicable, we also comply with relevant state and territory privacy legislation.',
        'Where you access our website from the European Union or the United Kingdom, we handle your personal information in a manner consistent with the General Data Protection Regulation and the UK GDPR.',
      ],
    },
    {
      heading: 'How we protect your information',
      body: [
        'We take reasonable steps to protect personal information from misuse, interference, loss, and unauthorised access. Measures include encrypted data transmission (HTTPS), encryption of stored credentials, access controls, multi-factor authentication on administrative accounts, regular backups, activity logging, and the use of reputable third-party infrastructure.',
      ],
    },
    {
      heading: 'How long we keep your information',
      body: [
        {
          table: {
            head: [
              'Information type',
              'Retention period',
            ],
            rows: [
              [
                'Account and LMS records',
                'While your account is active, then 12 months after closure',
              ],
              [
                'Course completion and certificate records',
                '7 years from completion',
              ],
              [
                'Payment and transaction records',
                '7 years, as required under the Corporations Act 2001 (Cth) and by the Australian Taxation Office',
              ],
              [
                'Consultation, enquiry, chat, and booking records',
                '3 years from last contact',
              ],
              [
                'Q&A submitter name and email',
                '3 years from submission',
              ],
              [
                'Published Q&A question and answer',
                'Indefinitely, in anonymised form, unless you request removal',
              ],
              [
                'Bid Writer Directory listings',
                'While the listing is active, then 12 months after expiry',
              ],
              [
                'Unsuccessful job applications',
                '12 months from the date of application',
              ],
              [
                'Marketing subscriber records',
                'Until you unsubscribe, then a suppression record only',
              ],
              [
                'Website analytics data',
                '14 months',
              ],
            ],
          },
        },
        'Where a record forms part of a conflict of interest declaration or register entry, it is retained for 7 years in accordance with our Conflict of Interest Policy.',
        'Where a dispute, audit, investigation, or regulatory enquiry is on foot or reasonably anticipated, relevant records are preserved and are not destroyed regardless of any retention period having expired.',
        'Once personal information is no longer needed for any purpose for which it may lawfully be used, and we are not required by law to retain it, we destroy or de-identify it.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'Under the Australian Privacy Principles, you have the right to:',
        {
          list: [
            'access the personal information we hold about you;',
            'request correction of inaccurate, out of date, or incomplete information;',
            'request deletion of your information, subject to our legal obligations;',
            'request that we no longer use or disclose your information for direct marketing;',
            'opt out of marketing communications at any time;',
            'withdraw your consent to non-essential cookies at any time.',
          ],
        },
        'To exercise any of these rights, contact us at mkheir@govprocurement.com.au. We will respond within 30 days. We do not charge a fee for making a request. If a request requires substantial work, we may charge a reasonable cost-based fee for providing access, and we will tell you the amount before proceeding.',
        'If we refuse a request, we will tell you in writing why we refused and how you may complain.',
      ],
    },
    {
      heading: 'Complaints',
      body: [
        'If you believe we have mishandled your personal information, please contact us first at mkheir@govprocurement.com.au. We will acknowledge your complaint within 5 business days and provide a substantive response within 30 days.',
        'If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC):',
        {
          list: [
            'Website: www.oaic.gov.au',
            'Phone: 1300 363 992',
            'Email: enquiries@oaic.gov.au',
          ],
        },
      ],
    },
    {
      heading: 'Data breaches',
      body: [
        'We maintain a data breach response plan. Where a data breach occurs that is likely to result in serious harm to any individual whose personal information is involved, we will notify the affected individuals and the OAIC in accordance with the Notifiable Data Breaches scheme under Part IIIC of the Privacy Act 1988 (Cth).',
      ],
    },
    {
      heading: 'Third-party websites',
      body: [
        'Our website links to external sites including government portals, tender platforms, and third-party organisations. We do not control those websites and this policy does not apply to them. We encourage you to review the privacy policy of any third-party site before providing personal information.',
      ],
    },
    {
      heading: 'Relationship to our other policies',
      body: [
        'This Privacy Policy should be read together with:',
        {
          list: [
            'our Website Terms of Use, which govern your access to and use of our website, courses, tools, directory, and content;',
            'our Cookie Policy, which sets out in detail every cookie and tracking technology we use; and',
            'our Conflict of Interest Policy, which governs how we manage integrity risk, including the handling of confidential information.',
          ],
        },
        'All are available at govprocurement.com.au.',
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [
        'We may update this policy from time to time. The version number and effective date at the top of this page reflect the current version. Where we make a change that materially affects how we handle your personal information, we will notify account holders by email before the change takes effect.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        {
          lines: [
            'Gov Procurement Pty Ltd',
            'Trading as Government Procurement',
            'mkheir@govprocurement.com.au',
            'Phone: as published on govprocurement.com.au',
            'govprocurement.com.au',
          ],
        },
      ],
    },
  ],
  'terms': [
    {
      heading: '1. About these Terms',
      body: [
        'These Terms of Use ("Terms") govern your access to and use of the website govprocurement.com.au, including all pages, tools, content, courses, templates, prompts, directory listings, and features available on or through the site ("Site"), operated by Gov Procurement Pty Ltd (ABN 60 700 511 002), trading as Government Procurement ("we", "us", "our").',
        'By accessing or using the Site, you agree to be bound by these Terms. If you do not agree, you must stop using the Site immediately.',
        {
          lead: 'Contracting entity:',
          text: 'Your contract is with Gov Procurement Pty Ltd (ABN 60 700 511 002) unless we identify a different entity to you at the point of sale. Where we do, we will identify that entity, its jurisdiction, and the applicable currency and tax treatment clearly before you complete your purchase, and these Terms apply to that purchase with the necessary changes.',
        },
        {
          lead: 'Scope of these Terms:',
          text: 'These Terms govern your use of the Site and your purchase of courses, subscriptions, and directory listings through the Site. They do not govern consulting, advisory, probity, or other professional services we provide under a separate engagement. Those services are governed by the proposal, scope of services, engagement agreement, and disclosure statement issued for that engagement.',
        },
        {
          lead: 'Changes to these Terms:',
          text: 'We may update these Terms from time to time.',
        },
        {
          list: [
            'Minor or administrative changes, such as clarifications, formatting, or updated contact details, take effect when published on the Site.',
            'Material changes take effect 30 days after we publish the updated Terms on the Site. If you hold an active paid course enrolment or subscription at that time and a material change is detrimental to you, you may terminate your enrolment or subscription within that 30-day period and receive a pro-rata refund of any unused prepaid amount.',
          ],
        },
        'Continued use of the Site after a change takes effect constitutes acceptance of the revised Terms.',
        'These Terms are governed by the laws of New South Wales, Australia, and you submit to the non-exclusive jurisdiction of the courts of New South Wales.',
      ],
    },
    {
      heading: '2. Who may use this Site',
      body: [
        'This Site is intended for use by procurement professionals, government officials, and organisations operating in Australia. By using this Site, you represent that:',
        {
          list: [
            'you are 18 years of age or older;',
            'you are accessing the Site for professional or business purposes; and',
            'your use complies with all applicable Australian laws and regulations.',
          ],
        },
        'We may restrict or terminate access for any user who does not meet these criteria, in accordance with clause 15.',
      ],
    },
    {
      heading: '3. Intellectual property',
      body: [
        'All content and functionality on this Site, including text, articles, course materials, assessment questions, certificates, templates, AI prompt libraries, tools, frameworks, the Sourcing Advisor, graphics, logos, and the selection and arrangement of all of the foregoing ("Site Content"), is the property of Gov Procurement Pty Ltd or its licensors and is protected under the Copyright Act 1968 (Cth) and applicable Australian and international intellectual property laws.',
        'Site Content does not include content you submit to the Site, or content submitted by a directory listing holder, which is dealt with in clauses 8 and 9.',
        'We grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the Site Content for your own internal professional purposes, subject to these Terms.',
        {
          lead: 'Subject to clause 4 and to the fair dealing provisions below',
          text: ', and except as expressly permitted under these Terms or by law, you must not:',
        },
        {
          list: [
            'copy, reproduce, modify, adapt, publish, distribute, or transmit any Site Content;',
            'create derivative works from any Site Content;',
            'remove or alter any copyright, trademark, attribution, or other proprietary notice on any Site Content;',
            'use any Site Content to develop, train, inform, or improve any software, tool, model, platform, algorithm, or artificial intelligence system; or',
            'reproduce or use any Site Content as source material in any product or service that competes, or is intended to compete, with any product or service offered by us.',
          ],
        },
        {
          lead: 'Fair dealing:',
          text: 'Nothing in these Terms restricts any use permitted under the fair dealing provisions of the Copyright Act 1968 (Cth), including use for research, study, criticism, review, parody, satire, or the reporting of news.',
        },
        {
          lead: 'Templates and AI prompts:',
          text: 'Templates and prompts made available for download on this Site remain the intellectual property of Gov Procurement Pty Ltd. You may use and adapt them in the course of your own work, including in work you perform for your employer or your clients, without seeking our permission, provided that you retain any attribution markings, logos, or source references included in or on the files. You must not represent them as your own original work, sell or licence them, distribute them as a standalone product, or reproduce them as source material in a competing product or service.',
        },
        'All rights not expressly granted under these Terms are reserved.',
      ],
    },
    {
      heading: '4. Attribution and permission to use our material',
      body: [
        'We are glad for our work to be useful to the profession. We ask only that credit is given where it is due, in the same way you would cite an author when quoting a book.',
        {
          lead: 'When attribution alone is sufficient:',
          text: 'If you quote, cite, or refer to our published articles, insights, or research in a report, presentation, submission, tender, training session, academic work, or professional publication, you may do so without seeking our permission, provided that you:',
        },
        {
          list: [
            'attribute the material clearly to Government Procurement (Gov Procurement Pty Ltd);',
            'include a link or reference to govprocurement.com.au or to the specific page; and',
            'do not alter the meaning of the material or present it as your own work.',
          ],
        },
        {
          lead: 'When our written permission is required:',
          text: 'You must obtain our prior written permission before you:',
        },
        {
          list: [
            'reproduce a substantial part of any article, course material, or template in any publication, product, or service;',
            'distribute, sell, or licence any Site Content to a third party;',
            'incorporate any Site Content into any product, service, database, model, or platform; or',
            'use our name, logo, or trademarks in any advertising, promotional material, or public statement, or in any way that implies endorsement by or affiliation with us.',
          ],
        },
        {
          lead: 'Templates and prompts:',
          text: 'The permission requirement above does not apply to your use of downloadable templates and prompts in the course of your own work. Those files are governed by clause 3.',
        },
        'Permission requests can be sent to mkheir@govprocurement.com.au. We are generally reasonable about this and respond promptly.',
        'Nothing in this clause limits your rights under the fair dealing provisions of the Copyright Act 1968 (Cth).',
      ],
    },
    {
      heading: '5. Acceptable use',
      body: [
        'You agree to use this Site only for lawful purposes and in a manner consistent with these Terms. You must not:',
        {
          list: [
            'systematically extract, bulk copy, scrape, crawl, harvest, index, or mine any Site Content by automated or manual means;',
            'use any Site Content as source material in the development, operation, marketing, or improvement of any procurement training, advisory, content, or software product or service that competes with ours, whether you are acting on your own behalf or on behalf of a third party, including a competitor, client, contractor, or employer;',
            'use the Site or Site Content to develop or train any software program, machine learning model, artificial intelligence system, or algorithm;',
            'post, transmit, or publish any content that is false, misleading, defamatory, offensive, unlawful, or that infringes the rights of any third party;',
            'submit through any form, tool, or feature on the Site any information that is confidential, commercially sensitive, or subject to an obligation of confidence owed to your employer, your client, or a procuring agency;',
            'use the Site in any way that interferes with its operation or degrades the experience of other users;',
            'share, resell, or provide access to your account or any paid content to any other person or entity;',
            'attempt to gain unauthorised access to any part of the Site, our systems, or any related infrastructure; or',
            'use the Site in violation of any applicable Australian law, including the Competition and Consumer Act 2010 (Cth), the Privacy Act 1988 (Cth), and the Spam Act 2003 (Cth).',
          ],
        },
        {
          lead: 'Your professional knowledge:',
          text: 'Nothing in this clause restricts your use of general knowledge, understanding, or skills you acquire through lawful use of the Site in the ordinary course of your profession or employment.',
        },
      ],
    },
    {
      heading: '6. Courses, enrolments, and certificates',
      body: [
        {
          lead: 'Enrolment:',
          text: 'By enrolling in a course, you agree to pay the applicable fee as published on the Site at the time of purchase. Course prices may vary from time to time. The price payable is the price displayed at the time you complete your purchase.',
        },
        {
          lead: 'Pricing and GST:',
          text: 'Prices for online courses, subscriptions, and directory listings are in Australian dollars (AUD) and include GST. The price payable is the price displayed at checkout.',
        },
        {
          lead: 'Consulting and advisory fees',
          text: 'are not published on the Site and are not governed by this clause. Those fees are set out in the proposal, scope of services, engagement agreement, and disclosure statement issued for the relevant engagement.',
        },
        {
          lead: 'Access:',
          text: 'Upon successful payment, you will be granted access to the enrolled course through our learning management system (LMS). The LMS is software we have built and operate ourselves, hosted in Australia. Access is personal to you and must not be shared with any other person or entity. We may suspend access where we detect credential sharing or concurrent use from multiple locations.',
        },
        {
          lead: 'Certificates and accreditation status:',
          text: 'Our courses are not nationally recognised training and are not accredited under the National Vocational Education and Training Regulator Act 2011 (Cth). We are not a Registered Training Organisation (RTO). Certificates of completion issued by us confirm completion of our course only. They are not a formal qualification and are not a substitute for accredited training or professional licensing. If any course we offer becomes accredited in the future, that course will be clearly identified as accredited at the point of sale. You are responsible for verifying any recognition requirements applicable to your profession or employer.',
        },
        {
          lead: 'Refunds, your rights under the Australian Consumer Law:',
          text: 'Our courses come with guarantees that cannot be excluded under the Australian Consumer Law (Schedule 2 to the Competition and Consumer Act 2010 (Cth)), including that services will be provided with due care and skill and will be fit for the purpose disclosed. If a course fails to meet a consumer guarantee, you are entitled to a remedy under the Australian Consumer Law, regardless of when you purchased and regardless of anything else in these Terms.',
        },
        {
          lead: 'Refunds, change of mind:',
          text: 'In addition to those rights, we offer a change-of-mind refund within 7 days of the date of purchase, provided that at the time you request it you have not completed more than 25 per cent of the course and no certificate of completion has been issued to you. To request one, email mkheir@govprocurement.com.au within 7 days of purchase.',
        },
        'This 7-day courtesy window applies to change-of-mind requests only. It is offered in addition to, and does not limit or affect, your rights under the Australian Consumer Law. If a course fails to meet a consumer guarantee, your right to a remedy applies regardless of how much of the course you have completed, whether a certificate has been issued, and whether the 7 days have passed.',
      ],
    },
    {
      heading: '7. Sourcing Advisor tool',
      body: [
        'The Sourcing Advisor is a rules-based decision-support tool. It is not artificial intelligence. It applies a fixed set of pre-programmed rules to the information you enter and produces general guidance only. Every user who enters the same inputs receives the same output. No person at Gov Procurement Pty Ltd reviews, tailors, or responds to your inputs.',
        {
          lead: 'The Sourcing Advisor does not constitute, and must not be relied upon as, legal, financial, regulatory, procurement, probity, or any other form of professional advice.',
          text: 'It does not replace independent professional judgement and does not create any advisory or client relationship between you and us. Any output reflects general information only and may not be accurate, complete, current, or applicable to your specific circumstances.',
        },
        {
          lead: 'Do not enter procurement-identifying or confidential information.',
          text: 'The Sourcing Advisor is not a channel for advice on a specific procurement. Do not enter the name of an agency, project, tender, or opportunity, any commercially sensitive information, or any information subject to an obligation of confidence. Our Conflict of Interest Policy prohibits us from providing any supplier with advice on a specific tender, and the Sourcing Advisor is not an exception to that prohibition. Information you enter is not stored against your identity and is not reviewed by us.',
        },
        'You use the Sourcing Advisor entirely at your own risk. Subject to clause 12 and to the fullest extent permitted by law, we are not liable for any loss, damage, or consequence arising from your reliance on any output produced by the Sourcing Advisor.',
        {
          lead: 'If you need advice specific to your circumstances',
          text: ', please seek independent professional guidance, or contact us directly through the Request a Consultation page at govprocurement.com.au, by phone using the number published on the Site, or by emailing mkheir@govprocurement.com.au. Any engagement we accept is subject to our Conflict of Interest Policy.',
        },
      ],
    },
    {
      heading: '8. Q&A forum',
      body: [
        'The Q&A feature allows you to submit questions for possible publication on the Site. By submitting a question, you:',
        {
          list: [
            'grant us a worldwide, royalty-free, perpetual licence to publish, reproduce, edit, and adapt your question, in anonymised form, on the Site and in related communications including newsletters, social media posts, and course materials;',
            'acknowledge that your name, email address, and other personal details will not be published;',
            'acknowledge that we will edit your question before publication as necessary to remove any detail capable of identifying you, your employer, your client, or the procurement you are referring to, and that the published version may therefore differ from what you submitted;',
            'confirm that your question does not contain confidential, commercially sensitive, defamatory, misleading, or unlawful content, and that you have authority to submit it;',
            'acknowledge that submission does not guarantee publication or a response; and',
            'acknowledge that our answers are general information only and are subject to the disclaimers in clause 11.',
          ],
        },
        {
          lead: 'Questions we will not answer:',
          text: 'Our Conflict of Interest Policy prohibits us from advising any supplier on any specific tender. We will decline, without answering in part, any question that seeks advice on how to respond to an identified or identifiable procurement, including advice on pricing, positioning, response content, or evaluation criteria for that procurement. Repeated attempts to obtain tender-specific advice may result in removal from the Q&A feature under clause 15.',
        },
        {
          lead: 'Removal:',
          text: 'You may request removal of your published question at any time by emailing mkheir@govprocurement.com.au. We will action reasonable removal requests promptly.',
        },
        'We may decline to publish, edit, or remove any submitted question at our discretion. Personal information submitted through the Q&A form is handled in accordance with our Privacy Policy.',
      ],
    },
    {
      heading: '9. Bid Writer Directory',
      body: [
        'We operate a paid business directory that allows organisations seeking bid writing or bid management support to find providers ("Directory").',
        {
          lead: 'Paid placement and no endorsement:',
          text: 'All Directory listings are paid placements and are identified as such. We do not verify, endorse, recommend, rank, rate, or refer any listed provider. Ordering within the Directory does not indicate quality or preference. We receive no commission, referral fee, or success fee from any listed provider. Selection of a provider is entirely a matter for you.',
        },
        {
          lead: 'We do not provide these services:',
          text: 'We do not provide bid writing, bid management, or tender response services, and we do not compete with listed providers.',
        },
        {
          lead: 'No relationship with you:',
          text: 'We are not a party to any agreement between you and a listed provider. We are not responsible for the conduct, performance, quality, pricing, or output of any listed provider, or for any loss arising from an engagement you enter into with one.',
        },
        {
          sub: 'If you hold or apply for a listing',
        },
        {
          lead: 'Your content:',
          text: 'You retain ownership of the content you supply for your listing, including your logo, images, and service description. You grant us a non-exclusive, royalty-free licence to host, reproduce, display, and resize that content for the purpose of operating and promoting the Directory, for as long as your listing is active and for a reasonable period afterwards for archival purposes.',
        },
        {
          lead: 'Your warranties:',
          text: 'You warrant that you hold all rights necessary to grant that licence, that your listing content is accurate and not misleading, that you hold any licence, registration, or insurance you claim to hold, and that your listing complies with the Australian Consumer Law and all other applicable laws.',
        },
        {
          lead: 'Fees and term:',
          text: 'Listing fees, the listing period, and renewal arrangements are as published at the time of purchase. Listing fees are paid in advance.',
        },
        {
          lead: 'Cancellation and refunds:',
          text: 'You may cancel a listing at any time by emailing us. Where you cancel within 7 days of purchase or renewal, we will refund the fee in full. Where you cancel after 7 days, the listing remains live until the end of the paid period and no refund is payable for the unused portion.',
        },
        'This 7-day courtesy window does not limit or affect your rights under the Australian Consumer Law, which continue to apply regardless of when you purchased.',
        {
          lead: 'Our right to reject, amend, suspend, or remove:',
          text: 'We may decline a listing application, or amend, suspend, or remove a listing, where the listing is inaccurate or misleading, breaches these Terms or any law, is the subject of a substantiated complaint, or where the listed provider has engaged in conduct that in our reasonable opinion presents an integrity risk. Where we remove or suspend a listing for a reason other than your breach, including a decision by us to change or discontinue the Directory, we will refund the unused portion of the fee on a pro-rata basis. Where we remove a listing for your breach, clause 15 applies.',
        },
        {
          lead: 'Conflict of interest:',
          text: 'Our management of the integrity risk arising from operating the Directory is set out in our Conflict of Interest Policy. Where we are engaged by a government agency or public institution on a procurement, we disclose the existence of the Directory to that client in writing, and no listed provider receives any advantage, information, or access in connection with that engagement.',
        },
      ],
    },
    {
      heading: '10. Third-party websites and links',
      body: [
        'This Site contains links to external websites, including government portals, tender platforms, jurisdictional resources, and third-party organisations. These links are provided for convenience only. We do not own, operate, control, endorse, or receive any benefit from any linked third-party website, and we are not responsible for the content, accuracy, availability, or privacy practices of any third-party site.',
        'Your use of any linked third-party website is governed by that site\'s own terms and privacy policy. We encourage you to review those documents before providing any personal information or relying on any content.',
      ],
    },
    {
      heading: '11. Disclaimers',
      body: [
        'To the fullest extent permitted by law:',
        {
          list: [
            'all Site Content is provided "as is" and without warranty of any kind, express or implied;',
            'we make no representation or warranty that the Site Content is accurate, complete, current, or fit for any particular purpose;',
            'we are not responsible for any errors, omissions, or inaccuracies in any Site Content, including content contributed by third parties, content in Directory listings, or content sourced from external publications; and',
            'we do not warrant that the Site will be available, uninterrupted, or free from errors, defects, or viruses at all times.',
          ],
        },
        {
          lead: 'Nothing on this Site constitutes legal, financial, regulatory, procurement, probity, or professional advice of any kind.',
          text: 'Site Content is general information only. Procurement rules, policies, and thresholds vary by jurisdiction and change over time. You are solely responsible for your use of any Site Content and for any decisions you make in reliance on it.',
        },
        'Nothing in this clause excludes, restricts, or modifies any guarantee, right, or remedy under the Australian Consumer Law that cannot be excluded, restricted, or modified by agreement.',
      ],
    },
    {
      heading: '12. Limitation of liability',
      body: [
        {
          lead: 'Australian Consumer Law:',
          text: 'Nothing in these Terms excludes, restricts, or modifies any guarantee, right, or remedy you may have under the Australian Consumer Law that cannot lawfully be excluded, restricted, or modified. Where we are permitted to limit our liability for a failure to comply with a consumer guarantee in relation to services, our liability is limited, at our election, to the resupply of the services or the payment of the cost of resupply.',
        },
        {
          lead: 'Otherwise',
          text: ', and to the fullest extent permitted by law, our total aggregate liability to you arising from or in connection with your use of the Site or any Site Content, whether in contract, tort (including negligence), statute, or otherwise, is limited to:',
        },
        {
          list: [
            'where you have paid us for a course, listing, or service to which the claim directly relates, the amount you paid for that course, listing, or service; or',
            'where you have not paid us any amount, AUD $100.',
          ],
        },
        'We are not liable for any indirect, incidental, consequential, special, or punitive loss or damage, including loss of revenue, loss of profit, loss of contract or tender opportunity, loss of data, loss of goodwill, or loss of anticipated savings, whether or not we were advised of the possibility of such loss.',
        {
          lead: 'Your responsibility:',
          text: 'You acknowledge that procurement decisions, bid submissions, and tender outcomes depend on many factors outside our control and are your responsibility alone.',
        },
      ],
    },
    {
      heading: '13. Indemnity',
      body: [
        'You agree to indemnify and hold harmless Gov Procurement Pty Ltd and its officers, employees, contractors, and agents from and against any claims, losses, damages, costs, and reasonable legal expenses arising out of or in connection with:',
        {
          list: [
            'your breach of these Terms;',
            'any unlawful act or omission by you in connection with the Site;',
            'any content you submit to the Site, including Directory listing content; or',
            'your infringement of any third-party right, including intellectual property rights.',
          ],
        },
        'This indemnity does not apply to the extent that the relevant loss or claim was caused or contributed to by our own negligence, breach, or wrongful act.',
        'We may, at our own cost, assume the conduct of the defence of any matter subject to this indemnity, and you agree to cooperate reasonably with us in doing so.',
      ],
    },
    {
      heading: '14. Notices of intellectual property infringement',
      body: [
        'If you believe that any content on this Site infringes your intellectual property rights, contact us in writing at mkheir@govprocurement.com.au with:',
        {
          list: [
            'identification of the work you claim has been infringed;',
            'identification of the specific content on our Site you claim is infringing;',
            'your name and contact details;',
            'a statement that you believe in good faith that the use is not authorised by the rights holder or by law; and',
            'a statement that the information provided is accurate and that you are authorised to act on behalf of the rights holder.',
          ],
        },
        'We will investigate all notices promptly and take appropriate action, which may include removal of the relevant content.',
      ],
    },
    {
      heading: '15. Suspension and termination',
      body: [
        {
          lead: 'Immediate termination.',
          text: 'We may suspend or terminate your access to the Site immediately and without notice if you:',
        },
        {
          list: [
            'scrape, bulk-extract, or systematically copy Site Content;',
            'share, resell, or provide unauthorised access to paid content or your account;',
            'use the Site unlawfully or in breach of clause 5;',
            'infringe our intellectual property rights; or',
            'attempt to compromise the security or operation of the Site.',
          ],
        },
        {
          lead: 'Termination on notice.',
          text: 'For any other breach of these Terms, we will give you 7 days\' written notice and a reasonable opportunity to remedy the breach before suspending or terminating your access.',
        },
        {
          lead: 'Refunds on termination.',
          text: 'If we terminate your access for a reason other than your breach of these Terms, we will refund the unused portion of any prepaid course, listing, or subscription fee. Where we terminate for your breach, we may retain an amount that is reasonable and proportionate having regard to the nature of the breach and any loss we have suffered, except to the extent that retention would be contrary to law.',
        },
        {
          lead: 'Effect of termination.',
          text: 'On termination, all licences granted to you cease immediately. Clauses 3, 4, 5, 9, 11, 12, 13, and 18 survive termination.',
        },
      ],
    },
    {
      heading: '16. Careers and job applications',
      body: [
        'Where you apply for a role with us, your application is sent by email directly to us. Any personal information you provide is handled in accordance with our Privacy Policy.',
        'We do not guarantee a response to any application. Unsolicited applications, proposals, or materials sent to us are not treated as confidential, and no obligation, contractual or otherwise, arises from our receipt of them.',
      ],
    },
    {
      heading: '17. Complaints and dispute resolution',
      body: [
        'If you have a complaint about the Site, a course, a Directory listing, or any service we provide, please contact us first at mkheir@govprocurement.com.au. We will acknowledge your complaint within 5 business days and aim to provide a substantive response within 20 business days.',
        {
          lead: 'Privacy complaints and requests',
          text: 'are handled under our Privacy Policy. We acknowledge them within 5 business days and respond substantively within 30 days, in accordance with the Privacy Act 1988 (Cth).',
        },
        'Both parties agree to attempt to resolve any dispute in good faith through this process before commencing legal proceedings. This does not prevent either party from seeking urgent injunctive relief, and it does not affect your right to contact NSW Fair Trading, the Australian Competition and Consumer Commission, the Office of the Australian Information Commissioner, or any other regulator at any time.',
      ],
    },
    {
      heading: '18. General',
      body: [
        {
          lead: 'Entire agreement.',
          text: 'These Terms, together with our Privacy Policy and our Cookie Policy, constitute the entire agreement between you and us in relation to your use of the Site. Our Conflict of Interest Policy is a published statement of how we manage integrity risk. It is not a contractual term of these Terms, and it does not create rights enforceable by you under these Terms, but we will act in accordance with it. Where our Conflict of Interest Policy imposes a higher standard on us than these Terms, we apply the higher standard.',
        },
        {
          lead: 'Order of precedence.',
          text: 'If there is an inconsistency between these documents in relation to your use of the Site, these Terms prevail, except that the Privacy Policy prevails in relation to the handling of personal information and the Cookie Policy prevails in relation to cookies and tracking technologies.',
        },
        {
          lead: 'Severability.',
          text: 'If any provision of these Terms is found to be invalid, unlawful, or unenforceable, that provision is severed to the extent necessary and the remaining provisions continue in full force.',
        },
        {
          lead: 'No waiver.',
          text: 'Our failure to enforce any provision does not constitute a waiver of our right to enforce it later.',
        },
        {
          lead: 'Assignment.',
          text: 'You may not assign or transfer your rights under these Terms without our written consent. We may assign these Terms in connection with a sale or restructure of our business.',
        },
        {
          lead: 'Notices.',
          text: 'Notices to us must be sent to mkheir@govprocurement.com.au. Notices to you will be sent to the email address associated with your account, or published on the Site where you do not hold an account.',
        },
        {
          lead: 'Contact.',
          text: 'For any questions regarding these Terms, contact us at mkheir@govprocurement.com.au.',
        },
      ],
    },
  ],
  'cookies': [
    {
      heading: 'What this policy covers',
      body: [
        'This Cookie Policy explains what cookies and similar tracking technologies we use on govprocurement.com.au and in our learning management system (LMS), why we use them, and how you can control them.',
        'It should be read together with our Privacy Policy, which explains more broadly how we handle personal information, and our Website Terms of Use.',
      ],
    },
    {
      heading: 'What cookies are',
      body: [
        'A cookie is a small text file placed on your device when you visit a website. Cookies let a website remember your actions and preferences over time.',
        'We also use similar technologies that are not strictly cookies, including:',
        {
          list: [
            'Local storage, which stores data in your browser rather than in a cookie file;',
            'Pixels and tags, which are small pieces of code that record that a page has loaded or an action has occurred;',
            'Session recording scripts, which capture how you move through and interact with a page; and',
            'Embedded content, such as video players and booking widgets, which may set their own cookies.',
          ],
        },
        'In this policy, "cookies" refers to all of these unless we say otherwise.',
      ],
    },
    {
      heading: 'Your consent',
      body: [
        {
          lead: 'We do not load any non-essential cookie or tracking script until you have given consent.',
          text: 'This applies to every visitor, wherever you are.',
        },
        'When you first visit our website, you will see a cookie notice. You can:',
        {
          list: [
            'accept all cookies;',
            'reject all non-essential cookies; or',
            'choose which categories you accept.',
          ],
        },
        'Strictly necessary cookies are set regardless, because the website and the LMS cannot function without them. You cannot switch these off.',
        'You can change your choice at any time using the Cookie preferences link in the footer of every page. Withdrawing consent is as easy as giving it. Withdrawing consent does not affect anything we did lawfully before you withdrew it.',
      ],
    },
    {
      heading: 'Categories of cookies we use',
      body: [
        {
          sub: '1. Strictly necessary',
        },
        'These make the website and the LMS work. They enable page navigation, secure login, session management, form submission, checkout, and the recording of your cookie preference itself. They do not require consent.',
        {
          table: {
            head: [
              'Cookie',
              'Set by',
              'Purpose',
              'Duration',
            ],
            rows: [
              [
                'Session identifier',
                'Our website',
                'Maintains your browsing session',
                'Session',
              ],
              [
                'Authentication token',
                'Our LMS',
                'Keeps you securely signed in to your course account',
                'Session, or up to 30 days if you select "remember me"',
              ],
              [
                'Cross-site request forgery token',
                'Our website and LMS',
                'Protects forms and account actions from attack',
                'Session',
              ],
              [
                'Course progress state',
                'Our LMS',
                'Records your position within a course during a session',
                'Session',
              ],
              [
                'Load balancing cookie',
                'Amazon Web Services',
                'Routes your requests to the correct server',
                'Session',
              ],
              [
                'cmplz_*',
                'Complianz',
                'Records your cookie consent choice',
                '1 year',
              ],
              [
                '__stripe_mid',
                'Stripe',
                'Fraud prevention on payments',
                '1 year',
              ],
              [
                '__stripe_sid',
                'Stripe',
                'Fraud prevention on payments',
                '30 minutes',
              ],
            ],
          },
        },
        {
          sub: '2. Analytics and performance',
        },
        'These help us understand how the website is used so that we can improve it. They require your consent.',
        {
          table: {
            head: [
              'Cookie',
              'Set by',
              'Purpose',
              'Duration',
            ],
            rows: [
              [
                '_ga',
                'Google Analytics 4',
                'Distinguishes unique visitors',
                '2 years',
              ],
              [
                '_ga_*',
                'Google Analytics 4',
                'Maintains session state',
                '2 years',
              ],
              [
                '_gid',
                'Google Analytics 4',
                'Distinguishes users',
                '24 hours',
              ],
              [
                '_clck',
                'Microsoft Clarity',
                'Persists a Clarity user identifier',
                '1 year',
              ],
              [
                '_clsk',
                'Microsoft Clarity',
                'Groups page views into a single session',
                '24 hours',
              ],
              [
                'CLID',
                'Microsoft Clarity',
                'Identifies the first time Clarity saw this browser',
                '1 year',
              ],
              [
                'MUID',
                'Microsoft',
                'Identifies unique browsers across Microsoft sites',
                '13 months',
              ],
            ],
          },
        },
        {
          lead: 'A note on Microsoft Clarity.',
          text: 'Clarity is a session recording and heatmap tool. It records mouse movement, clicks, scrolling, and page interactions, and produces a replay of your visit and aggregated heatmaps. We use it to find usability problems.',
        },
        'Clarity is configured to mask text entered into form fields, so we do not see what you type into forms. We do not use Clarity to identify individuals. If you do not want your session recorded, reject analytics cookies in the cookie notice.',
        {
          sub: '3. Functional',
        },
        'These remember choices you make so the website behaves the way you expect. They require your consent.',
        {
          table: {
            head: [
              'Cookie',
              'Set by',
              'Purpose',
              'Duration',
            ],
            rows: [
              [
                'Audience toggle preference',
                'Our website',
                'Remembers whether you selected Win Contracts or Award Contracts',
                '30 days',
              ],
              [
                'Booking widget cookies',
                'Our online booking provider',
                'Operates the consultation booking widget and remembers your time zone',
                'Session to 1 year',
              ],
              [
                'Live chat cookies',
                'Our live chat provider',
                'Maintains your chat session and message history',
                'Session to 1 year',
              ],
              [
                'Video player preferences',
                'YouTube and Vimeo',
                'Remembers volume, playback speed, and quality',
                'Session to 2 years',
              ],
            ],
          },
        },
        {
          sub: '4. Advertising and social media',
        },
        'These allow us to measure how our advertising performs and to show our content to relevant professional audiences on other platforms. They require your consent.',
        {
          table: {
            head: [
              'Cookie',
              'Set by',
              'Purpose',
              'Duration',
            ],
            rows: [
              [
                'li_sugr, bcookie, bscookie, lidc, UserMatchHistory',
                'LinkedIn Insight Tag',
                'Advertising measurement, conversion tracking, and audience building',
                'Session to 2 years',
              ],
              [
                '_fbp',
                'Meta Pixel',
                'Advertising measurement, conversion tracking, and audience building',
                '3 months',
              ],
              [
                'fr',
                'Meta Platforms',
                'Advertising delivery and measurement',
                '3 months',
              ],
              [
                'VISITOR_INFO1_LIVE, YSC, __Secure-YEC',
                'YouTube',
                'Video viewing measurement and advertising',
                'Session to 2 years',
              ],
              [
                'vuid',
                'Vimeo',
                'Video viewing measurement',
                '2 years',
              ],
            ],
          },
        },
        {
          lead: 'Embedded video.',
          text: 'Where we embed a YouTube or Vimeo video, that platform may set cookies once the video loads. If you reject advertising cookies, embedded videos are loaded in a privacy-enhanced mode where the platform supports it, or are replaced with a placeholder that you can click to load.',
        },
      ],
    },
    {
      heading: 'Third-party cookies',
      body: [
        'Some cookies listed above are set by third parties rather than by us. Those parties handle the data they collect under their own privacy policies:',
        {
          table: {
            head: [
              'Provider',
              'Privacy policy',
            ],
            rows: [
              [
                'Google (Analytics, Tag Manager, YouTube)',
                'policies.google.com/privacy',
              ],
              [
                'Microsoft (Clarity)',
                'privacy.microsoft.com/privacystatement',
              ],
              [
                'Stripe',
                'stripe.com/au/privacy',
              ],
              [
                'LinkedIn',
                'linkedin.com/legal/privacy-policy',
              ],
              [
                'Meta Platforms',
                'facebook.com/privacy/policy',
              ],
              [
                'Vimeo',
                'vimeo.com/privacy',
              ],
            ],
          },
        },
        'We also link to third-party websites, including government portals and tender platforms. Those sites may set their own cookies once you visit them. This policy does not cover them.',
      ],
    },
    {
      heading: 'Google Consent Mode',
      body: [
        'We use Google Consent Mode v2. Where you decline analytics or advertising cookies, Google tags are instructed not to write cookies and to send only limited, non-identifying signals. This means we still see aggregate traffic patterns without tracking you individually.',
      ],
    },
    {
      heading: 'How we treat visitors from different regions',
      body: [
        'We apply a single high standard to all visitors: no non-essential cookie is set before consent, regardless of where you are.',
        'For visitors from the European Union and the United Kingdom, this satisfies the consent requirement under the ePrivacy Directive, the General Data Protection Regulation, and the UK GDPR.',
        'For visitors from Australia, cookie data that can identify you is personal information and is handled under the Privacy Act 1988 (Cth) and the Australian Privacy Principles, as set out in our Privacy Policy.',
      ],
    },
    {
      heading: 'Managing cookies in your browser',
      body: [
        'You can also control cookies directly in your browser. Most browsers let you view, delete, and block cookies.',
        'Blocking strictly necessary cookies will stop parts of our website and LMS from working, including sign-in, course access, and checkout.',
        'Browser instructions:',
        {
          list: [
            'Chrome: Settings, then Privacy and security, then Third-party cookies',
            'Safari: Settings, then Privacy',
            'Firefox: Settings, then Privacy and Security',
            'Edge: Settings, then Cookies and site permissions',
          ],
        },
      ],
    },
    {
      heading: 'Opting out of specific tools',
      body: [
        {
          list: [
            'Google Analytics: install the Google Analytics Opt-out Browser Add-on from tools.google.com/dlpage/gaoptout',
            'Microsoft Clarity: reject analytics cookies in our cookie notice, or use the Microsoft opt-out at choice.microsoft.com',
            'LinkedIn advertising: linkedin.com/psettings/advertising',
            'Meta advertising: facebook.com/adpreferences',
          ],
        },
      ],
    },
    {
      heading: 'Do Not Track and Global Privacy Control',
      body: [
        'Our cookie notice recognises the Global Privacy Control (GPC) signal. Where your browser sends a GPC signal, we treat it as a rejection of non-essential cookies.',
        'Browser "do not track" headers are not consistently implemented across the industry, and we do not rely on them. Use the cookie notice or GPC instead.',
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [
        'We review this policy whenever we add, remove, or change a tool that sets cookies, and at least annually. The version number and effective date at the top of this page reflect the current version.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        'If you have a question about our use of cookies, contact us at:',
        {
          lines: [
            'Gov Procurement Pty Ltd',
            'Trading as Government Procurement',
            'mkheir@govprocurement.com.au',
            'govprocurement.com.au',
          ],
        },
      ],
    },
  ],
  'conflicts-of-interest': [
    {
      heading: '1. Purpose',
      body: [
        'Gov Procurement Pty Ltd provides professional services to government agencies, public institutions, and private sector organisations. We also provide training and capability uplift to suppliers who bid for government work.',
        'Serving both sides of the procurement relationship carries a genuine integrity risk. This policy sets out how we manage that risk. It is published so that clients, suppliers, regulators, and the public can hold us to it.',
        'We treat perceived conflicts as seriously as actual ones. A conflict does not need to have influenced a decision to be damaging. It only needs to look like it could have.',
      ],
    },
    {
      heading: '2. Framework',
      body: [
        'This policy is designed to be consistent with:',
        {
          list: [
            'the Commonwealth Procurement Rules and the Public Governance, Performance and Accountability Act 2013 (Cth);',
            'state and territory procurement frameworks, including the NSW Procurement Policy Framework;',
            'the Independent Commission Against Corruption Act 1988 (NSW) and equivalent integrity legislation in other jurisdictions; and',
            'Australian National Audit Office and ICAC guidance on the management of conflicts of interest in procurement.',
          ],
        },
        'Where a client\'s own conflict of interest framework imposes a higher standard than this policy, the client\'s standard applies.',
      ],
    },
    {
      heading: '3. Who this policy binds',
      body: [
        'This policy applies to:',
        {
          list: [
            'all employees of Gov Procurement Pty Ltd;',
            'all contractors and subcontractors engaged by us;',
            'all course instructors, facilitators, and content contributors; and',
            'the Managing Director.',
          ],
        },
        'Acceptance of this policy is a condition of employment or engagement. Everyone bound by it signs a written acknowledgement before commencing work and re-confirms annually.',
        {
          lead: 'Application:',
          text: 'The obligations in this policy apply to each person listed above from the time that person is employed or engaged by us. Where we do not currently employ or engage a person in one of those categories, the obligation applies to the first such person from their first day. The standard does not change as we grow.',
        },
        {
          lead: 'Subcontractor flow-down:',
          text: 'No subcontractor commences work on any engagement until they have signed the acknowledgement and completed a written conflict declaration. Every subcontract we issue includes a term requiring compliance with this policy and passing the same obligation to any further subcontractor. Where a subcontractor declares a conflict relevant to a client engagement, that declaration is disclosed to the client in writing before the subcontractor begins work.',
        },
      ],
    },
    {
      heading: '4. Our core commitment: the supplier advisory boundary',
      body: [
        {
          lead: 'We do not advise any supplier on any specific tender, in any jurisdiction, under any circumstances.',
          text: '',
        },
        'This is an absolute and permanent prohibition. It is not time-limited, it is not subject to a cooling-off period, and it has no exceptions.',
        {
          lead: 'What this means in practice:',
          text: 'If a supplier approaches us in relation to a procurement that is on the market, about to come to market, or otherwise identifiable, and asks us for advice on how to respond to it in any way, shape, or form, we decline. This applies regardless of the size of the opportunity, the jurisdiction, the fee offered, or the existing relationship.',
        },
        {
          lead: '"Specific tender" means',
          text: 'any procurement that is identified or identifiable, whether or not it has been published to market. This includes any process however titled, including:',
        },
        {
          list: [
            'Request for Information (RFI)',
            'Expression of Interest (EOI) or Registration of Interest (ROI)',
            'Request for Proposal (RFP)',
            'Request for Tender (RFT) or Invitation to Tender (ITT)',
            'Request for Quotation (RFQ)',
            'Panel, scheme, or prequalification applications',
            'Market sounding or industry briefing responses',
            'Unsolicited proposals',
            'Any other invitation, however described, seeking a response from the market',
          ],
        },
        'It also includes a procurement that has been announced or foreshadowed but not yet published, and any procurement a supplier identifies to us by name, agency, project, value, or description.',
        {
          lead: 'If a supplier can identify the opportunity, it is specific.',
          text: '',
        },
        {
          lead: 'What we do provide to suppliers:',
          text: '',
        },
        {
          list: [
            'General training on how government procurement works',
            'Capability uplift in bid and tender methodology',
            'Guidance on where to find opportunities and how procurement processes operate',
            'Explanation of procurement rules, frameworks, and jurisdictional requirements',
            'Generic templates, structures, and frameworks published openly',
          ],
        },
        {
          lead: 'What we will never provide to suppliers:',
          text: '',
        },
        {
          list: [
            'Advice on how to respond to any specific tender',
            'Review, drafting, editing, proofing, or critique of any response, in whole or in part',
            'Pricing strategy, bid pricing input, or competitive positioning for any opportunity',
            'Assessment of a supplier\'s prospects, strengths, or weaknesses on any opportunity',
            'Advice on evaluation criteria, weightings, or scoring for any specific opportunity',
            'Introductions, advocacy, or representations to any buyer on a supplier\'s behalf',
            'Any assistance that is directed at a particular procurement rather than at general capability',
          ],
        },
        {
          lead: 'The test we apply:',
          text: 'If the assistance would be different depending on which tender the supplier is pursuing, we do not provide it. Our supplier-facing work is identical regardless of what any individual participant happens to be bidding for.',
        },
        {
          sub: 'Automated general tools',
        },
        'We publish self-service tools on our website, including the Sourcing Advisor, the AI Prompt Library, and downloadable templates. These are not an exception to the prohibition above, and they are designed so that they cannot become one:',
        {
          list: [
            'they apply a fixed set of published rules and produce the same output for every user who enters the same inputs;',
            'no person bound by this policy reviews, tailors, or responds to what any user enters;',
            'inputs are not stored against a user\'s identity and are not used to inform any engagement; and',
            'users are instructed, in our Website Terms of Use, not to enter the name of an agency, project, tender, or opportunity, or any confidential or commercially sensitive information.',
          ],
        },
        'If a tool we operate could produce a different output depending on which specific procurement a user is pursuing, we will not publish it.',
        {
          sub: 'Enquiries that cross the line',
        },
        'Where a course participant, subscriber, Q&A submitter, or enquirer asks a question that seeks tender-specific advice, we decline, explain why, and record it. We do not answer partially. Repeated attempts to obtain tender-specific advice result in removal from the relevant service, in accordance with our Website Terms of Use.',
        'Records of declined enquiries are held as part of our register of interests under clause 14, and any personal information in them is handled under our Privacy Policy.',
      ],
    },
    {
      heading: '5. What a conflict of interest is',
      body: [
        'A conflict of interest arises where our private or commercial interests could improperly influence, or be seen to improperly influence, the performance of our duties to a client.',
        {
          lead: 'Actual conflict:',
          text: 'A direct conflict exists now between our interests and our duty.',
        },
        {
          lead: 'Potential conflict:',
          text: 'A conflict does not exist now but could reasonably arise.',
        },
        {
          lead: 'Perceived conflict:',
          text: 'A reasonable and informed observer could conclude that our judgement may be compromised, whether or not it actually is.',
        },
        'All three must be declared. Perceived conflicts are declared on the same basis as actual ones.',
      ],
    },
    {
      heading: '6. Conflicts between engagements',
      body: [
        {
          lead: 'Matter-level separation:',
          text: 'Where we act for a government agency or public institution on a procurement, no person bound by this policy will have any involvement of any kind with a supplier in relation to that procurement. This applies before the procurement is published, during the process, and after award.',
        },
        {
          lead: 'Bespoke training following a probity engagement:',
          text: 'Where we have acted as probity adviser or probity auditor on a procurement, we will not deliver bespoke or in-house training to a single organisation that participated in that procurement for 12 months following the conclusion of the engagement. This restriction does not apply to open-enrolment courses, published content, self-service tools, or online training available to the market generally.',
        },
        {
          lead: 'Information barriers:',
          text: 'Confidential information obtained through a client engagement is never used in the development of training content, tools, templates, or published material. Our training content is developed from publicly available sources only. This obligation is permanent.',
        },
        {
          lead: 'Declining work:',
          text: 'We will decline an engagement where a conflict cannot be managed to the satisfaction of the affected client. We decline rather than negotiate. Fee value is not a relevant consideration.',
        },
      ],
    },
    {
      heading: '7. Fee structure',
      body: [
        {
          lead: 'We do not accept contingent fees, success fees, commissions, or any fee arrangement linked to the outcome of a procurement.',
          text: '',
        },
        'Our fees are fixed or time-based and are agreed in writing before work commences.',
        'We do not accept payment, in any form, from any party other than our engaging client in connection with an engagement.',
        'Fees paid for open-enrolment courses, subscriptions, and directory listings are published prices paid by the purchaser. They are not connected to any engagement and are not affected by this clause.',
      ],
    },
    {
      heading: '8. Gifts, benefits, and hospitality',
      body: [
        {
          lead: 'We do not give gifts, benefits, or hospitality of any kind to any client, prospective client, public official, or supplier.',
          text: '',
        },
        'This includes gifts, meals, entertainment, travel, accommodation, event tickets, sponsorships, and discounts.',
        {
          lead: 'We do not accept gifts, benefits, or hospitality of any kind from any client, prospective client, public official, or supplier.',
          text: '',
        },
        'The threshold is zero. There is no nominal value exception. Where a gift is offered, it is politely declined with reference to this policy. Where a gift cannot practicably be returned, it is donated to a registered charity and recorded in the register.',
        'Ordinary refreshments provided as part of a meeting or event we are attending in a professional capacity, and which are available to all attendees, are not treated as hospitality for the purposes of this policy.',
        {
          lead: 'Promotional and complimentary access:',
          text: 'Where we provide complimentary access to a course, tool, or directory listing for a marketing, review, or industry purpose, it is offered on published terms, is available to a defined class rather than to a selected individual, and is recorded in the register. We do not provide complimentary access to any public official, or to any person involved in a procurement in which we are engaged.',
        },
      ],
    },
    {
      heading: '9. Political donations',
      body: [
        {
          lead: 'Gov Procurement Pty Ltd does not make political donations.',
          text: '',
        },
        'We do not donate to any political party, candidate, elected official, or associated entity, in cash or in kind, in any jurisdiction.',
        'We do not reimburse or facilitate political donations by any person bound by this policy.',
      ],
    },
    {
      heading: '10. Personal interests, directorships, and family',
      body: [
        {
          lead: 'We do not provide services to any organisation in which we, or any person bound by this policy, hold a directorship, shareholding, or other personal or financial interest.',
          text: '',
        },
        'The same prohibition applies where the interest is held by an immediate family member or close associate.',
        {
          lead: 'Immediate family:',
          text: 'Spouse or domestic partner, parent, child, sibling, and the equivalent step and in-law relationships.',
        },
        {
          lead: 'Close associate:',
          text: 'Any person with whom a person bound by this policy has a personal, financial, or business relationship of a kind that a reasonable observer would consider capable of influencing judgement.',
        },
        {
          lead: 'Ongoing obligation:',
          text: 'Interests must be declared on commencement, whenever they arise or change, and annually. The obligation is continuous. It does not depend on being asked.',
        },
        {
          lead: 'Public sector connections:',
          text: 'Any person bound by this policy who has an immediate family member or close associate employed in government procurement, or in a supplier organisation bidding for government work, must declare that relationship. Declaration does not of itself prevent work proceeding. Non-declaration does.',
        },
      ],
    },
    {
      heading: '11. Bid Writer Directory and paid listings',
      body: [
        'We operate a paid business directory that allows organisations seeking bid writing support to find providers. The commercial terms governing the directory are set out in clause 9 of our Website Terms of Use.',
        {
          lead: 'How we manage the conflict:',
          text: '',
        },
        {
          list: [
            'We do not provide bid writing, bid management, or tender response services ourselves, and we never will.',
            'We do not verify, endorse, recommend, rank, rate, or refer any specific listed provider to any enquirer.',
            'Directory listings are clearly identified as paid placements on the Site.',
            'Listing order does not indicate quality, preference, or any assessment by us.',
            'We do not receive commission, referral fees, or success fees from any listed provider.',
            'No listed provider receives any advantage, information, or access in connection with any engagement we perform for a government or public sector client.',
            'Where we are engaged by an agency on a procurement, the existence of the directory is disclosed to that client in writing at the outset.',
            'Where a person bound by this policy holds an interest in a listed provider, clause 10 applies and the listing is declined or removed.',
          ],
        },
        'The directory is an open marketplace. Selection is entirely a matter for the person searching it.',
      ],
    },
    {
      heading: '12. Confidential information',
      body: [
        'Confidential information obtained through any engagement is used only for that engagement.',
        'We do not use, disclose, or trade on confidential information at any time, including after an engagement ends. This obligation is permanent and survives the end of employment or engagement.',
        'We do not disclose the identity of a client, or the fact of an engagement, without that client\'s written consent, except where disclosure is required by law or is necessary to declare a conflict to another client.',
        'Where confidential information includes personal information, our obligations under the Privacy Act 1988 (Cth) and our Privacy Policy apply in addition to this clause.',
      ],
    },
    {
      heading: '13. Movement between us and the public sector',
      body: [
        {
          sub: 'People joining us from the public sector',
        },
        'Any person who joins us from a government agency or public institution must, before commencing:',
        {
          list: [
            'declare in writing the procurements, projects, and matters they were involved in during their final 12 months of public sector employment;',
            'declare any post-separation obligations owed to their former employer, including any lobbying, contact, or quarantine restrictions; and',
            'confirm they hold no confidential information they are not entitled to retain.',
          ],
        },
        {
          lead: 'For 12 months from the date they join us',
          text: ', that person will not:',
        },
        {
          list: [
            'work on, or be present at, any site or engagement involving their former agency;',
            'be assigned or referred any work connected to a matter they were involved in; or',
            'have any involvement in an engagement with their former agency.',
          ],
        },
        {
          lead: 'We will not accept any engagement from that person\'s former agency for 12 months',
          text: 'from the date they join us, where that person had involvement in the relevant function or matter.',
        },
        'Where the former employer imposes a longer restriction, the longer period applies.',
        'We disclose in writing to any affected client where a person working on their engagement has previously been employed by that client or by an agency involved in the relevant procurement.',
        {
          sub: 'People leaving us for the public sector',
        },
        'Where a person bound by this policy leaves us and takes up a role in government or a public institution:',
        {
          lead: 'Exit deed and post-separation undertaking:',
          text: 'The departing person signs a written exit deed which records that they have returned all confidential information and materials, that their confidentiality obligations continue permanently, and that they have been informed of the matters below.',
        },
        {
          lead: 'No ongoing relationship:',
          text: 'We confirm in writing, at the point of departure, that we will not maintain any ongoing personal, commercial, or professional relationship with that person in connection with their public sector role. We will not seek work from them, seek information from them, or seek to influence any decision in which they are involved.',
        },
        {
          lead: 'Reference only:',
          text: 'Our involvement with a former employee is limited to providing a factual employment reference for future employment opportunities. Nothing further.',
        },
        {
          lead: 'Written record:',
          text: 'The exit deed is retained on file and can be produced to a client or integrity agency on request.',
        },
        {
          lead: 'Where the person joins a supplier:',
          text: 'The same principles apply. We do not maintain a commercial relationship with a former employee who joins a supplier organisation, and we do not provide that organisation with any advantage.',
        },
        {
          lead: 'Recruitment from client agencies:',
          text: 'We do not approach or solicit any employee of a client agency for employment with us during an engagement, or for 6 months following its conclusion. This does not prevent us from considering an unsolicited application, which is declared and managed under clause 14.',
        },
      ],
    },
    {
      heading: '14. Declaring and managing conflicts',
      body: [
        {
          lead: 'Declare immediately:',
          text: 'Any person bound by this policy who becomes aware of an actual, potential, or perceived conflict must declare it in writing to the Managing Director immediately, and before taking any further action on the relevant matter.',
        },
        {
          lead: 'Register of interests:',
          text: 'We maintain a written register of declared interests and conflicts, recording the nature of the conflict, the date declared, the management action taken, and the outcome.',
        },
        {
          lead: 'Management options:',
          text: 'Depending on the nature of the conflict we will record and monitor it, restrict the individual\'s involvement, remove the individual from the matter, disclose it to the affected client for their decision, or decline or withdraw from the engagement. Where doubt exists, we take the more conservative option.',
        },
        {
          lead: 'Conflicts involving the Managing Director:',
          text: 'Where the conflict is the Managing Director\'s own:',
        },
        {
          list: [
            'it is recorded in the register in the same terms as any other conflict;',
            'it is disclosed in writing to the affected client, who decides whether the engagement proceeds and on what conditions; and',
            'where the conflict is material and the engagement is with a government agency or public institution, an independent external reviewer, being a legal practitioner or independent probity practitioner with no relationship to the engagement, is appointed to assess the conflict and recommend management action. That assessment is provided to the client.',
          ],
        },
        'No person assesses their own conflict alone on a government engagement.',
      ],
    },
    {
      heading: '15. Records and retention',
      body: [
        'We retain conflict declarations, register entries, exit deeds, records of declined enquiries, and related records for 7 years from the conclusion of the relevant engagement or the end of the relevant employment, whichever is later.',
        'This period is set to meet or exceed our obligations under:',
        {
          table: {
            head: [
              'Requirement',
              'Minimum period',
            ],
            rows: [
              [
                'Corporations Act 2001 (Cth), financial records',
                '7 years',
              ],
              [
                'Fair Work Act 2009 (Cth) and Regulations, employee records',
                '7 years',
              ],
              [
                'Australian Taxation Office, tax and GST records',
                '5 years',
              ],
              [
                'Privacy Act 1988 (Cth), APP 11.2, personal information',
                'Destroy or de-identify once no longer required',
              ],
            ],
          },
        },
        {
          lead: 'Relationship to our Privacy Policy:',
          text: 'Our Privacy Policy sets retention periods for personal information collected through the website, the LMS, and the directory. Where a record is both a conflict record under this clause and personal information under the Privacy Policy, the 7-year period in this clause applies, because the record is required for the purpose of demonstrating compliance with our integrity obligations. Once that period ends, the record is destroyed or de-identified in accordance with APP 11.2.',
        },
        {
          lead: 'Records created for a public office:',
          text: 'Where records are created or received in the course of an engagement for a NSW public office, those records may be State records under the State Records Act 1998 (NSW). We retain and dispose of such records in accordance with the client agency\'s directions and applicable disposal authority, and we do not dispose of them independently. Equivalent obligations in other jurisdictions are observed where they apply.',
        },
        {
          lead: 'Litigation and investigation hold:',
          text: 'Where a dispute, audit, investigation, or regulatory enquiry is on foot or reasonably anticipated, relevant records are preserved and are not destroyed regardless of any retention period having expired.',
        },
      ],
    },
    {
      heading: '16. Breach',
      body: [
        'Breach of this policy is treated as a serious matter.',
        {
          lead: 'Consequences may include:',
          text: '',
        },
        {
          list: [
            'immediate removal from the engagement;',
            'suspension pending investigation;',
            'termination of employment or engagement, including summary termination for serious breach;',
            'written notification to any affected client;',
            'referral to the relevant integrity agency, including the ICAC, the NSW Ombudsman, the ANAO, or the equivalent body in the relevant jurisdiction, where the conduct warrants it; and',
            'referral to police where the conduct may be criminal.',
          ],
        },
        {
          lead: 'Failure to declare',
          text: 'a conflict is treated as seriously as the conflict itself.',
        },
        {
          lead: 'No detriment for reporting:',
          text: 'Any person who reports a suspected conflict or breach in good faith will not suffer detriment for doing so. This applies whether the report concerns a colleague or the Managing Director. Nothing in this policy limits any protection available to a person under the whistleblower provisions of the Corporations Act 2001 (Cth), the Public Interest Disclosures Act 2022 (NSW), or equivalent legislation.',
        },
      ],
    },
    {
      heading: '17. Client assurance',
      body: [
        'We will, on request from any client:',
        {
          list: [
            'provide a copy of this policy;',
            'provide a written conflict declaration specific to the engagement;',
            'provide an extract of the register of interests relevant to that engagement, redacted to remove information confidential to any other client and any personal information not necessary for the client\'s assessment; and',
            'confirm in writing that no person working on the engagement holds an undeclared conflict.',
          ],
        },
      ],
    },
    {
      heading: '18. Status of this policy and related documents',
      body: [
        'This policy operates alongside our Website Terms of Use, our Privacy Policy, and our Cookie Policy, all available at govprocurement.com.au.',
        {
          lead: 'Status:',
          text: 'This policy is a published statement of the standards we hold ourselves to. It is a contractual term of any engagement into which we expressly incorporate it, and it binds every person described in clause 3. It is not a term of our Website Terms of Use and it does not create rights enforceable by a website user under those Terms.',
        },
        {
          lead: 'Interaction:',
          text: '',
        },
        {
          list: [
            'Where this policy imposes a higher standard on our own conduct than our Website Terms of Use, we apply the higher standard.',
            'The Privacy Policy governs the handling of personal information, including personal information recorded under this policy, except that the retention period in clause 15 applies to conflict records.',
            'The Website Terms of Use govern a user\'s rights and obligations in relation to the Site, including the directory terms in clause 9 of those Terms.',
            'Where a client\'s own conflict of interest framework imposes a higher standard, clause 2 applies and the client\'s standard prevails.',
          ],
        },
      ],
    },
    {
      heading: '19. Review and contact',
      body: [
        'This policy is reviewed annually and whenever our services or structure change materially.',
        'Questions, concerns, or reports relating to this policy should be directed to:',
        {
          lines: [
            'Managing Director',
            'Gov Procurement Pty Ltd',
            'mkheir@govprocurement.com.au',
          ],
        },
      ],
    },
  ],
};

// The intro line under each title on the index. Real pages carry their own.
export const POLICY_INTRO = {
  privacy: 'How we collect, use, and protect your personal information.',
  cookies: 'What we set, why, and how to change your mind.',
  terms: 'The terms governing your use of this website and our courses.',
  'conflicts-of-interest':
    'How we identify, declare, and manage conflicts of interest across our engagements.',
};

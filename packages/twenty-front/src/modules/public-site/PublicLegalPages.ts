import { msg } from '@lingui/core/macro';

export const PUBLIC_LEGAL_PAGES = [
  {
    id: 'terms',
    path: '/legal/terms',
    label: msg`Terms of Service`,
    description: msg`Using A2E Suite and your workspace responsibly.`,
    sections: [
      {
        title: msg`Your account and workspace`,
        body: msg`A2E Suite connects pages, projects, calendars, files and optional applications. Access to a workspace is granted by its owner or administrators. Keep your account credentials private, use only access granted to you and tell your administrator if you suspect unauthorized access.`,
      },
      {
        title: msg`Your content`,
        body: msg`You remain responsible for the content you upload and for having permission to use and share it. Workspace administrators manage membership, permissions, application installation and retention settings. Check those permissions before sharing personal or confidential information.`,
      },
      {
        title: msg`Acceptable use`,
        body: msg`Do not use the service for unlawful activity, infringement, harassment, malicious software or attempts to access another person's account or workspace without permission. Do not interfere with the service or bypass its access controls.`,
      },
      {
        title: msg`Connected services and AI`,
        body: msg`Optional integrations and AI providers have their own terms. Only connect services you are authorized to use. Review generated suggestions and financial documents before acting on them; an assistant response is not a substitute for professional judgment.`,
      },
      {
        title: msg`Availability, billing and leaving a workspace`,
        body: msg`Applications and features depend on the workspace configuration. Any subscription, service commitment or support arrangement must be confirmed with the service operator. Before leaving a workspace, arrange access to the content you need with its administrator.`,
      },
    ],
  },
  {
    id: 'privacy',
    path: '/legal/privacy',
    label: msg`Privacy Policy`,
    description: msg`How information is used in an A2E Suite workspace.`,
    sections: [
      {
        title: msg`Account and workspace information`,
        body: msg`The service processes account details, workspace memberships, access permissions and the content you choose to add. Depending on enabled applications, that content can include documents, tasks, contacts, calendar entries, files and financial records.`,
      },
      {
        title: msg`Why information is processed`,
        body: msg`Account and session information support sign-in, authorization and workspace administration. Workspace content is processed to provide the features you request. Operational records support security, troubleshooting and service maintenance. The association processes account information to provide the service you request and operational information for its legitimate interests in security and reliability. The organisation responsible for your workspace determines the purposes and legal basis for the content it adds.`,
      },
      {
        title: msg`Cookies and local storage`,
        body: msg`The application uses authentication cookies and browser storage for sessions, preferences and workspace navigation. Clearing that storage can sign you out or reset preferences. Connected services may set their own cookies when you visit their websites.`,
      },
      {
        title: msg`Sharing and connected providers`,
        body: msg`Your workspace permissions determine who can access its records. Document sharing is a separate action. Email, calendar, file storage and AI integrations can process information through providers configured by the operator or your administrator. Review a provider and the information being shared before connecting or using it.`,
      },
      {
        title: msg`Retention and your choices`,
        body: msg`Retention depends on the workspace settings, the service operator's policy and any applicable agreement. Backups can have a separate retention period. Contact the association about access, correction, export, deletion, restriction or objection concerning your account information. For workspace content, contact the organisation responsible for that workspace. You can also raise a concern with the French data protection authority, CNIL.`,
      },
    ],
  },
  {
    id: 'dpa',
    path: '/legal/dpa',
    label: msg`Data Processing Agreement`,
    description: msg`Data processing arrangements for organisations using A2E Suite.`,
    sections: [
      {
        title: msg`The parties to your agreement`,
        body: msg`An organisation's data processing agreement must identify the organisation responsible for its workspace and the service operator processing data on its behalf. Review the versioned processing terms in Settings → Legal before accepting them on behalf of your organisation. The downloadable record captures your acceptance and does not generate a signature for the association or execute separate international transfer clauses.`,
      },
      {
        title: msg`Scope and instructions`,
        body: msg`The agreement should describe the service, the processing purposes and duration, the categories of information and people concerned, and the documented instructions of the responsible organisation. Optional applications and connected providers should be included where they process that information.`,
      },
      {
        title: msg`Security and service providers`,
        body: msg`Confirm the security measures, authorized personnel, hosting locations, sub-processors and any international transfer arrangements with the service operator. A workspace's configured providers do not by themselves establish contractual safeguards or a certification.`,
      },
      {
        title: msg`Requests, incidents and the end of service`,
        body: msg`The applicable agreement should define assistance with personal information requests and incidents, the handling of service providers, audit information, and how information is returned or deleted when the service ends, including backup retention.`,
      },
      {
        title: msg`Request your agreement`,
        body: msg`Contact Association d’Entraide Étudiante at contact@association2e.org to request the agreement for the service at a2esuite.com. For another deployment, contact its operator. Use only a document that names the actual parties and reflects the services and providers in use.`,
      },
    ],
  },
] as const;

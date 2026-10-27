import { A2E_SUITE_IDENTITY } from './A2eSuiteIdentity';

export const A2E_DPA_TERMS: { kind: 'heading' | 'paragraph'; text: string }[] =
  [
    { kind: 'heading', text: `1. Parties and scope` },
    {
      kind: 'paragraph',
      text: `This Data Processing Agreement applies between ${A2E_SUITE_IDENTITY.operator.legalName}, ${A2E_SUITE_IDENTITY.operator.legalForm}, registered at ${A2E_SUITE_IDENTITY.operator.address} (the Processor), and the organisation accepting it for its A2E Suite workspace (the Controller). The Processor operates A2E Suite at a2esuite.com. The Controller determines the purposes and lawful basis of the personal data it places in the workspace. The Processor processes that data on the Controller’s documented instructions to provide the requested workspace service.`,
    },
    { kind: 'heading', text: `2. Processing description` },
    {
      kind: 'paragraph',
      text: `Processing consists of collecting, storing, organising, retrieving, displaying, sharing, exporting and deleting workspace information through the enabled applications. Information may include names, business contact details, membership information, documents, tasks, calendar entries, attachments and financial records supplied by the Controller or its authorised users. Data subjects may include members, employees, students, customers, suppliers and other people whose information the Controller chooses to add. Processing lasts for the service relationship and any agreed return, deletion or backup-retention period.`,
    },
    {
      kind: 'heading',
      text: `3. Controller instructions and responsibilities`,
    },
    {
      kind: 'paragraph',
      text: `The Controller is responsible for the lawfulness of its content and instructions, notices to data subjects, required consents or other legal bases, and permissions granted to its users. Workspace settings and authorised use of the service constitute documented instructions. The Processor will inform the Controller if, in its opinion, an instruction infringes applicable data protection law. Processing required by law will be communicated to the Controller unless the law prohibits that communication.`,
    },
    { kind: 'heading', text: `4. Confidentiality and security` },
    {
      kind: 'paragraph',
      text: `The Processor will ensure that personnel authorised to process workspace personal data are bound by confidentiality obligations and have access appropriate to their responsibilities. The Processor will implement technical and organisational measures appropriate to the risks of processing. The measures and service configuration relevant to a deployment must be documented with the Controller; this agreement does not represent a certification or a guarantee of uninterrupted service.`,
    },
    { kind: 'heading', text: `5. Service providers and optional integrations` },
    {
      kind: 'paragraph',
      text: `The Processor will engage another processor only with the Controller’s prior specific or general written authorisation. Where general authorisation is used, the Processor will inform the Controller of intended additions or replacements and give a reasonable opportunity to object before the change takes effect. Each authorised sub-processor must be bound by data protection obligations equivalent to those applicable to its processing under this agreement. The Processor remains responsible for the performance of those obligations. The current provider inventory and processing locations are available from ${A2E_SUITE_IDENTITY.operator.email}. Integrations selected directly by the Controller must be assessed according to their actual role and separate terms.`,
    },
    {
      kind: 'heading',
      text: `6. Processing location and international transfers`,
    },
    {
      kind: 'paragraph',
      text: `The configured deployment region is {{HOSTING_REGION}}. The parties must confirm the actual hosting locations and authorised providers for their deployment. Personal data may be transferred outside the European Economic Area only on documented instructions and with an applicable lawful transfer mechanism. No standard contractual clauses, adequacy decision or framework certification are represented as already executed by this document. Where required, the parties must put the appropriate transfer terms in place before the transfer.`,
    },
    { kind: 'heading', text: `7. Assistance and personal data requests` },
    {
      kind: 'paragraph',
      text: `Taking into account the nature of processing and the information available to it, the Processor will assist the Controller with requests concerning data subject rights, security obligations, impact assessments and consultation with supervisory authorities. Requests received directly from a data subject concerning workspace content will be referred to the Controller unless otherwise required by law.`,
    },
    { kind: 'heading', text: `8. Personal data breaches` },
    {
      kind: 'paragraph',
      text: `The Processor will notify the Controller without undue delay after becoming aware of a personal data breach affecting workspace personal data. It will provide available information about the nature and likely consequences of the breach, affected information, relevant contacts and measures taken or proposed, and provide further information as it becomes available. The Controller remains responsible for notifications it is required to make to authorities or individuals.`,
    },
    { kind: 'heading', text: `9. Return and deletion` },
    {
      kind: 'paragraph',
      text: `At the end of the processing service, the Processor will, at the Controller’s choice, return or delete the workspace personal data and delete existing copies unless retention is required by law. The parties must agree the export procedure, deletion timing and treatment of backups for the deployment. Until deletion, retained copies remain subject to confidentiality and security obligations and may be used only for the permitted retention purpose.`,
    },
    { kind: 'heading', text: `10. Information and audits` },
    {
      kind: 'paragraph',
      text: `The Processor will make available information necessary to demonstrate compliance with its obligations under this agreement and allow and contribute to audits, including inspections, by the Controller or an auditor it mandates. Audit arrangements must protect other customers’ information, confidentiality and service security without preventing the exercise of statutory rights.`,
    },
    { kind: 'heading', text: `11. Contact, acceptance and changes` },
    {
      kind: 'paragraph',
      text: `Questions and requests under this agreement should be addressed to ${A2E_SUITE_IDENTITY.operator.email}. The Controller’s authorised representative may accept the published processing terms electronically; the service records the accepting account, time and template version. No handwritten or electronic signature of the association’s representative is created or represented by the generated document. Material changes to processing arrangements must be communicated and agreed as required by applicable law. The governing law is France, subject to mandatory applicable data protection law.`,
    },
    { kind: 'heading', text: `12. Operator identification` },
    {
      kind: 'paragraph',
      text: `SIREN 994 936 789. SIRET 994 936 789 00019. RNA W212015637. Address: ${A2E_SUITE_IDENTITY.operator.address}. Contact: ${A2E_SUITE_IDENTITY.operator.email}.`,
    },
  ];

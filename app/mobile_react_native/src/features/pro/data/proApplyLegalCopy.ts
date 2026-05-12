/**
 * Full agreement text for Pro apply "Platform legal" read-to-accept modals.
 */

export type ProLegalAgreementId = "termsCommission" | "accuracy" | "contractor" | "insurance";

export const PRO_LEGAL_AGREEMENT_COPY: Record<
  ProLegalAgreementId,
  { modalTitle: string; body: string }
> = {
  termsCommission: {
    modalTitle: "Terms of Service & Commission Policy",
    body:
      "FixIT is a technology platform, not a service provider. We are not a party to any contract between you and the customer. A 15% service fee is deducted from all completed jobs. Important: Circumventing the platform by accepting direct payments (cash/Zelle/etc.) will result in immediate and permanent account deactivation.",
  },
  accuracy: {
    modalTitle: "Information Accuracy Confirmation",
    body:
      "You certify that all profile info, identity, and licenses provided are 100% accurate. Providing false info will result in permanent deactivation. You agree to indemnify FixIT against any claims arising from inaccuracies in your profile.",
  },
  contractor: {
    modalTitle: "Independent Contractor Declaration",
    body:
      "You are an Independent Contractor, not an employee of FixIT. You provide your own tools/transportation and are solely responsible for all federal, state, and local taxes. You are not entitled to any employee benefits.",
  },
  insurance: {
    modalTitle: "Insurance & Liability Disclaimer",
    body:
      "RELEASE OF LIABILITY: You hereby release FixIT from any and all claims, damages, or injuries (property or bodily) arising from your services. FixIT does not provide liability insurance; you are responsible for your own coverage and conduct.",
  },
};

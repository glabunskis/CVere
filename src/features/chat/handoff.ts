type VacancyHandoffInput = {
  vacancyId: string;
  role?: string | null;
  company?: string | null;
};

/**
 * Opening user message for the chat panel when a user clicks "Tailor in chat"
 * from a vacancy page. By the time chat opens, `startVacancyTailor` has already
 * created a new CV from the previously-selected one and made it the selected
 * CV. The agent should edit that selected CV in place; it must not create
 * another CV.
 */
export function buildVacancyTailorPrefill({
  vacancyId,
  role,
  company,
}: VacancyHandoffInput): string {
  const trimmedRole = role?.trim() ?? '';
  const trimmedCompany = company?.trim() ?? '';

  let hook: string;
  if (trimmedRole.length > 0 && trimmedCompany.length > 0) {
    hook = `the ${trimmedRole} role at ${trimmedCompany}`;
  } else if (trimmedRole.length > 0) {
    hook = `the ${trimmedRole} role`;
  } else if (trimmedCompany.length > 0) {
    hook = `the role at ${trimmedCompany}`;
  } else {
    hook = `vacancy ${vacancyId}`;
  }

  return (
    `I want to tailor my CV for ${hook}. ` +
    `A fresh CV has already been created and selected for this vacancy — please ` +
    `read the vacancy and edit the selected CV in place.`
  );
}

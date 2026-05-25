type VacancyHandoffInput = {
  vacancyId: string;
  role?: string | null;
  company?: string | null;
};

export function buildCreateTailoredPrefill(): string {
  return 'Create a new CV for the vacancy I am targeting.';
}

export function buildVacancyTailorPrefill({
  vacancyId,
  role,
  company,
}: VacancyHandoffInput): string {
  const roleCompany = [role, company].filter(Boolean).join(' at ');
  if (roleCompany.length > 0) {
    return `Tailor my CV for vacancy ${vacancyId} (${roleCompany}).`;
  }
  return `Tailor my CV for vacancy ${vacancyId}.`;
}

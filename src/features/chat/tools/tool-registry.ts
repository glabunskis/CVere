export type ToolRegistryEntry = {
  name: string;
  mutates: boolean;
  label: string;
};

export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  // CV Meta
  { name: 'listCvs', mutates: false, label: 'List CVs' },
  { name: 'createCv', mutates: true, label: 'Create CV copy' },

  // Content / Profile
  { name: 'readProfile', mutates: false, label: 'Read CV' },
  { name: 'rewriteSummary', mutates: true, label: 'Rewrite summary' },

  // Experience bullets
  { name: 'editExperienceBullet', mutates: true, label: 'Edit experience bullet' },
  { name: 'addExperienceBullet', mutates: true, label: 'Add experience bullet' },
  { name: 'removeExperienceBullet', mutates: true, label: 'Remove experience bullet' },
  { name: 'moveExperienceBullet', mutates: true, label: 'Move experience bullet' },

  // Project bullets
  { name: 'editProjectBullet', mutates: true, label: 'Edit project bullet' },
  { name: 'addProjectBullet', mutates: true, label: 'Add project bullet' },
  { name: 'removeProjectBullet', mutates: true, label: 'Remove project bullet' },
  { name: 'moveProjectBullet', mutates: true, label: 'Move project bullet' },

  // Experience entries
  { name: 'addExperience', mutates: true, label: 'Add experience' },
  { name: 'editExperience', mutates: true, label: 'Edit experience' },
  { name: 'removeExperience', mutates: true, label: 'Remove experience' },
  { name: 'moveExperience', mutates: true, label: 'Move experience' },

  // Project entries
  { name: 'addProject', mutates: true, label: 'Add project' },
  { name: 'editProject', mutates: true, label: 'Edit project' },
  { name: 'removeProject', mutates: true, label: 'Remove project' },
  { name: 'moveProject', mutates: true, label: 'Move project' },

  // Skills
  { name: 'addSkill', mutates: true, label: 'Add skill' },
  { name: 'editSkill', mutates: true, label: 'Edit skill' },
  { name: 'removeSkill', mutates: true, label: 'Remove skill' },
  { name: 'moveSkill', mutates: true, label: 'Move skill' },

  // Education
  { name: 'addEducation', mutates: true, label: 'Add education' },
  { name: 'editEducation', mutates: true, label: 'Edit education' },
  { name: 'removeEducation', mutates: true, label: 'Remove education' },
  { name: 'moveEducation', mutates: true, label: 'Move education' },

  // Certifications
  { name: 'addCertification', mutates: true, label: 'Add certification' },
  { name: 'editCertification', mutates: true, label: 'Edit certification' },
  { name: 'removeCertification', mutates: true, label: 'Remove certification' },
  { name: 'moveCertification', mutates: true, label: 'Move certification' },

  // Languages
  { name: 'addLanguage', mutates: true, label: 'Add language' },
  { name: 'editLanguage', mutates: true, label: 'Edit language' },
  { name: 'removeLanguage', mutates: true, label: 'Remove language' },
  { name: 'moveLanguage', mutates: true, label: 'Move language' },

  // Identity / Contact
  { name: 'setFullName', mutates: true, label: 'Set full name' },
  { name: 'setLocation', mutates: true, label: 'Set location' },
  { name: 'setPhone', mutates: true, label: 'Set phone' },
  { name: 'setContactEmail', mutates: true, label: 'Set contact email' },
  { name: 'setLinks', mutates: true, label: 'Set links' },

  // Achievements
  { name: 'listPendingAchievements', mutates: false, label: 'List pending achievements' },
  { name: 'integrateAchievement', mutates: true, label: 'Integrate achievement' },
  { name: 'dismissAchievement', mutates: false, label: 'Dismiss achievement' },

  // Vacancies
  { name: 'listVacancies', mutates: false, label: 'List vacancies' },
  { name: 'readVacancy', mutates: false, label: 'Read vacancy' },

  // Style
  { name: 'setTemplate', mutates: true, label: 'Set template' },
  { name: 'setAccentHex', mutates: true, label: 'Set accent color' },
  { name: 'setEducationDateFormat', mutates: true, label: 'Set education date format' },
  { name: 'setCertificationDateFormat', mutates: true, label: 'Set certification date format' },
];

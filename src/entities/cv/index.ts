export type { CvDiff, SectionKey } from './cv-diff';
export { applyCvDiff, computeCvDiff, isEmptyCvDiff } from './cv-diff';
export * from './cv-service';
export type { AiProfile } from './cv-snapshot';
export { aiProfileSchema, buildCvSnapshot } from './cv-snapshot';
export type {
  CertificationRow,
  EducationRow,
  ExperienceRow,
  LanguageRow,
  ProfileChildren,
  ProjectRow,
  SkillRow,
} from './get-cv-children';
export { getCvChildren } from './get-cv-children';
export type { CvLibraryData,CvLibraryItem } from './list-cv-library';
export { listCvs } from './list-cv-library';
export { Cv } from './pdf/Cv';
export type { ProfileContact } from './pdf/primitives';
export { DEFAULT_ACCENT } from './pdf/theme';
export { buildProfileContact, ensureCvPdfPath, renderAndUploadCv } from './render';

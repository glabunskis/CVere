import type {
  CertificationInput,
  ContactInput,
  EducationInput,
  ExperienceInput,
  LanguageInput,
  ProjectInput,
  SkillInput,
} from '@/features/profile-editor';

export type TexImportFile = { name: string; content: string };

export type TexImportResult = {
  summary: string | null;
  contact: ContactInput | null;
  experience: ExperienceInput[];
  projects: ProjectInput[];
  skills: SkillInput[];
  /** Distinct skill category names in first-seen order (seeds cv.skill_categories). */
  skillCategories: string[];
  education: EducationInput[];
  certifications: CertificationInput[];
  languages: LanguageInput[];
  warnings: string[];
};

const SECTION_BASENAMES = new Set([
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certs',
  'certifications',
  'lang',
  'languages',
]);

export function parseTexImport(files: TexImportFile[]): TexImportResult {
  const warnings: string[] = [];
  const result: TexImportResult = {
    summary: null,
    contact: null,
    experience: [],
    projects: [],
    skills: [],
    skillCategories: [],
    education: [],
    certifications: [],
    languages: [],
    warnings,
  };

  if (files.length === 0) {
    warnings.push('No files received.');
    return result;
  }

  // Index files by basename (lowercased, no extension) for tolerant lookup.
  const byBasename = new Map<string, string>();
  for (const file of files) {
    const base = basename(file.name).toLowerCase();
    byBasename.set(base, file.content);
  }

  const summaryContent = byBasename.get('summary');
  if (summaryContent) {
    result.summary = parseSummary(summaryContent, warnings);
  }

  const experienceContent = byBasename.get('experience');
  if (experienceContent) {
    result.experience = parseExperience(experienceContent, warnings);
  }

  const projectsContent = byBasename.get('projects') ?? byBasename.get('project');
  if (projectsContent) {
    result.projects = parseProjects(projectsContent, warnings);
  }

  const skillsContent = byBasename.get('skills') ?? byBasename.get('skill');
  if (skillsContent) {
    result.skills = parseSkills(skillsContent, warnings);
    const seen = new Set<string>();
    for (const skill of result.skills) {
      const category = skill.category?.trim();
      if (category && !seen.has(category)) {
        seen.add(category);
        result.skillCategories.push(category);
      }
    }
  }

  const educationContent = byBasename.get('education');
  if (educationContent) {
    result.education = parseEducation(educationContent, warnings);
  }

  const certsContent = byBasename.get('certs') ?? byBasename.get('certifications');
  if (certsContent) {
    result.certifications = parseCertifications(certsContent, warnings);
  }

  const langContent = byBasename.get('lang') ?? byBasename.get('languages');
  if (langContent) {
    result.languages = parseLanguages(langContent, warnings);
  }

  // If we found a root file (containing \documentclass) but none of the sections,
  // surface a warning so the user knows we couldn't resolve \input{} files.
  const rootFile = files.find((f) => /\\documentclass/.test(f.content));
  if (rootFile) {
    const inputs = Array.from(rootFile.content.matchAll(/\\input\{([^}]+)\}/g)).map((m) => m[1]);
    const missing = inputs.filter((p) => {
      const base = basename(p).toLowerCase().replace(/\.tex$/, '');
      if (!SECTION_BASENAMES.has(base)) return false;
      return !byBasename.has(base);
    });
    if (missing.length > 0) {
      warnings.push(
        `Root .tex references files not included in upload: ${missing.join(', ')}. Upload them together (or as a .zip).`,
      );
    }
    const contact = parseHeaderContact(rootFile.content);
    if (contact) {
      result.contact = contact;
    }
  }

  return result;
}

// =============================================================================
// Header contact extraction
// =============================================================================

function parseHeaderContact(rootContent: string): ContactInput | null {
  // Header lives between \begin{center} ... \end{center} in the example layouts.
  const centerMatch = rootContent.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
  const block = centerMatch ? centerMatch[1] : rootContent;
  if (!/\\fa(?:Envelope|Phone|Linkedin|Github|MapMarker|Globe)/.test(block)) {
    return null;
  }

  const contact: ContactInput = {
    fullName: null,
    location: null,
    phone: null,
    contactEmail: null,
    linkedinUrl: null,
    githubUrl: null,
    websiteUrl: null,
  };

  for (const segment of splitHeaderSegments(block)) {
    if (/\\faMapMarker/.test(segment)) {
      contact.location = stripIcons(segment) || null;
    } else if (/\\faEnvelope/.test(segment)) {
      contact.contactEmail = extractHrefTarget(segment, 'mailto:') ?? extractEmail(segment);
    } else if (/\\faPhone/.test(segment)) {
      contact.phone = stripIcons(segment) || null;
    } else if (/\\faLinkedin/.test(segment)) {
      const href = extractHrefRaw(segment);
      contact.linkedinUrl = href ?? completeUrl(stripIcons(segment), 'https://www.linkedin.com/in/');
    } else if (/\\faGithub/.test(segment)) {
      const href = extractHrefRaw(segment);
      contact.githubUrl = href ?? completeUrl(stripIcons(segment), 'https://github.com/');
    } else if (/\\faGlobe/.test(segment)) {
      contact.websiteUrl = extractHrefRaw(segment) ?? null;
    }
  }

  const hasAny = Object.values(contact).some((value) => value && String(value).length > 0);
  return hasAny ? contact : null;
}

function splitHeaderSegments(block: string): string[] {
  // Authors typically separate header items with \quad / \qquad / `|`. Keep
  // groups roughly aligned with each `\fa…` icon command.
  return block
    .split(/\\quad|\\qquad|\\hfill|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function stripIcons(segment: string): string {
  return unwrapLatex(segment).trim();
}

function extractHrefRaw(segment: string): string | null {
  const m = segment.match(/\\href\{([^}]+)\}/);
  return m ? m[1].trim() : null;
}

function extractHrefTarget(segment: string, scheme: string): string | null {
  const raw = extractHrefRaw(segment);
  if (!raw) return null;
  return raw.startsWith(scheme) ? raw.slice(scheme.length) : raw;
}

function extractEmail(segment: string): string | null {
  const text = stripIcons(segment);
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : null;
}

function completeUrl(handle: string, prefix: string): string | null {
  if (!handle) return null;
  if (/^https?:\/\//i.test(handle)) return handle;
  return `${prefix}${handle.replace(/^@/, '')}`;
}

// =============================================================================
// Helpers
// =============================================================================

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const file = idx >= 0 ? path.slice(idx + 1) : path;
  return file.replace(/\.tex$/i, '');
}

function stripComments(text: string): string {
  // Strip LaTeX line comments while preserving \% escapes.
  return text
    .split('\n')
    .map((line) => {
      let out = '';
      let i = 0;
      while (i < line.length) {
        const ch = line[i];
        if (ch === '\\' && line[i + 1] === '%') {
          out += '\\%';
          i += 2;
          continue;
        }
        if (ch === '%') break;
        out += ch;
        i++;
      }
      return out;
    })
    .join('\n');
}

function unwrapLatex(text: string): string {
  return text
    // Drop common formatting commands that have no semantic meaning here.
    .replace(/\\(?:textbf|textit|emph|underline|small|large|Large|huge|Huge)\{([^{}]*)\}/g, '$1')
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\url\{([^}]*)\}/g, '$1')
    .replace(/\\&/g, '&')
    .replace(/~/g, ' ')
    // LaTeX line break, optionally with [4pt]-style spacing.
    .replace(/\\\\\s*(?:\[[^\]]*\])?/g, ' ')
    .replace(/\\quad|\\qquad|\\hfill|\\bigskip|\\medskip|\\smallskip|\\noindent/g, ' ')
    .replace(/\\vspace\*?\{[^}]*\}/g, '')
    .replace(/\\hspace\*?\{[^}]*\}/g, '')
    .replace(/\\faEnvelope|\\faPhone|\\faLinkedin|\\faMapMarker\*?|\\faGithub|\\faGlobe/g, '')
    .replace(/\{|\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dropSectionHeaders(text: string): string {
  return text.replace(/\\section\*?\{[^}]*\}/g, '');
}

function parseSummary(content: string, _warnings: string[]): string | null {
  const cleaned = dropSectionHeaders(stripComments(content)).trim();
  const text = unwrapLatex(cleaned);
  return text.length > 0 ? text : null;
}

function splitItems(itemize: string): string[] {
  // Expects the body of an itemize block (without \begin{itemize}/\end{itemize}).
  const items = itemize
    .split(/\\item\b/g)
    .map((s) => unwrapLatex(s))
    .filter((s) => s.length > 0);
  return items;
}

function extractItemize(text: string): { before: string; items: string[]; after: string } {
  // Allow an optional argument like \begin{itemize}[leftmargin=*] so it is not
  // captured as the first item.
  const match = text.match(/\\begin\{itemize\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{itemize\}/);
  if (!match) return { before: text, items: [], after: '' };
  const items = splitItems(match[1]);
  const before = text.slice(0, match.index ?? 0);
  const after = text.slice((match.index ?? 0) + match[0].length);
  return { before, items, after };
}

function parseExperience(content: string, warnings: string[]): ExperienceInput[] {
  const cleaned = dropSectionHeaders(stripComments(content));

  // Primary format (matches Examples/elements/experience.tex):
  //   \textbf{Role} \hfill \textit{Company, Location}\\
  //   \textit{Date Range}
  //   \begin{itemize} \item ... \end{itemize}
  const newRegex = /\\textbf\{([^}]+)\}\s*\\hfill\s*\\textit\{([^}]+)\}/g;

  type Header = {
    role: string;
    companyRaw: string;
    headerStart: number;
    headerEnd: number;
  };

  const headers: Header[] = [];
  let m: RegExpExecArray | null;
  while ((m = newRegex.exec(cleaned)) !== null) {
    headers.push({
      role: unwrapLatex(m[1]).trim(),
      companyRaw: unwrapLatex(m[2]).trim(),
      headerStart: m.index,
      headerEnd: m.index + m[0].length,
    });
  }

  if (headers.length > 0) {
    const entries: ExperienceInput[] = [];
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const blockEnd = i + 1 < headers.length ? headers[i + 1].headerStart : cleaned.length;
      const body = cleaned.slice(h.headerEnd, blockEnd);

      const { company, location } = splitCompanyLocation(h.companyRaw);

      // First \textit{...} in the body that contains a year is treated as the date range.
      const dateMatch = body.match(/\\textit\{([^}]+)\}/);
      const dates = dateMatch ? unwrapLatex(dateMatch[1]).trim() : '';
      const { startDate, endDate, isCurrent } = parseDateRange(dates);

      const { items: bullets } = extractItemize(body);

      entries.push({
        position: i,
        company,
        role: h.role,
        location,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        isCurrent,
        summary: null,
        bullets,
        stack: [],
      });
    }
    return entries;
  }

  // Fallback for an older inline format:
  //   \textbf{Role} \hfill <dates>\\ \textit{Company} \hfill <location>
  const oldRegex = /\\textbf\{([^}]+)\}\s*\\hfill\s*([^\\\n]+)\\\\?\s*\\textit\{([^}]+)\}\s*(?:\\hfill\s*([^\\\n]+))?/g;
  const oldMatches: { m: RegExpExecArray; start: number; end: number }[] = [];
  while ((m = oldRegex.exec(cleaned)) !== null) {
    oldMatches.push({ m, start: m.index, end: m.index + m[0].length });
  }
  if (oldMatches.length === 0) {
    warnings.push('No experience entries detected (expected \\textbf{Role} \\hfill \\textit{Company, Location} blocks).');
    return [];
  }

  const entries: ExperienceInput[] = [];
  for (let i = 0; i < oldMatches.length; i++) {
    const { m: match, end } = oldMatches[i];
    const blockEnd = i + 1 < oldMatches.length ? oldMatches[i + 1].start : cleaned.length;
    const body = cleaned.slice(end, blockEnd);

    const role = unwrapLatex(match[1]).trim();
    const dates = unwrapLatex(match[2]).trim();
    const company = unwrapLatex(match[3]).trim();
    const location = match[4] ? unwrapLatex(match[4]).trim() : null;

    const { startDate, endDate, isCurrent } = parseDateRange(dates);
    const { items: bullets } = extractItemize(body);

    entries.push({
      position: i,
      company,
      role,
      location,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      isCurrent,
      summary: null,
      bullets,
      stack: [],
    });
  }

  return entries;
}

function splitCompanyLocation(raw: string): { company: string; location: string | null } {
  const trimmed = raw.trim();
  const idx = trimmed.lastIndexOf(',');
  if (idx === -1) return { company: trimmed, location: null };
  const company = trimmed.slice(0, idx).trim();
  const location = trimmed.slice(idx + 1).trim() || null;
  return { company: company || trimmed, location };
}

function parseProjects(content: string, warnings: string[]): ProjectInput[] {
  const cleaned = dropSectionHeaders(stripComments(content));
  // Each project: \textbf{Name} ... \begin{itemize} \item ... \end{itemize}
  const headerRegex = /\\textbf\{([^}]+)\}/g;
  const headers: { name: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(cleaned)) !== null) {
    headers.push({ name: unwrapLatex(m[1]).trim(), start: m.index, end: m.index + m[0].length });
  }
  if (headers.length === 0) {
    warnings.push('No projects detected (expected \\textbf{Name} blocks).');
    return [];
  }

  const projects: ProjectInput[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const blockEnd = i + 1 < headers.length ? headers[i + 1].start : cleaned.length;
    const body = cleaned.slice(h.end, blockEnd);
    const { before, items, after } = extractItemize(body);
    const description = unwrapLatex(`${before} ${after}`).trim() || null;

    projects.push({
      position: i,
      name: h.name,
      description,
      link: null,
      bullets: items,
      stack: [],
    });
  }

  return projects;
}

function parseSkills(content: string, warnings: string[]): SkillInput[] {
  const cleaned = dropSectionHeaders(stripComments(content));
  // Supports both \textbf{Category:} a, b, c \\  and  \textbf{Category}: a, b, c \\
  const lineRegex = /\\textbf\{([^}]+?)\}\s*:?\s*([^\\\n]+)/g;
  const out: SkillInput[] = [];
  let position = 0;
  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(cleaned)) !== null) {
    const category = unwrapLatex(m[1]).replace(/:\s*$/, '').trim();
    const items = unwrapLatex(m[2])
      .replace(/^:\s*/, '')
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of items) {
      out.push({ position: position++, name: name.slice(0, 120), category });
    }
  }
  if (out.length === 0) {
    // Fallback: comma-separated bare list
    const flat = unwrapLatex(cleaned)
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 120);
    if (flat.length > 0) {
      flat.forEach((name, i) => out.push({ position: i, name, category: null }));
    } else {
      warnings.push('No skills detected.');
    }
  }
  return out;
}

function parseEducation(content: string, warnings: string[]): EducationInput[] {
  const cleaned = dropSectionHeaders(stripComments(content));

  // Find all \textbf{...} as entry boundaries.
  const headerRegex = /\\textbf\{([^}]+)\}/g;
  type Header = { raw: string; start: number; end: number };
  const headers: Header[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(cleaned)) !== null) {
    headers.push({ raw: m[1], start: m.index, end: m.index + m[0].length });
  }
  if (headers.length === 0) {
    warnings.push('No education entries detected.');
    return [];
  }

  const out: EducationInput[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const blockEnd = i + 1 < headers.length ? headers[i + 1].start : cleaned.length;
    const body = cleaned.slice(h.end, blockEnd);

    const headerText = unwrapLatex(h.raw).trim();
    const textitMatch = body.match(/\\textit\{([^}]+)\}/);
    const textitText = textitMatch ? unwrapLatex(textitMatch[1]).trim() : '';
    const plainPart = textitMatch ? body.slice(0, textitMatch.index ?? 0) : body;
    const plain = unwrapLatex(plainPart)
      // Trim trailing em/en/hyphen separator commonly used before the date.
      .replace(/\s*[\u2014\u2013-]+\s*$/g, '')
      .trim();

    let institution: string;
    let degree: string | null;
    let field: string | null = null;
    let startDate: string | undefined;
    let endDate: string | undefined;

    const textitLooksLikeDate = !!textitText && /\b\d{4}\b/.test(textitText);

    if (textitLooksLikeDate) {
      // Primary format (matches Examples/elements/education.tex):
      //   \textbf{Degree}\\
      //   Institution[, Location] [—|--] \textit{Date}
      degree = headerText || null;
      // Keep location attached to the institution; we have no separate location slot here.
      institution = plain || headerText;
      ({ startDate, endDate } = parseDateRange(textitText));
    } else {
      // Older format: \textbf{Institution} \hfill <dates> \\ \textit{Degree, Field}
      institution = headerText;
      const [d, ...rest] = textitText.split(',').map((s) => s.trim()).filter(Boolean);
      degree = d || null;
      field = rest.join(', ') || null;
      ({ startDate, endDate } = parseDateRange(plain));
    }

    if (!institution && !degree) continue;

    out.push({
      position: out.length,
      institution: institution.slice(0, 200),
      degree: degree ? degree.slice(0, 200) : null,
      field: field ? field.slice(0, 200) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      summary: null,
    });
  }

  if (out.length === 0) warnings.push('No education entries detected.');
  return out;
}

function parseCertifications(content: string, warnings: string[]): CertificationInput[] {
  const cleaned = dropSectionHeaders(stripComments(content));

  // Find each \textbf{...} as a certification block boundary.
  const headerRegex = /\\textbf\{([^}]+)\}/g;
  type Header = { raw: string; endsWithColon: boolean; start: number; end: number };
  const headers: Header[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(cleaned)) !== null) {
    const raw = m[1];
    headers.push({
      raw,
      endsWithColon: /:\s*$/.test(unwrapLatex(raw)),
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  if (headers.length === 0) {
    warnings.push('No certifications detected.');
    return [];
  }

  const out: CertificationInput[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const blockEnd = i + 1 < headers.length ? headers[i + 1].start : cleaned.length;
    const body = cleaned.slice(h.end, blockEnd);
    const headerText = unwrapLatex(h.raw).replace(/:\s*$/, '').trim();
    const bodyText = unwrapLatex(body).replace(/^[\s,\-\u2014\u2013]+/, '').trim();

    let name = '';
    let issuer: string | null = null;
    let issuedAt: string | null = null;

    if (h.endsWithColon && bodyText) {
      // Primary format: \textbf{Issuer:}\\ Name, Year
      issuer = headerText || null;
      const parts = bodyText.split(',').map((s) => s.trim()).filter(Boolean);
      const yearIdx = parts.findIndex((p) => /\b\d{4}\b/.test(p) && !/[A-Za-z]{3,}/.test(p));
      if (yearIdx >= 0) {
        issuedAt = normalizeIssuedDate(parts[yearIdx]);
        parts.splice(yearIdx, 1);
      }
      name = parts.join(', ').trim();
    } else {
      // Fallback: \textbf{Name} -- Issuer, <date>  or  \textbf{Name}, Issuer, <date>
      name = headerText;
      const parts = bodyText.split(/[,\u2014\u2013-]/).map((s) => s.trim()).filter(Boolean);
      const yearIdx = parts.findIndex((p) => /\b\d{4}\b/.test(p));
      if (yearIdx >= 0) {
        issuedAt = normalizeIssuedDate(parts[yearIdx]);
        parts.splice(yearIdx, 1);
      }
      issuer = parts[0] || null;
    }

    if (!name) continue;
    out.push({
      position: out.length,
      name: name.slice(0, 200),
      issuer: issuer ? issuer.slice(0, 200) : null,
      issuedAt,
      expiresAt: null,
      link: null,
    });
  }

  if (out.length === 0) warnings.push('No certifications detected.');
  return out;
}

function parseLanguages(content: string, warnings: string[]): LanguageInput[] {
  const cleaned = dropSectionHeaders(stripComments(content));
  const out: LanguageInput[] = [];

  // Primary format (matches Examples/elements/lang.tex):
  //   \textbf{Russian:} Native\\
  //   \textbf{English, Latvian:} Fluent\\
  // Multiple languages may share a level via comma-separated names inside \textbf{}.
  const lineRegex = /\\textbf\{([^}]+?)\}\s*:?\s*([^\\\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(cleaned)) !== null) {
    const namesRaw = unwrapLatex(m[1]).replace(/:\s*$/, '').trim();
    const levelRaw = unwrapLatex(m[2]).replace(/^:\s*/, '').trim();
    const proficiency = levelRaw ? mapProficiency(levelRaw) : null;
    if (levelRaw && !proficiency) {
      warnings.push(`Unknown language proficiency "${levelRaw}" for ${namesRaw}.`);
    }
    const names = namesRaw.split(',').map((s) => s.trim()).filter((s) => s && s.length <= 120);
    for (const name of names) {
      out.push({ position: out.length, name, proficiency });
    }
  }

  // Fallback: comma- or bullet-separated entries like "English (native), German (B1)".
  if (out.length === 0) {
    const flat = unwrapLatex(cleaned);
    const tokens = flat.split(/[,;\u2022\n]/).map((s) => s.trim()).filter(Boolean);
    for (const token of tokens) {
      const tm = token.match(/^([^\(]+?)\s*(?:\(([^)]+)\))?$/);
      if (!tm) continue;
      const name = tm[1].trim();
      if (!name || name.length > 120) continue;
      const proficiency = tm[2] ? mapProficiency(tm[2].trim()) : null;
      if (tm[2] && !proficiency) {
        warnings.push(`Unknown language proficiency "${tm[2]}" for ${name}.`);
      }
      out.push({ position: out.length, name, proficiency });
    }
  }

  if (out.length === 0) warnings.push('No languages detected.');
  return out;
}

function parseDateRange(text: string): { startDate?: string; endDate?: string; isCurrent: boolean } {
  if (!text) return { isCurrent: false };
  const isCurrent = /present|current|now/i.test(text);
  // Find tokens like "Jan 2022", "2022-01", "2022/01", or "2022".
  const dateToken = /([A-Za-z]+\.?\s+\d{4}|\d{4}[-/](?:\d{1,2})|\d{4})/g;
  const tokens = text.match(dateToken) ?? [];
  const [start, end] = tokens;
  return {
    startDate: normalizeDate(start),
    endDate: isCurrent ? undefined : normalizeDate(end),
    isCurrent,
  };
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
};

function normalizeDate(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const t = token.trim();
  // YYYY-MM or YYYY/MM
  let m = t.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-01`;
  // Month YYYY or Month. YYYY
  m = t.match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) return `${m[2]}-${month}-01`;
  }
  // YYYY only
  m = t.match(/^(\d{4})$/);
  if (m) return `${m[1]}-01-01`;
  return undefined;
}

function normalizeIssuedDate(token: string): string | null {
  return normalizeDate(token) ?? null;
}

function mapProficiency(text: string): LanguageInput['proficiency'] | null {
  const normalized = text.toLowerCase().trim();
  const direct = ['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced', 'native'] as const;
  for (const level of direct) if (normalized === level) return level;
  if (/^a1$/.test(normalized)) return 'beginner';
  if (/^a2$/.test(normalized)) return 'elementary';
  if (/^b1$/.test(normalized)) return 'intermediate';
  if (/^b2$/.test(normalized)) return 'upper_intermediate';
  if (/^c1$/.test(normalized)) return 'advanced';
  if (/^c2$/.test(normalized)) return 'native';
  if (/native|mother\s*tongue/.test(normalized)) return 'native';
  if (/fluent|advanced|proficient/.test(normalized)) return 'advanced';
  if (/upper\s*intermediate|upper-intermediate/.test(normalized)) return 'upper_intermediate';
  if (/intermediate/.test(normalized)) return 'intermediate';
  if (/elementary|basic/.test(normalized)) return 'elementary';
  if (/beginner/.test(normalized)) return 'beginner';
  return null;
}

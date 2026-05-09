import { Badge } from '@/components/ui/badge';
import type { AiProfile } from '@/libs/ai/types';

type Props = {
  snapshot: AiProfile;
  emphasis?: string[];
  experienceOrder?: string[];
  projectsOrder?: string[];
  skillsOrder?: string[];
};

function applyOrder<T extends { id: string }>(items: T[], order: string[] | undefined): T[] {
  if (!order || order.length === 0) return items;
  const byId = new Map(items.map((item) => [item.id, item] as const));
  const ordered: T[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  for (const item of byId.values()) ordered.push(item);
  return ordered;
}

function emphasised(text: string, emphasis: string[]): string {
  return text;
  // Visual emphasis is decorative; we keep the original copy. The list is exposed below.
  // Including this helper for future use without changing copy.
  void emphasis;
}

export function SnapshotView({ snapshot, emphasis = [], experienceOrder, projectsOrder, skillsOrder }: Props) {
  const experiences = applyOrder(snapshot.experience ?? [], experienceOrder);
  const projects = applyOrder(snapshot.projects ?? [], projectsOrder);
  const skills = applyOrder(snapshot.skills ?? [], skillsOrder);

  return (
    <div className='flex flex-col gap-6 rounded-xl border bg-card p-4'>
      <header className='flex items-center justify-between gap-2'>
        <h3 className='text-base font-semibold'>Snapshot (read-only)</h3>
        {emphasis.length ? (
          <div className='flex flex-wrap gap-1'>
            {emphasis.map((term) => (
              <Badge key={term} variant='secondary'>
                {term}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      {snapshot.summary ? (
        <section>
          <h4 className='mb-1 text-sm font-medium text-muted-foreground'>Profile summary at snapshot</h4>
          <p className='text-sm whitespace-pre-wrap'>{emphasised(snapshot.summary, emphasis)}</p>
        </section>
      ) : null}

      {experiences.length ? (
        <section>
          <h4 className='mb-2 text-sm font-medium text-muted-foreground'>Experience</h4>
          <ul className='flex flex-col gap-3'>
            {experiences.map((exp) => (
              <li key={exp.id} className='rounded-lg border p-3'>
                <p className='text-sm font-semibold'>
                  {exp.role} <span className='text-muted-foreground'>at {exp.company}</span>
                </p>
                <p className='text-xs text-muted-foreground'>
                  {exp.startDate ?? '[MISSING]'} - {exp.isCurrent ? 'Present' : (exp.endDate ?? '[MISSING]')}
                  {exp.location ? ` - ${exp.location}` : ''}
                </p>
                {exp.summary ? <p className='mt-1 text-sm whitespace-pre-wrap'>{exp.summary}</p> : null}
                {exp.bullets.length ? (
                  <ul className='ml-4 mt-1 list-disc text-sm'>
                    {exp.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {exp.stack.length ? (
                  <p className='mt-1 text-xs text-muted-foreground'>Stack: {exp.stack.join(', ')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {projects.length ? (
        <section>
          <h4 className='mb-2 text-sm font-medium text-muted-foreground'>Projects</h4>
          <ul className='flex flex-col gap-3'>
            {projects.map((project) => (
              <li key={project.id} className='rounded-lg border p-3'>
                <p className='text-sm font-semibold'>{project.name}</p>
                {project.description ? <p className='text-sm whitespace-pre-wrap'>{project.description}</p> : null}
                {project.bullets.length ? (
                  <ul className='ml-4 list-disc text-sm'>
                    {project.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {project.stack.length ? (
                  <p className='text-xs text-muted-foreground'>Stack: {project.stack.join(', ')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {skills.length ? (
        <section>
          <h4 className='mb-1 text-sm font-medium text-muted-foreground'>Skills</h4>
          <ul className='flex flex-wrap gap-2 text-sm'>
            {skills.map((skill) => (
              <li key={skill.id} className='rounded-md border px-2 py-1'>
                <span className='font-medium'>{skill.name}</span>
                {skill.level ? <span className='text-muted-foreground'> - {skill.level}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(snapshot.education ?? []).length ? (
        <section>
          <h4 className='mb-1 text-sm font-medium text-muted-foreground'>Education</h4>
          <ul className='flex flex-col gap-2 text-sm'>
            {snapshot.education?.map((edu) => (
              <li key={edu.id}>
                <span className='font-medium'>{edu.institution}</span>
                {edu.degree ? <span className='text-muted-foreground'> - {edu.degree}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

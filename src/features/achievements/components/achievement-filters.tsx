'use client';

import { parseAsStringEnum, useQueryState } from 'nuqs';

import { Select } from '@/components/ui/select';

import { achievementSectionSchema, achievementStatusSchema } from '../schemas';

const STATUS_OPTIONS = ['all', ...achievementStatusSchema.options] as const;
const SECTION_OPTIONS = ['all', ...achievementSectionSchema.options] as const;

const statusParser = parseAsStringEnum<(typeof STATUS_OPTIONS)[number]>([...STATUS_OPTIONS]).withDefault('pending');
const sectionParser = parseAsStringEnum<(typeof SECTION_OPTIONS)[number]>([...SECTION_OPTIONS]).withDefault('all');

export function AchievementFilters() {
  const [status, setStatus] = useQueryState('status', statusParser.withOptions({ shallow: false }));
  const [section, setSection] = useQueryState('section', sectionParser.withOptions({ shallow: false }));

  return (
    <div className='flex flex-wrap items-end gap-2'>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-muted-foreground'>Status</label>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])}
        >
          {STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-muted-foreground'>Section</label>
        <Select
          value={section}
          onChange={(event) => setSection(event.target.value as (typeof SECTION_OPTIONS)[number])}
        >
          {SECTION_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

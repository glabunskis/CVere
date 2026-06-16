'use client';

import { parseAsStringEnum, useQueryState } from 'nuqs';

import { achievementSectionSchema, achievementStatusSchema } from '@/entities/achievement/schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

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
          onValueChange={(value) => setStatus(value as (typeof STATUS_OPTIONS)[number])}
        >
          <SelectTrigger className='min-w-[140px] capitalize'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((value) => (
              <SelectItem key={value} value={value} className='capitalize'>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-muted-foreground'>Section</label>
        <Select
          value={section}
          onValueChange={(value) => setSection(value as (typeof SECTION_OPTIONS)[number])}
        >
          <SelectTrigger className='min-w-[140px] capitalize'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_OPTIONS.map((value) => (
              <SelectItem key={value} value={value} className='capitalize'>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

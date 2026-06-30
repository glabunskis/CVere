'use client';

import { Fragment, useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { GripVertical, Plus, X } from 'lucide-react';
import type React from 'react';
import { toast } from 'sonner';

import type { SkillRow } from '@/entities/cv';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  type Active,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  type Over,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  quickAddSkill,
  renameSkill,
  renameSkillCategory,
  reorderSkills,
  setSkillCategories,
} from '../actions/skill-actions';
import { deleteProfileChild } from '../actions/update-profile-section';
import { refreshCvPreview } from '../lib/refresh-preview';

import { SectionShell } from './section-shell';

type Props = { items: SkillRow[]; skillCategories: string[]; readOnly?: boolean };

type Skill = { id: string; name: string; category: string | null };

const UNCATEGORISED = '__uncategorised__';
const CATEGORY_DRAG_PREFIX = 'catdrag:';

type Container = { containerId: string; category: string | null; title: string };

/** Container id for a category name (or the uncategorised sentinel). */
function containerIdFor(category: string | null): string {
  return category === null ? UNCATEGORISED : `cat:${category}`;
}

/**
 * Draggable id for a category header. Kept in a separate namespace from skill
 * ids and skill drop-container ids so a single `DndContext` can tell a
 * category reorder apart from a skill move.
 */
function categoryDragId(category: string): string {
  return `${CATEGORY_DRAG_PREFIX}${category}`;
}

function isCategoryDragId(id: string): boolean {
  return id.startsWith(CATEGORY_DRAG_PREFIX);
}

function categoryFromDragId(id: string): string {
  return id.slice(CATEGORY_DRAG_PREFIX.length);
}

/** Target container + slot index for the live drop caret. */
type DropIndicator = { containerId: string; index: number };

/**
 * True when the dragged chip's centre has moved past the hovered chip's centre,
 * so the caret should sit after it rather than before. Uses the row (vertical)
 * axis first to behave sensibly in a wrapping layout, then the horizontal axis
 * within the same row.
 */
function isAfterOver(active: Active, over: Over): boolean {
  const a = active.rect.current.translated;
  const o = over.rect;
  if (!a) return false;
  const aCenterY = a.top + a.height / 2;
  const oCenterY = o.top + o.height / 2;
  if (Math.abs(aCenterY - oCenterY) > o.height / 2) return aCenterY > oCenterY;
  return a.left + a.width / 2 > o.left + o.width / 2;
}

/**
 * Builds the ordered container list (persisted categories first, then the
 * always-present Uncategorised zone) and buckets skills into them. Skills whose
 * category is null or not in the list fall back to Uncategorised.
 */
function buildLayout(skills: Skill[], categories: string[]) {
  const known = new Set(categories);
  const containers: Container[] = categories.map((name) => ({
    containerId: containerIdFor(name),
    category: name,
    title: name,
  }));
  containers.push({ containerId: UNCATEGORISED, category: null, title: 'Uncategorised' });

  const byContainer = new Map<string, Skill[]>();
  for (const c of containers) byContainer.set(c.containerId, []);
  for (const skill of skills) {
    const effective = skill.category && known.has(skill.category) ? skill.category : null;
    byContainer.get(containerIdFor(effective))!.push(skill);
  }
  return { containers, byContainer };
}

export function SkillEditor({ items, skillCategories, readOnly = false }: Props) {
  const signature = JSON.stringify({ items, skillCategories });
  const [synced, setSynced] = useState(signature);
  const [skills, setSkills] = useState<Skill[]>(() =>
    items.map((row) => ({ id: row.id, name: row.name, category: row.category })),
  );
  const [categories, setCategories] = useState<string[]>(skillCategories);

  // Resync optimistic state when the server sends fresh props (e.g. after a
  // chat edit or undo/redo revalidates the route). Adjusting state during
  // render is the documented React pattern for "reset state on prop change".
  if (signature !== synced) {
    setSynced(signature);
    setSkills(items.map((row) => ({ id: row.id, name: row.name, category: row.category })));
    setCategories(skillCategories);
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  // Where a dragged skill would land: the target container and the slot index
  // (in that container's rendered order) the drop caret should appear at.
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const { execute: runReorder } = useAction(reorderSkills, {
    onSuccess: () => refreshCvPreview(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to reorder'),
  });
  const { execute: runSetCategories } = useAction(setSkillCategories, {
    onSuccess: () => refreshCvPreview(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to update categories'),
  });
  const { execute: runRenameCategory } = useAction(renameSkillCategory, {
    onSuccess: () => refreshCvPreview(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to rename category'),
  });

  const { containers, byContainer } = buildLayout(skills, categories);

  function findContainer(id: string): string | null {
    if (byContainer.has(id)) return id;
    const skill = skills.find((s) => s.id === id);
    if (!skill) return null;
    const known = new Set(categories);
    const effective = skill.category && known.has(skill.category) ? skill.category : null;
    return containerIdFor(effective);
  }

  function categoryForContainer(containerId: string): string | null {
    return containers.find((c) => c.containerId === containerId)?.category ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  /**
   * Resolves where a dragged skill would land: the target container and the
   * insertion slot index within that container's rendered order (which still
   * includes the active chip when reordering inside its own category). Returns
   * null for category drags or unknown targets.
   */
  function resolveSkillDrop(active: Active, over: Over | null): DropIndicator | null {
    if (!over || isCategoryDragId(String(active.id))) return null;
    const overIdStr = String(over.id);
    const containerId = findContainer(overIdStr) ?? (byContainer.has(overIdStr) ? overIdStr : null);
    if (!containerId) return null;

    const bucket = byContainer.get(containerId)!;
    // Dropping onto the container zone itself (empty area) → end of the list.
    if (byContainer.has(overIdStr)) return { containerId, index: bucket.length };

    const overIndex = bucket.findIndex((s) => s.id === overIdStr);
    if (overIndex === -1) return { containerId, index: bucket.length };
    // Insert after the hovered chip when the pointer has passed its centre, so
    // the caret tracks the side the user is aiming at.
    return { containerId, index: isAfterOver(active, over) ? overIndex + 1 : overIndex };
  }

  function handleDragOver(event: DragOverEvent) {
    setDropIndicator(resolveSkillDrop(event.active, event.over));
  }

  function handleCategoryReorder(activeIdStr: string, overIdStr: string) {
    const activeCategory = categoryFromDragId(activeIdStr);
    const oldIndex = categories.indexOf(activeCategory);
    if (oldIndex === -1) return;

    // Resolve the drop target to a category. Dropping over the Uncategorised
    // zone (or anything outside the named categories) moves it to the end.
    let overCategory: string | null;
    if (isCategoryDragId(overIdStr)) {
      overCategory = categoryFromDragId(overIdStr);
    } else {
      const overContainer =
        findContainer(overIdStr) ?? (byContainer.has(overIdStr) ? overIdStr : null);
      overCategory = overContainer ? categoryForContainer(overContainer) : null;
    }

    const newIndex = overCategory === null ? categories.length - 1 : categories.indexOf(overCategory);
    if (newIndex === -1 || oldIndex === newIndex) return;

    const next = arrayMove(categories, oldIndex, newIndex);
    setCategories(next);
    runSetCategories({ categories: next });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setDropIndicator(null);
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);

    if (isCategoryDragId(activeIdStr)) {
      handleCategoryReorder(activeIdStr, String(over.id));
      return;
    }

    const drop = resolveSkillDrop(active, over);
    if (!drop) return;

    const movingSkill = skills.find((s) => s.id === activeIdStr);
    if (!movingSkill) return;
    const moved: Skill = { ...movingSkill, category: categoryForContainer(drop.containerId) };

    // Rebuild the flat, ordered list. The drop index is measured against the
    // target container's rendered order (which includes the active chip when
    // reordering in place), so when the active chip sits before the caret we
    // shift the insert point left by one after removing it.
    const next: Skill[] = [];
    for (const container of containers) {
      if (container.containerId !== drop.containerId) {
        next.push(...byContainer.get(container.containerId)!.filter((s) => s.id !== activeIdStr));
        continue;
      }

      const bucket = byContainer.get(container.containerId)!;
      const activeIndex = bucket.findIndex((s) => s.id === activeIdStr);
      const without = bucket.filter((s) => s.id !== activeIdStr);
      let insertAt = drop.index;
      if (activeIndex !== -1 && activeIndex < drop.index) insertAt -= 1;
      insertAt = Math.max(0, Math.min(insertAt, without.length));
      without.splice(insertAt, 0, moved);
      next.push(...without);
    }

    setSkills(next);
    runReorder({ items: next.map((s) => ({ id: s.id, category: s.category })) });
  }

  function handleAddCategory(name: string) {
    const trimmed = name.trim();
    setAddingCategory(false);
    if (trimmed.length === 0 || categories.includes(trimmed)) return;
    const next = [...categories, trimmed];
    setCategories(next);
    runSetCategories({ categories: next });
  }

  function handleDeleteCategory(name: string) {
    const next = categories.filter((c) => c !== name);
    setCategories(next);
    // Skills in the removed category fall back to Uncategorised locally.
    setSkills((prev) =>
      prev.map((s) => (s.category === name ? { ...s, category: null } : s)),
    );
    runSetCategories({ categories: next });
  }

  const activeSkill = activeId ? skills.find((s) => s.id === activeId) : null;
  const activeCategory = activeId && isCategoryDragId(activeId) ? categoryFromDragId(activeId) : null;
  const categoryDragIds = categories.map(categoryDragId);

  return (
    <SectionShell
      title='Skills'
      description='Tools and techniques you can speak to with concrete examples.'
      count={skills.length}
    >
      {!readOnly ? (
        <QuickAddSkill onAdded={() => refreshCvPreview()} />
      ) : null}

      {skills.length === 0 ? <p className='text-sm text-muted-foreground'>No skills yet.</p> : null}

      <DndContext
        id='skill-editor-dnd'
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDropIndicator(null);
        }}
      >
        <SortableContext items={categoryDragIds} strategy={verticalListSortingStrategy}>
          <div className='flex flex-col gap-4'>
            {containers.map((container) => {
              const bucket = byContainer.get(container.containerId)!;
              const isUncategorised = container.category === null;
              // Hide an empty uncategorised zone when there is nothing to drop and
              // at least one category exists (keeps the UI tidy).
              if (isUncategorised && bucket.length === 0 && categories.length > 0 && readOnly) {
                return null;
              }
              const isActiveDropTarget = dropIndicator?.containerId === container.containerId;
              const groupProps = {
                container,
                skills: bucket,
                readOnly,
                isActiveDropTarget,
                dropIndex: isActiveDropTarget ? dropIndicator!.index : null,
                onRenameCategory: (to: string) => {
                  if (container.category === null) return;
                  const from = container.category;
                  const trimmed = to.trim();
                  if (trimmed.length === 0 || trimmed === from) return;
                  setCategories((prev) => prev.map((c) => (c === from ? trimmed : c)));
                  setSkills((prev) =>
                    prev.map((s) => (s.category === from ? { ...s, category: trimmed } : s)),
                  );
                  runRenameCategory({ from, to: trimmed });
                },
                onDeleteCategory: () => handleDeleteCategory(container.category!),
              };
              return isUncategorised ? (
                <CategoryGroup key={container.containerId} {...groupProps} />
              ) : (
                <SortableCategoryGroup key={container.containerId} {...groupProps} />
              );
            })}

          {!readOnly ? (
            addingCategory ? (
              <CategoryNameInput
                placeholder='New category name'
                onCommit={handleAddCategory}
                onCancel={() => setAddingCategory(false)}
              />
            ) : (
              <Button
                size='sm'
                variant='outline'
                className='self-start'
                onClick={() => setAddingCategory(true)}
              >
                <Plus /> Add category
              </Button>
            )
          ) : null}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeSkill ? <ChipShell name={activeSkill.name} dragging /> : null}
          {activeCategory ? <CategoryDragShell title={activeCategory} /> : null}
        </DragOverlay>
      </DndContext>
    </SectionShell>
  );
}

function QuickAddSkill({ onAdded }: { onAdded: () => void }) {
  const [value, setValue] = useState('');
  const { execute, isExecuting } = useAction(quickAddSkill, {
    onSuccess: () => {
      setValue('');
      onAdded();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to add skill'),
  });

  return (
    <form
      className='flex gap-2'
      onSubmit={(event) => {
        event.preventDefault();
        const name = value.trim();
        if (name.length === 0) return;
        execute({ name });
      }}
    >
      <Input
        value={value}
        placeholder='Add a skill and press Enter'
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type='submit' size='sm' disabled={isExecuting || value.trim().length === 0}>
        <Plus /> Add
      </Button>
    </form>
  );
}

type CategoryGroupProps = {
  container: Container;
  skills: Skill[];
  readOnly: boolean;
  /** True while a skill is being dragged anywhere over this category. */
  isActiveDropTarget: boolean;
  /** Slot index for the drop caret while this is the active target, else null. */
  dropIndex: number | null;
  onRenameCategory: (to: string) => void;
  onDeleteCategory: () => void;
};

/**
 * Sortable wrapper that makes a named category's whole group draggable to
 * reorder it among the other categories. The grip in the header is the drag
 * activator, so clicking the title (to rename) or the chips still works.
 */
function SortableCategoryGroup(props: CategoryGroupProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: categoryDragId(props.container.category!), disabled: props.readOnly });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <CategoryGroup
      {...props}
      outerRef={setNodeRef}
      outerStyle={style}
      isCategoryDragging={isDragging}
      dragHandle={
        <button
          type='button'
          ref={setActivatorNodeRef}
          aria-label={`Reorder category ${props.container.title}`}
          className='cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          <GripVertical className='size-4' />
        </button>
      }
    />
  );
}

function CategoryGroup({
  container,
  skills,
  readOnly,
  isActiveDropTarget,
  dropIndex,
  onRenameCategory,
  onDeleteCategory,
  outerRef,
  outerStyle,
  isCategoryDragging = false,
  dragHandle,
}: CategoryGroupProps & {
  outerRef?: (node: HTMLElement | null) => void;
  outerStyle?: React.CSSProperties;
  isCategoryDragging?: boolean;
  dragHandle?: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: container.containerId });
  const [renaming, setRenaming] = useState(false);
  const isUncategorised = container.category === null;

  return (
    <div
      ref={outerRef}
      style={outerStyle}
      className={cn('flex flex-col gap-2', isCategoryDragging && 'opacity-50')}
    >
      <div className='flex items-center gap-2'>
        {dragHandle}
        <div className='flex flex-1 items-center justify-between gap-2'>
          {renaming && !isUncategorised ? (
            <CategoryNameInput
              defaultValue={container.title}
              onCommit={(value) => {
                setRenaming(false);
                onRenameCategory(value);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <button
              type='button'
              disabled={readOnly || isUncategorised}
              className={cn(
                'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                !readOnly && !isUncategorised && 'cursor-text hover:text-foreground',
              )}
              onClick={() => !isUncategorised && setRenaming(true)}
            >
              {container.title}
            </button>
          )}
          {!readOnly && !isUncategorised ? (
            <Button
              size='icon-xs'
              variant='ghost'
              aria-label={`Delete category ${container.title}`}
              onClick={onDeleteCategory}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      <SortableContext items={skills.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-11 flex-wrap items-start gap-2 rounded-lg border border-dashed p-2 transition-colors',
            isActiveDropTarget ? 'border-primary bg-primary/5' : 'border-border',
          )}
        >
          {skills.length === 0 ? (
            dropIndex === 0 ? (
              <DropCaret active />
            ) : (
              <span className='px-1 py-1.5 text-xs text-muted-foreground'>
                {isUncategorised ? 'Drag skills here to ungroup them.' : 'Drop skills here.'}
              </span>
            )
          ) : (
            <>
              <DropCaret active={dropIndex === 0} />
              {skills.map((skill, i) => (
                <Fragment key={skill.id}>
                  <SkillChip skill={skill} readOnly={readOnly} />
                  <DropCaret active={dropIndex === i + 1} />
                </Fragment>
              ))}
            </>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SkillChip({ skill, readOnly }: { skill: Skill; readOnly: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: skill.id,
    disabled: readOnly,
  });
  const [editing, setEditing] = useState(false);

  const { execute: runRename } = useAction(renameSkill, {
    onSuccess: () => refreshCvPreview(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to rename skill'),
  });
  const { execute: runDelete, isExecuting: deleting } = useAction(deleteProfileChild, {
    onSuccess: () => refreshCvPreview(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete skill'),
  });

  // Intentionally do not apply the sortable `transform` to siblings. Chips have
  // variable widths in a flex-wrap layout, and `rectSortingStrategy` shifts
  // them with a translate + scale that either stretches the chips (with scale)
  // or overlaps/gaps them (translate only). Keeping siblings static during the
  // drag avoids both; the DragOverlay and the category highlight convey the
  // drag, and the final order is applied on drop.

  if (editing) {
    return (
      <span ref={setNodeRef}>
        <Input
          autoFocus
          defaultValue={skill.name}
          className='h-7 w-40 text-sm'
          onBlur={(event) => {
            setEditing(false);
            const name = event.target.value.trim();
            if (name.length > 0 && name !== skill.name) runRename({ id: skill.id, name });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              (event.target as HTMLInputElement).blur();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setEditing(false);
            }
          }}
        />
      </span>
    );
  }

  return (
    <span
      ref={setNodeRef}
      className={cn(
        'group/chip inline-flex select-none items-center gap-1 rounded-full border bg-background py-1 pr-1 pl-2 text-sm',
        !readOnly && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
      title={readOnly ? undefined : 'Drag to move · double-click to rename'}
      onDoubleClick={() => !readOnly && setEditing(true)}
      {...(readOnly ? {} : attributes)}
      {...(readOnly ? {} : listeners)}
    >
      {!readOnly ? <GripVertical className='size-3.5 text-muted-foreground' /> : null}
      <span className='font-medium'>{skill.name}</span>
      {!readOnly ? (
        <button
          type='button'
          disabled={deleting}
          aria-label={`Delete ${skill.name}`}
          className='rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => runDelete({ section: 'skill', id: skill.id })}
        >
          <X className='size-3.5' />
        </button>
      ) : null}
    </span>
  );
}

/**
 * Glowing vertical line marking where a dragged skill will be inserted. A caret
 * sits in every gap and stays mounted; only the active one expands. Animating
 * `width` (not mount/unmount) lets the neighbouring chips float aside smoothly
 * instead of snapping. The `-mr-2` cancels the parent flex `gap` so inactive
 * (zero-width) carets don't inflate the spacing between chips. The `-mx-1` is
 * split across both sides so the active caret keeps a small gap from the chips
 * on either side rather than touching them.
 */
function DropCaret({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        '-mx-1 h-7 shrink-0 self-center rounded-full bg-primary transition-all duration-200 ease-out',
        active
          ? 'w-1 opacity-100 shadow-[0_0_10px_2px] shadow-primary/70'
          : 'w-0 opacity-0 shadow-none',
      )}
    />
  );
}

function CategoryDragShell({ title }: { title: string }) {
  return (
    <div className='inline-flex items-center gap-2 rounded-lg border bg-card px-2 py-1 shadow-md'>
      <GripVertical className='size-4 text-muted-foreground' />
      <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        {title}
      </span>
    </div>
  );
}

function ChipShell({ name, dragging }: { name: string; dragging?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border bg-background py-1 pr-2 pl-2 text-sm shadow-md',
        dragging && 'cursor-grabbing',
      )}
    >
      <GripVertical className='size-3.5 text-muted-foreground' />
      <span className='font-medium'>{name}</span>
    </span>
  );
}

function CategoryNameInput({
  defaultValue = '',
  placeholder,
  onCommit,
  onCancel,
}: {
  defaultValue?: string;
  placeholder?: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Input
      autoFocus
      value={value}
      placeholder={placeholder}
      className='h-7 w-48 text-sm'
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onCommit(value);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    />
  );
}

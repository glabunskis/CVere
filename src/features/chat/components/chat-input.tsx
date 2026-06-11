'use client';

import { type KeyboardEvent, useState } from 'react';
import { ArrowUpIcon, SquareIcon } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/shared/ui/input-group';
import { Spinner } from '@/shared/ui/spinner';

type Props = {
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onSend: (text: string) => void;
  onStop: () => void;
  disabled?: boolean;
  prefillText?: string | null;
};

export function ChatInput({
  status,
  onSend,
  onStop,
  disabled = false,
  prefillText = null,
}: Props) {
  const [value, setValue] = useState(prefillText ?? '');
  const isBusy = status === 'submitted' || status === 'streaming';
  const canSend = !isBusy && !disabled && value.trim().length > 0;

  const submit = () => {
    const text = value.trim();
    if (!canSend || !text) return;
    onSend(text);
    setValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className='border-t bg-background p-3'
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <InputGroup className='h-auto'>
        <InputGroupTextarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'Chat is unavailable.'
              : 'Ask me to read your CV or edit a bullet...'
          }
          rows={2}
          disabled={disabled}
          aria-label='Chat message'
        />
        <InputGroupAddon align='block-end'>
          <span className='text-xs text-muted-foreground'>
            Enter to send, Shift+Enter for newline
          </span>
          {isBusy ? (
            <InputGroupButton
              type='button'
              size='icon-xs'
              variant='secondary'
              onClick={() => onStop()}
              aria-label='Stop generation'
            >
              {status === 'submitted' ? <Spinner /> : <SquareIcon />}
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type='submit'
              size='icon-xs'
              variant='default'
              disabled={!canSend}
              aria-label='Send message'
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

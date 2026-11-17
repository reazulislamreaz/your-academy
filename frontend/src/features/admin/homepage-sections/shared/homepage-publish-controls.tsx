'use client';

import { Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  dirty: boolean;
  pending: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
};

/** Draft + Publish actions shared by both homepage section managers. */
export function HomepagePublishControls({ dirty, pending, onSaveDraft, onPublish }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="motion-press cursor-pointer"
        disabled={!dirty || pending}
        title="Save changes without publishing to the live homepage"
        onClick={onSaveDraft}
      >
        <Save className="h-4 w-4" />
        Save draft
      </Button>
      <Button
        type="button"
        size="sm"
        className="motion-press cursor-pointer"
        disabled={pending}
        title="Save and publish so the live homepage updates"
        onClick={onPublish}
      >
        <Upload className="h-4 w-4" />
        Publish
      </Button>
    </div>
  );
}

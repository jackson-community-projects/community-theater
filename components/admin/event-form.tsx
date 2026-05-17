"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";

import type { AdminEvent, AdminTheater } from "@/lib/admin";
import { AdminImageUploadField } from "@/components/admin/admin-image-upload-field";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminSectionCard } from "@/components/admin/section-card";
import {
  AdminField,
  AdminFieldGrid,
  AdminInput,
  AdminMockForm,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/admin-form";
import { Button } from "@/components/ui/button";

function toDateTimeLocalInput(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDateTimeLocalOffsetMinutes(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getTimezoneOffset());
}

export function AdminEventForm({
  theaters,
  event,
  action,
}: {
  theaters: AdminTheater[];
  event?: AdminEvent | null;
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const initialImage = event?.image && event.image !== "/next.svg" ? event.image : "";
  const [image, setImage] = useState(initialImage);
  const [startsAtOffset, setStartsAtOffset] = useState(
    getDateTimeLocalOffsetMinutes(toDateTimeLocalInput(event?.startsAt))
  );
  const [endsAtOffset, setEndsAtOffset] = useState(
    getDateTimeLocalOffsetMinutes(toDateTimeLocalInput(event?.endsAt))
  );
  const theaterOptions = useMemo(() => theaters, [theaters]);

  const imagePreview = event?.image === image ? event.imagePreview : undefined;
  const resolvedImagePreview = imagePreview?.trim() || image.trim() || "/next.svg";

  const formSections = (
    <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="flex flex-col gap-8">
        {event ? <input type="hidden" name="id" value={event.id} /> : null}
        <input type="hidden" name="startsAtOffsetMinutes" value={startsAtOffset} />
        <input type="hidden" name="endsAtOffsetMinutes" value={endsAtOffset} />
        <AdminSectionCard
          title="Event Details"
          description="Capture the core programming, venue, and publishing details for this community event."
        >
          <AdminFieldGrid>
            <AdminField label="Title">
              <AdminInput
                name="title"
                defaultValue={event?.title ?? ""}
                placeholder="Friday Classics Club"
                required
              />
            </AdminField>
            <AdminField label="Slug">
              <AdminInput
                name="slug"
                defaultValue={event?.slug ?? ""}
                placeholder="friday-classics-club"
                required
              />
            </AdminField>
            <AdminField label="Theater">
              <AdminSelect
                name="theaterId"
                defaultValue={event?.theaterId ?? theaterOptions[0]?.id ?? ""}
                required
              >
                {theaterOptions.map((theater) => (
                  <option key={theater.id} value={theater.id}>
                    {theater.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Status">
              <AdminSelect name="status" defaultValue={event?.status ?? "draft"} required>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </AdminSelect>
            </AdminField>
            <AdminField label="Start">
              <AdminInput
                name="startsAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalInput(event?.startsAt)}
                onChange={(event) =>
                  setStartsAtOffset(
                    getDateTimeLocalOffsetMinutes(event.currentTarget.value)
                  )
                }
                required
              />
            </AdminField>
            <AdminField label="End">
              <AdminInput
                name="endsAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalInput(event?.endsAt)}
                onChange={(event) =>
                  setEndsAtOffset(
                    getDateTimeLocalOffsetMinutes(event.currentTarget.value)
                  )
                }
                required
              />
            </AdminField>
            <AdminField
              label="Image URL"
              description="Paste an image URL or upload artwork directly from this form."
            >
              <AdminInput
                name="image"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="https://..."
              />
            </AdminField>
            <AdminImageUploadField
              label="Upload Artwork"
              description="Upload event art directly from this editor."
              uploadPathPrefix="events"
              value={image}
              onChange={setImage}
              previewLabel="The uploaded image URL will be saved back into this event."
            />
          </AdminFieldGrid>
          <div className="mt-5 grid gap-5">
            <AdminField label="Summary">
              <AdminTextarea
                name="summary"
                defaultValue={event?.summary ?? ""}
                placeholder="Short event summary for cards and teasers."
                required
              />
            </AdminField>
            <AdminField label="Description">
              <AdminTextarea
                name="description"
                defaultValue={event?.description ?? ""}
                placeholder="Long-form internal or public description..."
              />
            </AdminField>
          </div>
        </AdminSectionCard>
      </div>

      <div className="flex flex-col gap-8">
        <AdminSectionCard
          title="Promotional Art"
          description="Preview the event artwork alongside the rest of the event details."
        >
          <div className="space-y-4">
            <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-container-highest">
              <img
                alt={event?.title ? `${event.title} poster preview` : "Event poster preview"}
                className="h-full w-full object-cover"
                src={resolvedImagePreview}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setImage("")}
              >
                Remove Image
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Use this preview to confirm the artwork looks right before saving.
            </p>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );

  if (!action) {
    return (
      <AdminMockForm
        submitLabel={event ? "Save Event" : "Create Event Draft"}
        submitDescription="Event editing is fully structured and ready for review."
      >
        {formSections}
      </AdminMockForm>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-8">
      {formSections}
      <div className="flex flex-col gap-4 rounded-lg bg-surface-container-high p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-sans text-sm font-semibold text-foreground">
            Event workflow
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Saving this form will persist the event and keep the admin views in sync.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="reset" variant="outline">
            Reset
          </Button>
          <AdminSubmitButton idleLabel={event ? "Save Event" : "Create Event"} />
        </div>
      </div>
    </form>
  );
}

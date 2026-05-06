"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AlertTriangle, Trash2 } from "lucide-react";
import { remove } from "aws-amplify/storage";

import type { AdminTheater } from "@/lib/admin";
import { createAdminNoticeHref } from "@/lib/admin/notice";
import { getAmplifyClient } from "@/lib/amplify/client";
import { getAmplifyStoragePathFromUrl } from "@/lib/amplify/storage";
import { AdminImageUploadField } from "@/components/admin/admin-image-upload-field";
import { Button } from "@/components/ui/button";
import { AdminSectionCard } from "@/components/admin/section-card";
import {
  AdminField,
  AdminFieldGrid,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/admin-form";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function AdminTheaterEditor({ theater }: { theater: AdminTheater }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState(theater.heroImage);

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        setError(null);

        startTransition(() => {
          void (async () => {
            const client = getAmplifyClient();
            const established = getString(formData, "established");
            const sortOrder = getString(formData, "sortOrder");
            const introParagraph = getString(formData, "introParagraph");
            const secondaryParagraph = getString(formData, "secondaryParagraph");
            const nextHeroImage = getString(formData, "heroImage") || null;

            const response = await client.models.Theater.update(
              {
                id: theater.id,
                sortOrder: sortOrder ? Number.parseInt(sortOrder, 10) : null,
                slug: getString(formData, "slug"),
                name: getString(formData, "name"),
                city: getString(formData, "city"),
                state: getString(formData, "state"),
                district: getString(formData, "district"),
                established: established ? Number.parseInt(established, 10) : null,
                status: getString(formData, "status") as
                  | "active"
                  | "inactive"
                  | "seasonal",
                address: getString(formData, "address"),
                phone: getString(formData, "phone") || null,
                contactEmail: getString(formData, "contactEmail") || null,
                manager: getString(formData, "manager") || null,
                notes: getString(formData, "notes") || null,
                heroImage: nextHeroImage,
                descriptionParagraphs: [
                  introParagraph,
                  secondaryParagraph,
                ].filter(Boolean),
              },
              { authMode: "userPool" }
            );

            if (response.errors?.length) {
              setError(response.errors.map((item) => item.message).join("; "));
              return;
            }

            const previousHeroPath = getAmplifyStoragePathFromUrl(theater.heroImage);
            const nextHeroPath = getAmplifyStoragePathFromUrl(nextHeroImage);

            if (previousHeroPath && previousHeroPath !== nextHeroPath) {
              await remove({ path: previousHeroPath }).result;
            }

            router.replace(
              createAdminNoticeHref(`/admin/theaters/${theater.id}`, {
                type: "success",
                message: "Theater saved successfully.",
              })
            );
            router.refresh();
          })();
        });
      }}
    >
      <div className="flex flex-col gap-8">
        <AdminSectionCard
          title="Operational Details"
          description="Venue-specific operational data and public theater storytelling live here. Organization-wide memberships are modeled separately."
        >
          <AdminFieldGrid>
            <AdminField label="Name">
              <AdminInput name="name" defaultValue={theater.name} required />
            </AdminField>
            <AdminField label="Slug">
              <AdminInput name="slug" defaultValue={theater.slug} required />
            </AdminField>
            <AdminField label="City">
              <AdminInput name="city" defaultValue={theater.city} required />
            </AdminField>
            <AdminField label="State">
              <AdminInput name="state" defaultValue={theater.state} required />
            </AdminField>
            <AdminField
              label="Sort Order"
              description="Lower numbers appear first in navigation and theater lists."
            >
              <AdminInput
                name="sortOrder"
                type="number"
                min="1"
                defaultValue={String(theater.sortOrder)}
              />
            </AdminField>
            <AdminField label="District">
              <AdminInput
                name="district"
                defaultValue={theater.district}
                required
              />
            </AdminField>
            <AdminField label="Established">
              <AdminInput
                name="established"
                type="number"
                defaultValue={String(theater.established || "")}
              />
            </AdminField>
            <AdminField label="Status">
              <AdminSelect name="status" defaultValue={theater.status}>
                <option value="active">Active</option>
                <option value="seasonal">Seasonal</option>
                <option value="inactive">Inactive</option>
              </AdminSelect>
            </AdminField>
            <AdminField label="Phone">
              <AdminInput name="phone" defaultValue={theater.phone} />
            </AdminField>
            <AdminField label="Contact Email">
              <AdminInput
                name="contactEmail"
                type="email"
                defaultValue={theater.contactEmail}
              />
            </AdminField>
            <AdminField label="Manager">
              <AdminInput name="manager" defaultValue={theater.manager} />
            </AdminField>
            <AdminField label="Address">
              <AdminInput name="address" defaultValue={theater.address} required />
            </AdminField>
            <AdminField label="Hero Image">
              <AdminInput
                name="heroImage"
                value={heroImage}
                onChange={(event) => setHeroImage(event.target.value)}
              />
            </AdminField>
            <div className="md:col-span-2">
              <AdminImageUploadField
                label="Upload Hero Image"
                description="Upload a new hero image directly from this form."
                uploadPathPrefix="theaters"
                value={heroImage}
                onChange={setHeroImage}
                previewLabel="Replacing the hero image updates the saved image URL in the form."
              />
            </div>
          </AdminFieldGrid>
          <div className="mt-5">
            <AdminField label="Operational Notes">
              <AdminTextarea name="notes" defaultValue={theater.notes} />
            </AdminField>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Public Story & Experience"
          description="These venue-specific fields drive the public theater pages."
        >
          <div className="grid gap-5">
            <AdminField label="Intro Paragraph">
              <AdminTextarea
                name="introParagraph"
                defaultValue={theater.descriptionParagraphs[0] ?? ""}
              />
            </AdminField>
            <AdminField label="Secondary Paragraph">
              <AdminTextarea
                name="secondaryParagraph"
                defaultValue={theater.descriptionParagraphs[1] ?? ""}
              />
            </AdminField>
          </div>
        </AdminSectionCard>
      </div>

      <div className="flex flex-col gap-4 rounded-lg bg-surface-container-high p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-sans text-sm font-semibold text-foreground">
            Theater workflow
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Core theater fields and public story details can be updated here.
          </p>
          {error ? (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Theater Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function AdminTheaterDeleteCard({
  theaterId,
}: {
  theaterId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-lg bg-secondary/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
            <AlertTriangle className="size-4 text-secondary" />
            Archive this theater
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This permanently removes the theater. Related references may still need follow-up cleanup.
          </p>
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {confirming ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    void (async () => {
                      const client = getAmplifyClient();
                      const response = await client.models.Theater.delete(
                        { id: theaterId },
                        { authMode: "userPool" }
                      );

                      if (response.errors?.length) {
                        setError(
                          response.errors.map((item) => item.message).join("; ")
                        );
                        return;
                      }

                      router.push(
                        createAdminNoticeHref("/admin/theaters", {
                          type: "success",
                          message: "Theater deleted successfully.",
                        })
                      );
                      router.refresh();
                    })();
                  });
                }}
              >
                <Trash2 data-icon="inline-start" />
                {isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => setConfirming(true)}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

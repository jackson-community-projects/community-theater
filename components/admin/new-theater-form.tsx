"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createAdminNoticeHref } from "@/lib/admin/notice";
import { getAmplifyClient } from "@/lib/amplify/client";
import { AdminImageUploadField } from "@/components/admin/admin-image-upload-field";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminSectionCard } from "@/components/admin/section-card";
import { useHydratedFlag } from "@/components/admin/use-hydrated-flag";
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

export function NewTheaterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState("");
  const isHydrated = useHydratedFlag();

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        eyebrow="New Venue"
        title="Add a theater"
        description="Create the shell of a new location with enough structure that venue settings, screens, and events can hang off it later."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/theaters">Back to Theaters</Link>
          </Button>
        }
      />

      <form
        data-e2e-ready={isHydrated ? "true" : undefined}
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
              const response = await client.models.Theater.create(
                {
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
                  heroImage: getString(formData, "heroImage") || null,
                },
                { authMode: "userPool" }
              );

              if (response.errors?.length) {
                setError(response.errors.map((item) => item.message).join("; "));
                return;
              }

              router.push(
                createAdminNoticeHref("/admin/theaters", {
                  type: "success",
                  message: "Theater created successfully.",
                })
              );
              router.refresh();
            })();
          });
        }}
      >
        <AdminSectionCard
          title="Core Details"
          description="Store venue-specific public and internal details here, while keeping organization-wide programs like memberships in separate models."
        >
          <AdminFieldGrid>
            <AdminField label="Name">
              <AdminInput name="name" placeholder="Fairmont Theater" required />
            </AdminField>
            <AdminField label="Slug">
              <AdminInput name="slug" placeholder="fairmont-theater" required />
            </AdminField>
            <AdminField label="City">
              <AdminInput name="city" placeholder="Fairmont" required />
            </AdminField>
            <AdminField label="State">
              <AdminInput name="state" placeholder="MN" required />
            </AdminField>
            <AdminField
              label="Sort Order"
              description="Lower numbers appear first in navigation and theater lists."
            >
              <AdminInput name="sortOrder" type="number" min="1" defaultValue="1" />
            </AdminField>
            <AdminField label="District">
              <AdminInput name="district" placeholder="Main Street" required />
            </AdminField>
            <AdminField label="Established">
              <AdminInput name="established" type="number" placeholder="1946" />
            </AdminField>
            <AdminField label="Status">
              <AdminSelect name="status" defaultValue="active">
                <option value="active">Active</option>
                <option value="seasonal">Seasonal</option>
                <option value="inactive">Inactive</option>
              </AdminSelect>
            </AdminField>
            <AdminField label="Phone">
              <AdminInput name="phone" placeholder="(555) 010-2001" />
            </AdminField>
            <AdminField label="Contact Email">
              <AdminInput
                name="contactEmail"
                type="email"
                placeholder="manager@smalltowntheater.org"
              />
            </AdminField>
            <AdminField
              label="Address"
              description="Historic district copy can stay embedded until a normalized address model exists."
            >
              <AdminInput
                name="address"
                placeholder="100 Main Street · Historic District"
                required
              />
            </AdminField>
            <AdminField label="Manager">
              <AdminInput name="manager" placeholder="Jordan Ellis" />
            </AdminField>
            <AdminField label="Hero Image">
              <AdminInput
                name="heroImage"
                value={heroImage}
                onChange={(event) => setHeroImage(event.target.value)}
                placeholder="https://example.com/theater-hero.jpg"
              />
            </AdminField>
            <AdminImageUploadField
              label="Upload Hero Image"
              description="Upload a theater hero image directly from this form."
              uploadPathPrefix="theaters"
              value={heroImage}
              onChange={setHeroImage}
              previewLabel="The uploaded image URL will be added to the hero image field before the theater is created."
            />
          </AdminFieldGrid>
        </AdminSectionCard>

        <AdminSectionCard
          title="Operational Notes"
          description="Use this space for local context, staffing notes, or programming constraints."
        >
          <AdminField label="Notes">
            <AdminTextarea
              name="notes"
              placeholder="Seasonal courtyard use, staffing notes, accessibility details..."
            />
          </AdminField>
        </AdminSectionCard>

        <div className="flex flex-col gap-4 rounded-lg bg-surface-container-high p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-sans text-sm font-semibold text-foreground">
            Theater workflow
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Creating this theater adds it to the admin library and makes it available for related setup work.
          </p>
            {error ? (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Theater"}
          </Button>
        </div>
      </form>
    </div>
  );
}

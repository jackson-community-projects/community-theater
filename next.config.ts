import type { NextConfig } from "next";

const fallbackStorageRegion = "us-east-2";

function getStorageHostname() {
  const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET_NAME?.trim();
  const region = process.env.NEXT_PUBLIC_AWS_REGION?.trim();

  if (!bucketName || !region) {
    return null;
  }

  return `${bucketName}.s3.${region}.amazonaws.com`;
}

const storageHostname = getStorageHostname();
const storageRegion =
  process.env.NEXT_PUBLIC_AWS_REGION?.trim() || fallbackStorageRegion;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.1.1.35"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: `**.s3.${storageRegion}.amazonaws.com`,
        pathname: "/**",
      },
      ...(storageHostname
        ? [
            {
              protocol: "https" as const,
              hostname: storageHostname,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;

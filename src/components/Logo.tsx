import Image from "next/image";
import Link from "next/link";

/** Official Anak.Studio wordmark */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const height = size === "lg" ? 56 : size === "sm" ? 32 : 40;
  const width = Math.round(height * (480 / 120));

  return (
    <Link
      href="/"
      className="inline-flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blush)]"
      aria-label="Anak.Studio home"
    >
      <Image
        src="/brand/anak-studio-wordmark.png"
        alt="Anak.Studio"
        width={width}
        height={height}
        className="h-7 w-auto sm:h-8"
        priority
      />
    </Link>
  );
}

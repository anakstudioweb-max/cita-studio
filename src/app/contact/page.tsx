export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 pt-8">
      <h1 className="heading-display text-3xl">Contact</h1>
      <p className="text-[var(--taupe)]">
        Questions about Anak.Studio marketplace access or billing?
      </p>
      <p>
        Email{" "}
        <a className="font-medium text-[var(--blush)] underline underline-offset-4" href="mailto:hello@anak.studio">
          hello@anak.studio
        </a>
      </p>
      <p className="text-sm text-[var(--muted)]">Houston, Texas</p>
    </article>
  );
}

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral mx-auto max-w-2xl space-y-4 pt-8">
      <h1 className="font-serif text-4xl">Privacy</h1>
      <p className="text-[var(--taupe)]">
        Anak.Studio is a Houston lashes & brows marketplace. Client bookings
        collect your name, phone, and optional notes so professionals can
        confirm appointments on WhatsApp. We do not sell personal data.
      </p>
      <p className="text-[var(--taupe)]">
        Professionals store profile details, services, and appointment records
        in our database. Session cookies authenticate pro and owner panels.
        Contact us to request deletion of your booking data.
      </p>
    </article>
  );
}

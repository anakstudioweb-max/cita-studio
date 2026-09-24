/**
 * Template baseline for Telnyx 10DLC / marketplace compliance.
 * Not legal advice — business should have counsel review for maximum protection.
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Anak.Studio — how we collect, use, and protect booking and messaging data.",
};

const updated = "September 23, 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 pt-8 pb-4">
      <header className="space-y-3">
        <p className="text-sm text-[var(--muted)]">Last updated: {updated}</p>
        <h1 className="heading-display text-3xl sm:text-4xl">Privacy Policy</h1>
        <p className="text-[var(--taupe)] leading-relaxed">
          Anak.Studio (“we,” “us,” or “our”) operates a marketplace website that
          helps clients book lashes and brows appointments with independent beauty
          professionals in the Houston, Texas area. This Privacy Policy explains
          what information we collect, how we use it, and the choices you have.
          By using our website or submitting a booking request, you agree to this
          Policy. For our service rules, see our{" "}
          <Link
            href="/terms"
            className="font-medium text-[var(--blush)] underline underline-offset-4"
          >
            Terms of Service
          </Link>
          .
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">1. Who we are</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Anak.Studio is operated by Ana Meza in Houston, Texas. Questions about
          privacy or this Policy may be sent to{" "}
          <a
            className="font-medium text-[var(--blush)] underline underline-offset-4"
            href="mailto:anak.studioweb@gmail.com"
          >
            anak.studioweb@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">2. Information we collect</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Depending on how you use the site, we may collect:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-[var(--taupe)] leading-relaxed">
          <li>
            <span className="text-[var(--ink)] font-medium">Booking details:</span>{" "}
            your name, phone number, optional email address, optional notes, the
            service requested, preferred date and time, and the professional you
            selected.
          </li>
          <li>
            <span className="text-[var(--ink)] font-medium">Professional account data:</span>{" "}
            name, email, password (stored in hashed form), profile information,
            services, pricing, studio location details, and appointment records.
          </li>
          <li>
            <span className="text-[var(--ink)] font-medium">Technical data:</span>{" "}
            basic server logs, device or browser information, and cookies or
            similar technologies needed to keep you signed in to professional or
            admin panels.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">3. How we use your information</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          We use the information we collect to:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-[var(--taupe)] leading-relaxed">
          <li>Create and manage booking requests between clients and professionals.</li>
          <li>
            Send transactional messages about your booking, including confirmations,
            reminders, status updates, and related service communications by SMS
            and, when you provide an email address, by email.
          </li>
          <li>Operate professional and owner dashboards, billing access, and support.</li>
          <li>Maintain security, prevent abuse, and improve the reliability of the site.</li>
          <li>Comply with applicable law and respond to lawful requests.</li>
        </ul>
        <p className="text-[var(--taupe)] leading-relaxed">
          We do not use client mobile numbers for unrelated advertising campaigns.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">4. SMS / text messaging</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          When you submit a booking request and provide a phone number, you consent
          to receive transactional SMS messages from Anak.Studio related to that
          booking and to the operation of the marketplace (for example,
          confirmations, reminders, and similar service notices). Message frequency
          varies based on your bookings. Message and data rates may apply.
        </p>
        <p className="text-[var(--taupe)] leading-relaxed">
          <span className="text-[var(--ink)] font-medium">Opt out:</span> You may
          cancel SMS messages at any time by replying{" "}
          <span className="text-[var(--ink)] font-medium">STOP</span> to any
          message we send. After you send STOP, we will send a confirmation that
          you have been unsubscribed. You will no longer receive SMS messages from
          us unless you opt in again (for example, by submitting a new booking that
          includes SMS consent).
        </p>
        <p className="text-[var(--taupe)] leading-relaxed">
          <span className="text-[var(--ink)] font-medium">Help:</span> For help
          with SMS, reply{" "}
          <span className="text-[var(--ink)] font-medium">HELP</span> or email{" "}
          <a
            className="font-medium text-[var(--blush)] underline underline-offset-4"
            href="mailto:anak.studioweb@gmail.com"
          >
            anak.studioweb@gmail.com
          </a>
          .
        </p>
        <p className="font-medium leading-relaxed text-[var(--ink)]">
          Your mobile information will not be sold or shared with third parties
          for promotional or marketing purposes.
        </p>
        <p className="text-[var(--taupe)] leading-relaxed">
          Carriers are not liable for delayed or undelivered messages. SMS consent
          is not a condition of purchasing any product or service from an
          independent professional booked through our marketplace.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">5. Sharing and processors</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          We share information only as needed to operate the service:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-[var(--taupe)] leading-relaxed">
          <li>
            <span className="text-[var(--ink)] font-medium">Professionals:</span>{" "}
            booking details (including your name and phone) are shared with the
            professional you selected so they can confirm and perform the
            appointment.
          </li>
          <li>
            <span className="text-[var(--ink)] font-medium">Service providers:</span>{" "}
            we use vendors who process data on our behalf, including email delivery
            (Resend), SMS delivery (Telnyx), hosting (for example Vercel), and
            database hosting. These providers may process your information only to
            provide their services to us.
          </li>
          <li>
            <span className="text-[var(--ink)] font-medium">Legal and safety:</span>{" "}
            we may disclose information if required by law or to protect the
            rights, safety, or integrity of Anak.Studio, our users, or others.
          </li>
        </ul>
        <p className="text-[var(--taupe)] leading-relaxed">
          We do not sell personal information. We do not sell or share mobile phone
          numbers with third parties for their own promotional or marketing use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">6. Retention</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          We retain booking and account records for as long as needed to provide
          the marketplace, resolve disputes, maintain business records, and meet
          legal obligations. You may request deletion of your booking or contact
          data by emailing us. We may retain limited information when we are
          required to do so by law or for legitimate business needs (for example,
          fraud prevention or completed transaction records).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">7. Security</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          We use reasonable administrative, technical, and organizational measures
          to protect personal information. No method of transmission or storage is
          completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">8. Children’s privacy</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Anak.Studio is not directed to children under 13, and we do not knowingly
          collect personal information from children under 13. If you believe a
          child has provided us information, contact us and we will take
          appropriate steps to delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">9. California and U.S. privacy notes</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          If you are a California resident, you may have rights under the
          California Consumer Privacy Act (CCPA/CPRA), including the right to know
          what personal information we collect, to request deletion, and to opt out
          of the “sale” or “sharing” of personal information as those terms are
          defined by law. We do not sell personal information for money, and we do
          not sell or share mobile information for promotional or marketing
          purposes. To exercise privacy rights, email{" "}
          <a
            className="font-medium text-[var(--blush)] underline underline-offset-4"
            href="mailto:anak.studioweb@gmail.com"
          >
            anak.studioweb@gmail.com
          </a>
          . We will not discriminate against you for exercising rights available
          under applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">10. Changes</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          We may update this Privacy Policy from time to time. The “Last updated”
          date at the top of this page will change when we do. Continued use of
          the site after an update constitutes acceptance of the revised Policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">11. Contact</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Anak.Studio
          <br />
          Houston, Texas, USA
          <br />
          Email:{" "}
          <a
            className="font-medium text-[var(--blush)] underline underline-offset-4"
            href="mailto:anak.studioweb@gmail.com"
          >
            anak.studioweb@gmail.com
          </a>
        </p>
      </section>
    </article>
  );
}

/**
 * Template baseline for marketplace / SMS compliance.
 * Not legal advice — business should have counsel review for maximum protection.
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Anak.Studio — marketplace booking between clients and independent beauty professionals.",
};

const updated = "September 23, 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 pt-8 pb-4">
      <header className="space-y-3">
        <p className="text-sm text-[var(--muted)]">Last updated: {updated}</p>
        <h1 className="heading-display text-3xl sm:text-4xl">Terms of Service</h1>
        <p className="text-[var(--taupe)] leading-relaxed">
          These Terms of Service (“Terms”) govern your access to and use of the
          Anak.Studio website and related booking tools (the “Service”). By using
          the Service, you agree to these Terms. If you do not agree, do not use
          the Service. Our{" "}
          <Link
            href="/privacy"
            className="font-medium text-[var(--blush)] underline underline-offset-4"
          >
            Privacy Policy
          </Link>{" "}
          explains how we handle personal information.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">1. About Anak.Studio</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Anak.Studio is a marketplace platform operated by Ana Meza in Houston,
          Texas. We facilitate online booking requests between clients and
          independent beauty professionals who offer lashes, brows, and related
          services. We are not the provider of the beauty services themselves
          unless we expressly state otherwise for a specific booking.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">2. Marketplace relationship</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Professionals listed on Anak.Studio are independent businesses or
          individuals. When a client books through the Service, the client and the
          professional form a direct relationship for the performance of the
          appointment. Anak.Studio provides software tools to request, organize,
          and communicate about bookings. We do not guarantee the quality,
          outcome, licensing, skill, availability, or conduct of any professional,
          and we do not guarantee that any particular appointment will be
          accepted, completed, or performed as expected.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">3. Accounts and eligibility</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Clients may request bookings without creating an account. Professionals
          and marketplace administrators must create accounts and provide accurate
          information. You are responsible for safeguarding login credentials and
          for activity under your account. You must be at least 18 years old (or
          the age of majority in your jurisdiction) to create a professional
          account or to book services for yourself.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">4. Bookings</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          A booking request submitted through the Service is a request, not a
          guaranteed confirmed appointment, until the professional accepts or
          confirms it according to their own practices. Prices, durations,
          locations, and service descriptions are provided by professionals and
          may change. Clients should review details carefully before submitting a
          request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">5. Payments and marketplace access</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Payment for beauty services is typically arranged between the client and
          the professional (for example, at the studio), unless a specific
          payment flow is clearly offered on the site. Professional access to the
          marketplace may be subject to an access period or “paid until” status
          managed by Anak.Studio. Failure to maintain required access may result
          in reduced visibility or suspension of a professional listing. Fees
          charged by Anak.Studio for marketplace access, if any, are separate from
          amounts clients pay professionals for services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">6. Cancellations and changes</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Cancellation, rescheduling, no-show, and deposit policies are set by
          each professional unless Anak.Studio publishes a platform-wide rule for
          a specific promotion. Clients and professionals should communicate
          promptly about changes. Anak.Studio may help relay notices but is not
          responsible for losses arising from cancelled or missed appointments.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">7. SMS and email communications</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          By providing a phone number when you submit a booking, you consent to
          receive transactional SMS messages related to your booking and the
          Service (such as confirmations and reminders). By providing an email
          address, you consent to receive related transactional email. These
          messages are transactional in nature and are not advertising text
          campaigns. Message and data rates may apply. Reply{" "}
          <span className="text-[var(--ink)] font-medium">STOP</span> to opt out
          of SMS, or{" "}
          <span className="text-[var(--ink)] font-medium">HELP</span> for help.
          Additional details are in our Privacy Policy. Your mobile information
          will not be sold or shared with third parties for promotional or
          marketing purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">8. Acceptable use</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          You agree not to misuse the Service. Prohibited conduct includes, without
          limitation: providing false information; harassing users or staff;
          attempting unauthorized access; scraping or disrupting the Service;
          using the Service for unlawful activity; posting misleading professional
          credentials; or interfering with bookings in bad faith. We may suspend
          or terminate access for violations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">9. Intellectual property</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          The Anak.Studio name, branding, website design, and software are owned
          by us or our licensors. Professionals retain rights in their own photos
          and profile content but grant us a license to display that content on
          the Service for marketplace purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">10. Disclaimer of warranties</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM
          EXTENT PERMITTED BY LAW, ANAK.STUDIO DISCLAIMS ALL WARRANTIES, EXPRESS
          OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, ERROR-FREE, OR THAT ANY BOOKING OR BEAUTY SERVICE WILL
          MEET YOUR EXPECTATIONS.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">11. Limitation of liability</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, ANAK.STUDIO AND ITS OWNER,
          AFFILIATES, AND SERVICE PROVIDERS WILL NOT BE LIABLE FOR INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR
          FOR LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, ARISING OUT OF
          OR RELATED TO THE SERVICE OR ANY BOOKING. OUR TOTAL LIABILITY FOR ANY
          CLAIM ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE
          GREATER OF (A) THE AMOUNTS YOU PAID TO ANAK.STUDIO FOR MARKETPLACE
          ACCESS IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED
          U.S. DOLLARS (US $100). THESE LIMITATIONS APPLY EVEN IF A REMEDY FAILS
          OF ITS ESSENTIAL PURPOSE. Some jurisdictions do not allow certain
          limitations; in those cases, our liability is limited to the fullest
          extent permitted by law.
        </p>
        <p className="text-[var(--taupe)] leading-relaxed">
          Anak.Studio is not liable for injuries, allergic reactions, property
          damage, professional malpractice claims, or disputes arising from
          services performed by independent professionals.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">12. Indemnity</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          You agree to defend, indemnify, and hold harmless Anak.Studio and its
          owner from and against claims, damages, losses, and expenses (including
          reasonable attorneys’ fees) arising out of or related to your use of the
          Service, your content, your bookings, your violation of these Terms, or
          your violation of any law or third-party right.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">13. Governing law</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          These Terms are governed by the laws of the State of Texas and
          applicable United States federal law, without regard to conflict-of-law
          rules. Exclusive venue for disputes arising out of these Terms or the
          Service shall be the state or federal courts located in Harris County
          or Fort Bend County, Texas, unless applicable law requires otherwise.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">14. Changes</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          We may update these Terms from time to time. The “Last updated” date
          will change when we do. Continued use of the Service after an update
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section text-xl">15. Contact</h2>
        <p className="text-[var(--taupe)] leading-relaxed">
          Anak.Studio
          <br />
          Houston, Texas, USA
          <br />
          Website:{" "}
          <a
            className="font-medium text-[var(--blush)] underline underline-offset-4"
            href="https://bookanakstudio.com"
          >
            bookanakstudio.com
          </a>
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

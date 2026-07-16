import { Link } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter.jsx'

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-2 text-gray-700">{children}</div>
    </section>
  )
}

function TermsPage() {
  return (
    <div className="min-h-dvh bg-gray-100">
      <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm sm:px-6">
        <h1 className="text-lg font-bold text-gray-900">Mybase</h1>
        <Link
          to="/"
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to map
        </Link>
      </header>

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Terms of Service &amp; Liability Disclaimer
          </h1>
          <p className="mt-1 text-sm text-gray-500">Last Updated: July 16, 2026</p>

          <p className="mt-4 text-gray-700">
            Welcome to MyBase Housing (accessible at{' '}
            <a href="https://mybasehousing.co.zw" className="text-green-700 underline">
              mybasehousing.co.zw
            </a>
            ). By using our website and services, you agree to comply with and be bound
            by the following Terms of Service and Liability Disclaimer. Please read
            them carefully before using the platform or making any bookings.
          </p>

          <Section title="1. Independent Platform & No MSU Affiliation">
            <p>
              MyBase Housing is a private, independent platform created and operated
              entirely by individual developers.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>No Endorsement:</strong> We have no formal agreement, official
                partnership, or affiliation with Midlands State University (MSU).
              </li>
              <li>
                <strong>Private Initiative:</strong> This platform is not endorsed,
                sponsored, or monitored by MSU. Any services provided here are strictly
                independent of the university.
              </li>
            </ul>
          </Section>

          <Section title="2. Nature of Our Service">
            <p>
              MyBase Housing operates solely as an online directory and facilitator to
              connect students seeking accommodation with private landlords in Gweru.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                We do not own, manage, inspect, or control any of the properties listed
                on this platform.
              </li>
              <li>
                Agreements, interactions, and tenancies are strictly between the
                student (user) and the landlord.
              </li>
            </ul>
          </Section>

          <Section title="3. Strict Non-Refundable Booking Policy">
            <p>
              To secure your accommodation through MyBase Housing, a booking fee or
              deposit may be required.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>All Bookings are Final:</strong> Once a booking request is made
                and payment is processed, all booking fees, service fees, and security
                deposits paid through MyBase Housing are strictly non-refundable.
              </li>
              <li>
                <strong>No Exceptions:</strong> Refunds will not be issued for change
                of mind, academic schedule changes, university admission updates, or
                cancellation of tenancy by either party. Please ensure you are fully
                committed to the property before finalizing your booking.
              </li>
            </ul>
          </Section>

          <Section title="4. Limitation of Liability (Disclaimer)">
            <p>
              To the maximum extent permitted by law, MyBase Housing and its creators
              shall not be held liable for:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Property Conditions:</strong> Any discrepancy between the
                online listing (photos, descriptions, amenities) and the physical state
                of the property. We highly recommend viewing the property in person
                before moving in.
              </li>
              <li>
                <strong>Landlord/Tenant Disputes:</strong> Any disagreements, financial
                losses, property damage, or breach of lease agreements between
                landlords and tenants.
              </li>
              <li>
                <strong>Safety &amp; Security:</strong> Any personal injury, theft, or
                safety issues that may occur at any of the listed accommodations.
              </li>
              <li>
                <strong>Service Interruptions:</strong> Any temporary downtime or
                technical errors on the website.
              </li>
            </ul>
          </Section>

          <Section title="5. User Responsibilities">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Students:</strong> You are responsible for verifying the
                legitimacy of the landlord, reading your specific lease agreements
                carefully, and keeping your login details secure.
              </li>
              <li>
                <strong>Landlords:</strong> You are responsible for ensuring your
                listings are accurate, legal, safe, and up to date.
              </li>
            </ul>
          </Section>

          <Section title="6. Changes to Terms">
            <p>
              We reserve the right to modify these terms at any time. Continued use of
              the platform after changes are posted constitutes your acceptance of the
              updated terms.
            </p>
          </Section>

          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <strong>Consent:</strong> By continuing to use MyBase Housing or making a
            booking, you acknowledge that you have read, understood, and agreed to
            these terms, specifically noting that all bookings are non-refundable and
            that this platform is not affiliated with MSU.
          </div>
        </article>

        <SiteFooter />
      </main>
    </div>
  )
}

export default TermsPage

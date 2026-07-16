import { Link } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter.jsx'

function AboutPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">About MyBase Housing</h1>

          <p className="mt-4 text-gray-700">
            Finding a comfortable, safe, and affordable place to live while studying
            shouldn't be a stressful treasure hunt. We built MyBase Housing to make
            searching for off-campus student accommodation in Gweru simple,
            transparent, and completely digital.
          </p>

          <p className="mt-4 text-gray-700">
            Our platform connects students directly with local landlords, allowing you
            to browse boarding houses, view locations, and secure your next home away
            from home without the endless walking.
          </p>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-semibold text-amber-900">⚠️ Important Disclaimer</h2>
            <p className="mt-2 text-sm text-amber-900">
              MyBase Housing is an independent platform created and run entirely by
              individuals. We are a private initiative and have no formal agreement,
              official partnership, or affiliation with Midlands State University
              (MSU). All accommodation listings are managed independently by private
              landlords.
            </p>
          </div>

          <h2 className="mt-8 text-lg font-semibold text-gray-900">Contact us</h2>
          <p className="mt-2 text-gray-700">
            Business email:{' '}
            <a
              href="mailto:mybasezw@gmail.com"
              className="font-medium text-green-700 underline"
            >
              mybasezw@gmail.com
            </a>
          </p>
          <p className="mt-2 text-sm text-gray-600">
            You can also reach us through the in-app chat on the map page.
          </p>
        </article>

        <SiteFooter />
      </main>
    </div>
  )
}

export default AboutPage

import { Link } from 'react-router-dom'

// overlay=true renders as a floating chip (for the full-screen map);
// otherwise a plain centered footer for content pages
function SiteFooter({ overlay = false }) {
  const links = (
    <>
      <Link to="/about" className="hover:text-green-700 hover:underline">
        About
      </Link>
      <span aria-hidden="true">·</span>
      <Link to="/terms" className="hover:text-green-700 hover:underline">
        Terms &amp; Disclaimer
      </Link>
    </>
  )

  if (overlay) {
    return (
      <div className="absolute bottom-0 left-0 z-[999] flex items-center gap-1.5 rounded-tr-lg bg-white/85 px-2.5 py-1 text-xs text-gray-600 backdrop-blur">
        {links}
      </div>
    )
  }

  return (
    <footer className="flex items-center justify-center gap-1.5 py-6 text-xs text-gray-500">
      {links}
    </footer>
  )
}

export default SiteFooter

import { useEffect } from 'react'

const SCRIPT_ID = 'tawkto-embed-script'

function TawkChat() {
  useEffect(() => {
    window.openHouseChat = (houseName) => {
      const api = window.Tawk_API
      if (!api) return
      const message = `Hi! I'd like to ask about room availability at ${houseName}.`
      if (typeof api.setAttributes === 'function') {
        api.setAttributes({ Enquiry: houseName }, (err) => {
          if (err) console.warn('Tawk setAttributes failed:', err)
        })
      }
      // Tawk has no API to type into the visitor's input box, so the
      // pre-written enquiry is attached as a conversation event the agent
      // sees as soon as the chat opens.
      if (typeof api.addEvent === 'function') {
        api.addEvent(
          'availability-enquiry',
          { House: houseName, Message: message },
          (err) => {
            if (err) console.warn('Tawk addEvent failed:', err)
          },
        )
      }
      if (typeof api.maximize === 'function') {
        api.maximize()
      }
    }

    const tawkId = import.meta.env.VITE_TAWKTO_ID
    if (!tawkId) {
      console.warn('VITE_TAWKTO_ID is not set — Tawk.to chat disabled')
    } else if (!document.getElementById(SCRIPT_ID)) {
      window.Tawk_API = window.Tawk_API || {}
      window.Tawk_LoadStart = new Date()

      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.async = true
      script.src = `https://embed.tawk.to/${
        tawkId.includes('/') ? tawkId : `${tawkId}/default`
      }`
      script.charset = 'UTF-8'
      script.setAttribute('crossorigin', '*')
      document.head.appendChild(script)
    }

    return () => {
      delete window.openHouseChat
    }
  }, [])

  return null
}

export default TawkChat

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Domes Team App',
  description: 'Team performance and culture app for Domes Dispensary',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

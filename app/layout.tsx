import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'D&D on a Bus',
  description: 'Next stop: adventure. A scheduling calendar for your D&D group.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-amber-950 text-amber-100`}>
        {children}
      </body>
    </html>
  )
}

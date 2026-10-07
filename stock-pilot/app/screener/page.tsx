import Link from 'next/link';

export default function ScreenerPage() {
  return (
    <div>
      <h1>Stock Screener</h1>

      <p>Stock screener coming soon.</p>

      <Link href="/stocks/AAPL">View example stock</Link>
    </div>
  );
}
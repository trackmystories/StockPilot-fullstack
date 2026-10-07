type StockPageProps = {
  params: Promise<{
    ticker: string;
  }>;
};

export default async function StockPage({params}: StockPageProps) {
  const {ticker} = await params;

  return (
    <div>
      <h1>{ticker.toUpperCase()}</h1>

      <p>Stock details coming soon.</p>
    </div>
  );
}
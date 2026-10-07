export type NotificationType = 'stock' | 'research' | 'watchlist' | 'system';

export type StockPilotNotification = {
  id: string;

  type: NotificationType;

  ticker?: string;

  title: string;

  message: string;

  createdAt: string;

  read: boolean;

  articleId?: string;

  stockSymbol?: string;
};

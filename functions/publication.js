function articleNotification(before, after, articleId) {
  if (!after || after.status !== 'published' || before?.status === 'published') {
    return null;
  }

  return {
    type: 'research',

    ticker: typeof after.ticker === 'string' ? after.ticker.slice(0, 32) : '',

    title: (typeof after.title === 'string' ? after.title : 'New research available').slice(0, 160),

    message: (typeof after.excerpt === 'string' ? after.excerpt : 'Read our latest article.').slice(
      0,
      300,
    ),

    articleId,
  };
}

module.exports = {
  articleNotification,
};

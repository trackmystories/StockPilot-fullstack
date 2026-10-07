type Page = {items: {read: boolean}[]; nextCursor: string | null};

export async function hasUnreadNotifications(
  list: (cursor?: string | null) => Promise<Page>,
  isCurrent: () => boolean = () => true,
): Promise<boolean | null> {
  const visited = new Set<string>();
  let cursor: string | null = null;
  do {
    if (!isCurrent()) return null;
    const page = await list(cursor);
    if (!isCurrent()) return null;
    if (page.items.some((item) => !item.read)) return true;
    cursor = page.nextCursor;
    if (cursor) {
      if (visited.has(cursor)) throw new Error('Repeated notification cursor.');
      visited.add(cursor);
    }
  } while (cursor);
  return false;
}

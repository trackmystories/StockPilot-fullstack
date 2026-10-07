import type {Article} from '../domain/News';
import styles from './ArticleBody.module.css';
type Props = Pick<Article, 'body' | 'images'>;

export function ArticleBody({body, images = {}}: Props) {
  const blocks = body.split(/(\[\[IMAGE:[a-zA-Z0-9_-]+\]\])/g);

  return (
    <div className={styles.body}>
      {blocks.map((block, index) => {
        const marker = /^\[\[IMAGE:([a-zA-Z0-9_-]+)\]\]$/.exec(block);

        if (marker) {
          const image = images[marker[1]];

          if (!image?.url || !/^https?:\/\//i.test(image.url)) {
            return null;
          }

          return (
            <figure key={`image-${index}`} className={styles.diagram}>
              {/* Signed URLs are supplied by the backend for this article. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt || marker[1].replace(/-/g, ' ')}
                width={image.width}
                height={image.height}
                loading="lazy"
              />

              {image.caption && <figcaption>{image.caption}</figcaption>}
            </figure>
          );
        }

        return block.split(/\n\s*\n/).map((text, paragraphIndex) => {
          const paragraph = text.trim();

          if (!paragraph) {
            return null;
          }

          const key = `text-${index}-${paragraphIndex}`;
          const letters = paragraph.replace(/[^a-zA-Z]/g, '');

          if (paragraph.length <= 90 && letters && letters === letters.toUpperCase()) {
            return <h2 key={key}>{paragraph}</h2>;
          }

          return <p key={key}>{paragraph}</p>;
        });
      })}
    </div>
  );
}
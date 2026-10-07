import 'dotenv/config';
import {cert, getApps, initializeApp} from 'firebase-admin/app';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';
import {resolve} from 'node:path';

const credentialsPath = resolve(process.cwd(), 'src/firebase/firebase-service-account.json');
const existingApp = getApps().find((app) => app.name === '[DEFAULT]');
const app = existingApp ?? initializeApp({credential: cert(credentialsPath)});
const db = getFirestore(app);
const article = {
  id: 'stockpilot-scorecard-engineering',
  data: {
    ticker: 'Engineering',
    companyName: 'StockPilot',
    title: 'Engineering StockPilot: From Financial Data to Meaningful Scores',
    excerpt:
      'How StockPilot builds 30 scoring signals from normalized financial data, makes missing evidence visible, and delivers prepared analysis through Firestore.',
    category: 'Engineering',
    authorId: 'stock-pilot',
    authorName: 'Stock Pilot Engineering',
    status: 'published',
    images: {
      'data-to-scorecards': {
        storagePath: 'news/engineering/data-to-scorecards.png',
        width: 1800,
        height: 2300,
        alt: 'From financial data to scorecards',
        caption: 'Shared financial metrics support specialized scores and Smart List qualification.',
      },
      'scores-and-evidence': {
        storagePath: 'news/engineering/scores-and-evidence.png',
        width: 1800,
        height: 2220,
        alt: 'Coverage and confidence in scoring',
        caption: 'Insufficient evidence can produce an unavailable score.',
      },
      'scheduled-scores-to-app': {
        storagePath: 'news/engineering/scheduled-scores-to-app.png',
        width: 1800,
        height: 2640,
        alt: 'Scheduled scoring and Firestore delivery',
        caption: 'The backend publishes completed results for the app to read.',
      },
    },
    coverImagePath: '',
    coverImageUrl: '',
    body: `
Engineering StockPilot: From Financial Data to Meaningful Scores
A stock score looks simple on a screen: a number out of ten, a label, and a colour. Behind that number sits a harder engineering problem.
Financial information arrives across different reporting periods, currencies, and levels of completeness. Companies have different business models. A strong result in one quarter may say little about long-term consistency.
At StockPilot, we built our scoring system around these realities. Our goal is to help users understand a business through several distinct signals, while making the strength of the underlying evidence visible.
ONE BUSINESS. MULTIPLE PERSPECTIVES
Our scorecard retains 30 scores covering areas such as quality, growth, valuation, financial health, momentum, risk, and volatility. Each calculator answers a different question. Keeping them separate helps users see trade-offs that a single overall rating can hide.
A company might show strong growth while facing funding pressure. Another might have a resilient balance sheet but an expensive valuation. Both observations belong in the same assessment.
A SHARED FINANCIAL FOUNDATION
Before running the calculators, our backend organizes historical data from Financial Modeling Prep into comparable periods. It checks quarterly continuity, builds trailing twelve-month figures, and aligns financial statements by reporting date and currency.
This preparation matters because a mathematically correct formula can still produce a misleading result when its inputs are inconsistent. Combining revenue from one period with cash flow from another can distort the picture. Treating a negative earnings multiple as a sign of cheapness can reward a loss-making business for the wrong reason.
Shared normalization gives every calculator a consistent foundation while allowing each one to retain its own logic.
From there, we strengthen the individual signals. Profitability includes evidence of consistency across quarters. Cash generation considers whether positive free cash flow persists. Dilution analysis considers share growth and measures such as stock-based compensation relative to revenue.
Where enough comparable companies are available, selected metrics also incorporate peer-relative information. The system uses industry comparisons, with a sector fallback when necessary. These comparisons supplement absolute financial measures and help account for differences between groups of businesses.
The size of the comparison group matters. A small sample should not carry the same authority as a broad one, so peer adjustments require a minimum number of other companies.
[[IMAGE:data-to-scorecards]]
MAKING MISSING EVIDENCE VISIBLE
Our calculators report coverage and confidence alongside their scores. Coverage describes how much of the required evidence is available. Confidence reflects the strength of that evidence under the scoring rules; it is not a probability that a share price will rise.
When evidence is insufficient, a score can remain unavailable. The frontend preserves that result as N/A instead of replacing it with a reassuring default or an older value passed through navigation.
Smart Lists apply an additional layer of checks. A company must satisfy the relevant eligibility conditions before entering a ranked list. Depending on the calculation, these checks consider data freshness, financial evidence, and whether the criteria suit the company's business model. A high numerical result alone does not guarantee inclusion.
[[IMAGE:scores-and-evidence]]
PREPARING RESULTS BEFORE THE APP NEEDS THEM
Our scheduled NestJS pipeline first prepares and saves company inputs. Once preparation is complete, it builds peer comparisons and runs the calculators against that fixed set of companies. It then saves scorecards, supporting analysis, and ranking outputs to Firestore.
The pipeline records progress so interrupted work can resume from saved inputs and completed checkpoints. A shared processing lock prevents overlapping refresh jobs, and completion checks run before a new dataset becomes active.
React Native consumes these prepared results through our API. Opening a scorecard reads saved analysis rather than launching the calculation pipeline. The interface can also show when scores were generated, whether results are stale, and when a company has not yet been processed.
[[IMAGE:scheduled-scores-to-app]]
ENGINEERING FOR TRANSPARENCY
Passing software tests verifies defined behaviours; it does not establish predictive investment performance. Historical data can be incomplete, peer groups can be imperfect, and scoring thresholds remain modelling choices.
Our engineering responsibility is to make those choices consistent, inspectable, and honest about uncertainty. Every displayed score should connect to financial evidence, a defined calculation, and a clear account of what the system could and could not evaluate.
    `.trim(),
  },
};
async function seedScorecardEngineeringArticle() {
  try {
    const ref = db.collection('articles').doc(article.id);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      const now = Timestamp.now();
      transaction.set(
        ref,
        {...article.data, createdAt: existing.get('createdAt') ?? now, updatedAt: now, publishedAt: existing.get('publishedAt') ?? now},
        {merge: true},
      );
    });
    // Backfill image metadata for the existing Smart Lists article without changing its body or publication dates.
    const previousRef = db.collection('articles').doc('stockpilot-smart-lists-engineering');
    await db.runTransaction(async (transaction) => {
      const previous = await transaction.get(previousRef);
      if (!previous.exists) return;
      const existingImages = previous.get('images') ?? {};
      const images: Record<string, {storagePath: string; alt: string}> = {};
      for (const key of ['company-data-to-intelligence', 'normalized-profile-models', 'screening-pipeline']) {
        if (!existingImages[key]) images[key] = {storagePath: `news/engineering/${key}.png`, alt: key.replace(/-/g, ' ')};
      }
      if (Object.keys(images).length) transaction.set(previousRef, {images}, {merge: true});
    });
    console.log(`Uploaded articles/${article.id} — ${article.data.title}`);
  } catch (error) {
    console.error('Could not upload the scorecard engineering article:', error);
    process.exitCode = 1;
  }
}
void seedScorecardEngineeringArticle();

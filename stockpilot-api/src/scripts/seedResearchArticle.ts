import 'dotenv/config';
import {cert, getApps, initializeApp} from 'firebase-admin/app';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';
import {resolve} from 'node:path';

const articleId = 'stockpilot-research';

const images = {
  'research-process': {
    storagePath: 'news/engineering/stockpilot-research-cover-v3.png',
    width: 1600,
    height: 900,
    alt: 'StockPilot connects financial evidence and business context, assesses companies from several perspectives, and presents scorecards, charts and reports.',
    caption: 'A connected approach to understanding companies.',
  },
  'research-context': {
    storagePath: 'news/engineering/stockpilot-research-context-v3.png',
    width: 1600,
    height: 900,
    alt: 'Six areas of business context: business profile, operating measures, management explanations, material events, risk factors and segment intelligence.',
    caption: 'Business context complements financial analysis.',
  },
  'research-evidence': {
    storagePath: 'news/engineering/stockpilot-research-evidence-v3.png',
    width: 1600,
    height: 900,
    alt: 'Three distinct categories of research: reported results, forecasts and model outputs. The graphics are conceptual illustrations, not company data.',
    caption:
      'Reported results, expectations and calculated references have different meanings. Illustrative diagrams, not company data.',
  },
};

const body = `
A ticker tells you the price. Research helps you understand the business.

StockPilot brings financial performance, business developments and valuation into a connected research experience. Our goal is to help people understand what they own, compare opportunities more thoughtfully and recognise the questions that deserve a closer look.

That starts with how we approach information. Every chart, assessment and report should help explain something meaningful about a company.


FROM INFORMATION TO UNDERSTANDING

Investors face an abundance of information: changing prices, earnings announcements, forecasts and long company disclosures. The difficult part is deciding how those pieces fit together.

Rising revenue can sit alongside falling profitability. Strong earnings can coexist with weak cash generation. An apparently inexpensive company may carry risks that a valuation multiple alone cannot explain.

StockPilot examines these relationships through a shared research framework. We organise the evidence, calculate distinct financial assessments and bring the results together with relevant business context.


SEPARATE QUESTIONS. A MORE COMPLETE PICTURE.

We approach a company from several perspectives because each answers a different investment question.

• Growth: Is the business expanding, and how does its recent performance compare with earlier periods?

• Quality: How effectively does the company turn its activity and capital into profits and cash?

• Financial strength: What do debt, liquidity and cash resources tell us about its ability to manage pressure?

• Valuation: How does the current price relate to the financial measures and assumptions used in our models?

• Risk and momentum: How has the share price behaved, and what vulnerabilities warrant attention?

These assessments use defined inputs and calculation rules. Where suitable comparisons are available, peer information adds another perspective. A broad industry label alone does not establish that two companies are directly comparable.

The result is a set of useful perspectives. A strong growth assessment does not erase balance-sheet concerns, and a low valuation does not establish that a stock is a good investment.


THE BUSINESS BEHIND THE NUMBERS

Financial calculations become more useful when readers can connect them with what is happening inside the company.

Our research framework includes six areas of business context: what the company does, its operating measures, management's explanations, significant events, business risks and the performance of its individual segments.

The relevant details differ by company. Customer retention may help explain a software business. Production volumes and capacity may matter more to an industrial operator. Segment performance can reveal changes that a company-wide total conceals.

We retain management's explanations as management's account of events. An explanation from the company is useful context, but it is not independent confirmation of a cause or a prediction.

[[IMAGE:research-context]]


EVIDENCE BEFORE CONCLUSIONS

Our guiding principle is simple: no evidence, no claim.

An unavailable assessment should not appear as a confident score. Missing information should not become a zero, and an actual loss should not disappear because it is inconvenient to a calculation.

We keep a connection between the research and its supporting evidence. We also distinguish reported results, forecasts and model outputs so readers can understand what each represents.

Fair Value is a model-based reference that depends on its inputs and assumptions. Earnings Outlook reflects expectations rather than guaranteed results. The Investment Case brings together supporting factors and concerns to help readers investigate further.

[[IMAGE:research-evidence]]

Coverage varies between companies. A finished report does not mean every possible question has been answered.


CHARTS THAT HELP PEOPLE ASK BETTER QUESTIONS

A useful chart should make a relationship easier to see.

Revenue history can show the direction of the business. Profit trends can reveal whether growth is reaching the bottom line. A valuation comparison can show the distance between a market price and a model reference, while a forecast chart makes expectations easier to follow.

Our aim is to make those distinctions understandable to someone beginning their investment journey, while preserving the context an experienced reader needs. Readers can move from a chart to the fuller report to explore the surrounding analysis.


A CONSISTENT APPROACH, BUILT TO SCALE

StockPilot's research process is designed to work across thousands of stocks. Prepared analysis can support scorecards, discovery tools, charts and reports, giving people connected views of the same underlying research.

As relevant information changes, the goal is to refresh the affected analysis and reuse work that remains applicable. This supports a more efficient product and gives us a foundation for expanding research coverage.

For us, product quality includes both the calculation and the way it is communicated. Clear definitions, visible distinctions and careful handling of missing evidence matter as much as presenting a polished chart.


OUR GOAL

We are building StockPilot to make company research easier to explore, understand and question.

We want new investors to develop better research habits, experienced investors to evaluate opportunities more efficiently, and every reader to understand the reasoning behind an assessment.

Better investing starts with better questions. StockPilot is built to help you ask them.
`.trim();

async function seedResearchArticle() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET?.trim();

  if (!bucketName) {
    throw new Error(
      'FIREBASE_STORAGE_BUCKET must be set in your backend .env file.',
    );
  }

  const credentialsPath = resolve(
    process.cwd(),
    'src/firebase/firebase-service-account.json',
  );

  const app =
    getApps().find((candidate) => candidate.name === '[DEFAULT]') ??
    initializeApp({
      credential: cert(credentialsPath),
      storageBucket: bucketName,
    });

  const db = getFirestore(app);
  const articleRef = db.collection('articles').doc(articleId);
  const existing = await articleRef.get();
  const now = Timestamp.now();

  // These three images are uploaded separately to Firebase Storage.
  // Each body marker has its own explicit image path above.
  await articleRef.set({
    ticker: 'Research',
    companyName: 'StockPilot',
    title: 'Research',
    excerpt:
      'How StockPilot connects financial performance, business context and evidence-led calculations to help investors understand companies and ask better questions.',
    category: 'Research',
    authorId: 'stock-pilot',
    authorName: 'StockPilot',
    status: 'published',
    coverImagePath: images['research-process'].storagePath,
    coverImageUrl: '',
    images,
    body,
    createdAt: existing.get('createdAt') ?? now,
    updatedAt: now,
    publishedAt: now,
  });

  console.log(`Published articles/${articleId} — Research`);
}

void seedResearchArticle().catch((error: unknown) => {
  console.error('Could not publish the Research article:', error);
  process.exitCode = 1;
});
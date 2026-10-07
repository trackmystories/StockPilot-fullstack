import 'dotenv/config';
import {cert, getApps, initializeApp} from 'firebase-admin/app';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';
import {resolve} from 'node:path';
const credentialsPath = resolve(process.cwd(), 'src/firebase/firebase-service-account.json');
const existingApp = getApps().find((app) => app.name === '[DEFAULT]');
const app =
  existingApp ??
  initializeApp({
    credential: cert(credentialsPath),
  });
const db = getFirestore(app);
const now = Timestamp.now();
const article = {
  id: 'stockpilot-smart-lists-engineering',
  data: {
    ticker: 'Engineering',
    companyName: 'StockPilot',
    title: 'How StockPilot Turns Financial Data Into Smart Stock Lists',
    excerpt:
      'Inside the architecture behind StockPilot Smart Lists — from financial data and specialized models to qualification thresholds and ranked research opportunities.',
    category: 'Engineering',
    authorId: 'stock-pilot',
    authorName: 'Stock Pilot Engineering',
    status: 'published',
    coverImagePath: '',
    coverImageUrl: '',
    images: {
      'company-data-to-intelligence': {
        storagePath: 'news/engineering/company-data-to-intelligence.png',
        alt: 'Company data and specialized intelligence models',
      },
      'normalized-profile-models': {
        storagePath: 'news/engineering/normalized-profile-models.png',
        alt: 'A shared normalized company profile supports multiple models',
      },
      'screening-pipeline': {
        storagePath: 'news/engineering/screening-pipeline.png',
        alt: 'The Smart Lists screening pipeline',
      },
    },
    body: `
How StockPilot Turns Financial Data Into Smart Stock Lists

Finding a good stock isn't about looking at one number.

A company can be growing quickly but carrying too much debt. It can be highly profitable but extremely expensive. It can have an excellent balance sheet while its business is slowing down.

At StockPilot, we approach this differently.

Instead of asking a single question such as "Is this a good stock?", our intelligence system evaluates each company from multiple perspectives.


ONE COMPANY. MULTIPLE PERSPECTIVES

When StockPilot analyzes a company, we first collect the financial and market information required by our models.

This can include:

• Revenue, earnings and cash flow
• Assets, debt and liquidity
• Profitability and margins
• Valuation metrics
• Historical price behaviour
• Analyst estimates
• Market capitalization
• Sector and industry information

That information becomes a common financial profile for the company.

But collecting the data is only the beginning.

[[IMAGE:company-data-to-intelligence]]

Instead of creating one universal score, StockPilot passes the company through a collection of specialized models.

Think of it as examining the same business through several different lenses.


SPECIALIZED MODELS INSTEAD OF A SINGLE SCORE

Each StockPilot model is designed to answer a different question.


HIGH QUALITY

High Quality looks for businesses displaying characteristics associated with strong underlying operations, including profitability and efficiency.


HIGH GROWTH

High Growth focuses on how quickly important financial measures such as revenue, earnings and cash generation are developing.


STRONG BALANCE SHEET

Strong Balance Sheet examines financial resilience, liquidity and the company's ability to support its obligations.


UNDERVALUED

Undervalued examines aspects of the company's valuation relative to its underlying financial performance.


STRONG MOMENTUM

Strong Momentum looks at price behaviour and market trend strength.


But some of the more interesting Smart Lists come from combining these ideas.

For example, Quality Near Lows isn't simply looking for stocks whose prices have fallen.

It combines price position with business quality.

Likewise, Undervalued Momentum looks for companies displaying both attractive valuation characteristics and positive market momentum.

This allows StockPilot to ask more useful questions:

"What happens when a financially strong company is trading near the lower end of its recent price range?"

Or:

"Which growing companies also have strong balance sheets?"

Those intersections are where Smart Lists become particularly useful.


A STOCK CAN BELONG TO MORE THAN ONE SMART LIST

StockPilot doesn't force every company into a single category.

Imagine a company receiving these results:

High Quality — 91
Qualifies

High Growth — 84
Qualifies

Strong Balance Sheet — 96
Qualifies

Strong Momentum — 78
Below threshold

Quality Near Highs — 88
Qualifies

Undervalued — 42
Below threshold

The same company could therefore appear in High Quality, High Growth, Strong Balance Sheet and Quality Near Highs.

That's intentional.

Companies aren't one-dimensional, so we don't believe the research process should be either.


SEPARATING DATA COLLECTION FROM INTELLIGENCE

An important part of StockPilot's architecture is separating data collection from intelligence.

Financial information is collected and normalized into a common company profile.

Our models can then analyze that same profile from different perspectives.

[[IMAGE:normalized-profile-models]]

This distinction matters because calculating a score is relatively inexpensive.

Collecting, cleaning, standardizing and maintaining the underlying financial information is the more demanding part.

By separating those responsibilities, StockPilot can reuse the same underlying information across many different models.

Quality can examine it one way.

Growth can examine it another.

Valuation, momentum, balance-sheet strength and risk can each examine another part of the same company.

The result is a collection of specialized signals rather than one opaque number.


SCREENING BEFORE DEEP ANALYSIS

There is another important principle behind the system.

Not every company needs every calculation.

StockPilot can first apply inexpensive eligibility rules to narrow the market before performing deeper analysis.

[[IMAGE:screening-pipeline]]

Consider Small-Cap Growth.

If a company's market capitalization is already outside the range required by the model, there is little reason to perform every expensive calculation simply to discover that it wasn't eligible in the first place.

The same idea applies to thematic lists.

A semiconductor Smart List can first identify companies associated with the semiconductor industry before applying deeper financial models.

The process becomes:

Stock Universe
↓
Basic Company Data
↓
Eligibility Filters
↓
Candidate Companies
↓
Financial Analysis
↓
StockPilot Models
↓
Qualification Thresholds
↓
Ranked Smart Lists

This makes the intelligence pipeline considerably more efficient.


FROM THOUSANDS OF STOCKS TO A SHORTER RESEARCH LIST

Traditional stock screeners often start by asking investors to construct complicated filters:

Revenue growth greater than X.

Debt-to-equity below Y.

P/E below Z.

RSI below N.

These metrics can be useful, but they require investors to already know exactly what they are looking for.

StockPilot approaches the problem from the opposite direction.

We want investors to be able to ask understandable questions.

Which companies are financially strong?

Which businesses are growing quickly?

Which quality companies are trading near their lows?

Which smaller companies combine growth with quality?

Which companies combine attractive valuation characteristics with positive momentum?

The calculations happen underneath.

The user starts with the investment idea.


BUILDING EXPLAINABLE INTELLIGENCE

We also don't want StockPilot intelligence to become a black box.

A number such as:

Score: 87

isn't particularly useful by itself.

The important question is:

Why did the company receive 87?

Our longer-term goal is for every Smart List result to be traceable:

Smart List
↓
Model
↓
Metrics
↓
Financial Data

That means an investor should be able to move from a StockPilot result back toward the underlying reasoning.

A company appearing in Strong Balance Sheet, for example, should be there because measurable balance-sheet characteristics caused it to qualify — not because an unexplained system decided that it looked attractive.


SMART LISTS ARE THE BEGINNING OF RESEARCH

StockPilot Smart Lists aren't intended to answer the question:

"What should I buy?"

They're designed to answer a different question:

"Where should I start looking?"

There are thousands of publicly traded companies.

Finding interesting businesses inside that universe is itself a significant research problem.

StockPilot reduces that universe into smaller groups of companies displaying specific characteristics.

From there, investors can investigate the business, valuation, risks, financial statements, competitive position and investment thesis in more detail.

The system therefore works as a research funnel:

Market
↓
Data
↓
Models
↓
Smart Lists
↓
Research

The algorithms identify characteristics.

The investor makes the decision.


FROM NOISE TO OPPORTUNITY

Financial markets produce an enormous amount of information.

Prices move.

Earnings change.

Estimates change.

Businesses grow.

Margins expand and contract.

Balance sheets strengthen and weaken.

Trying to process all of that manually can quickly become overwhelming.

StockPilot's job is to organize that information into something more understandable.

Not by pretending that investing can be reduced to one magic number.

But by looking at companies from multiple perspectives and helping investors discover the ones that deserve a closer look.

From noise to opportunity.

This article is for informational and educational purposes only and should not be considered investment advice.
    `.trim(),
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
};
async function seedEngineeringArticle() {
  try {
    await db.collection('articles').doc(article.id).set(article.data, {
      merge: true,
    });
    console.log(`✅ Uploaded articles/${article.id} — ${article.data.title}`);
    console.log('\n✅ StockPilot Engineering article uploaded successfully');
  } catch (error) {
    console.error('❌ Could not upload StockPilot Engineering article:', error);
    process.exitCode = 1;
  }
}
void seedEngineeringArticle();

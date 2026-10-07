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
  id: 'stockpilot-why-we-hide-incomplete-scores',
  data: {
    ticker: 'Engineering',
    companyName: 'StockPilot',
    title: 'Why StockPilot Hides Incomplete Scorecards',
    excerpt:
      'Inside our scoring pipeline: shared financial metrics, specialized calculators, evidence requirements and the rules that keep unsupported scores off the screen.',
    category: 'Engineering',
    authorId: 'stock-pilot',
    authorName: 'Stock Pilot Engineering',
    status: 'published',
    coverImagePath: 'news/engineering/evidence-first-score-pipeline.png',
    coverImageUrl: '',
    images: {
      'evidence-first-score-pipeline': {
        storagePath: 'news/engineering/evidence-first-score-pipeline.png',
        alt: 'Black-and-white diagram showing saved inputs, normalized metrics, peer comparisons, calculators, publication checks, Firestore and React Native.',
      },
      'required-input-coverage': {
        storagePath: 'news/engineering/required-input-coverage.png',
        alt: 'Illustrative model with component weights of 40%, 35% and 25%. The final component is unavailable, so usable model weight is 75% and the headline score is withheld.',
      },
      'scorecard-visibility-rules': {
        storagePath: 'news/engineering/scorecard-visibility-rules.png',
        alt: 'Decision diagram: display a card only when required components are usable, model requirements pass and a finite numerical score is available. Otherwise hide the card and retain backend evidence.',
      },
    },
    body: `
Why StockPilot Hides Incomplete Scorecards

A financial score is easy to display.

Establishing whether the available evidence supports that score is the harder engineering problem.

At StockPilot, each scorecard answers a particular question about a company. Before the result becomes a visible card, it must satisfy the requirements of its model.

When a model cannot produce an eligible, adequately supported result, its card stays hidden.


ONE COMPANY. MANY DIFFERENT QUESTIONS.

Our scoring system includes 30 scorecard assessments, alongside 22 Smart List calculations.

Quality examines characteristics of the underlying business.

Growth examines financial expansion.

Financial Health examines balance-sheet characteristics.

Momentum examines market trends.

Other models consider cash generation, dilution, funding pressure and combinations of these signals.

Each model has its own inputs, weights and rules. A company can receive a valid assessment in one area while another assessment remains unavailable.


SHARED INPUTS, CONSISTENT DEFINITIONS

Financial statements, market observations and estimates pass through a shared normalization layer.

This produces reusable metrics such as:

• Trailing revenue and earnings
• Operating and net profit margins
• Operating cash flow and free cash flow
• Debt, cash and liquidity ratios
• Historical price returns
• Share-count changes
• Forward estimates where comparable data is available

Calculators consume those shared metrics, helping keep definitions consistent across the system.

For supported metrics, we map observations onto scoring thresholds. Where sufficient eligible peers exist, some assessments also incorporate industry or sector comparisons.

Peer information supplements the absolute financial assessment. It does not make an otherwise unusable metric valid.

[[IMAGE:evidence-first-score-pipeline]]


WHY MISSING INPUTS MUST NOT IMPROVE A SCORE

Consider an illustrative model with three components:

Component A — weight: 40%, score: 9
Component B — weight: 35%, score: 8
Component C — weight: 25%, unavailable

If we removed Component C and redistributed its weight across the remaining components, the result would be approximately 8.5 out of 10.

But that would be a different calculation from the original model.

The unavailable component might have strengthened the assessment or weakened it. Without the evidence, we cannot know.

Our updated weighted scoring logic therefore withholds the headline score when a required component is unavailable or has incomplete underlying coverage.

The available component evidence is retained. The incomplete headline assessment is not displayed.

[[IMAGE:required-input-coverage]]


COMPLETE COVERAGE HAS A SPECIFIC MEANING

Complete coverage means the model's required components are usable.

It does not mean every possible financial field is available. It also does not mean the source data has been independently verified.

Optional peer comparisons may remain unavailable without blocking a model that supports an absolute assessment.

Evidence confidence describes the available evidence under our rules. It is not a probability that an investment will succeed.


MISSING INFORMATION IS DIFFERENT FROM UNFAVORABLE INFORMATION

Zero operating cash flow is a known observation.

A reported loss is a known observation.

Neither should automatically be treated as a missing field.

However, particular formulas may not be meaningful for those observations. A conventional positive earnings multiple, for example, cannot be interpreted normally when earnings are negative.

We preserve the reported fact while marking the affected calculation as unavailable.

We also apply financial consistency checks where implemented. If reported free cash flow conflicts with operating cash flow minus capital expenditure, that input cannot silently pass through the calculation.


HAVING DATA IS ONLY THE FIRST REQUIREMENT

A model must also be applicable to the evidence it receives.

Our Operating Leverage assessment, for example, requires positive operating income and a positive incremental operating margin before displaying a headline score.

An improving margin alone does not establish that profits are growing faster than revenue.

Composite assessments have additional dependencies. They require complete, eligible core inputs, and some impose minimum underlying factor scores.

A composite can therefore remain hidden because a qualification rule failed even when its inputs are present.

A hidden card must never be interpreted as a favorable result. Valid low scores remain visible when their own model requirements are satisfied.

Source-date checks can also block assessments when required observations are stale or their dates are missing.

[[IMAGE:scorecard-visibility-rules]]


CALCULATE ON THE BACKEND. DISPLAY PREPARED RESULTS.

The backend runs the calculations and records the result, component evidence, coverage, confidence and withholding reasons.

Completed outputs are stored in Firestore.

During a full saved-input rebuild, we regenerate metrics across the stock universe, rebuild peer comparisons and calculate every assessment before verifying and activating the new generation.

The previous active generation remains available while the replacement is being built.

Recalculation preserves source dates. It cannot supply missing information or turn old observations into fresh market data.


WHY SOME CARDS DO NOT APPEAR

React Native consumes the prepared backend results.

The scorecard builder withholds incomplete or ineligible numerical ratings. The All Scores screen then filters out entries without a finite numerical score before rendering its grid.

That means unavailable assessments do not appear as empty cards or unsupported ratings.

Hiding a card does not delete the calculator or its backend evidence. We retain the component information and reasons so the assessment can be investigated and recalculated when suitable evidence becomes available.


EVIDENCE BEFORE SCORES

The backend determines whether a score is supported.

Firestore stores the prepared result.

The interface displays the assessments that qualify.

This separation helps keep the application responsive while making the publication rules explicit.

Scorecards are research tools. Their usefulness depends on the definitions, evidence and limitations behind each number.

Sometimes the most accurate result our system can provide is that a particular assessment is not currently available.

This article is for informational and educational purposes only and should not be considered investment advice.
    `.trim(),
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
};
async function seedScorecardEvidenceArticle() {
  try {
    await db.collection('articles').doc(article.id).create(article.data);
    console.log(`✅ Uploaded articles/${article.id} — ${article.data.title}`);
    console.log('\n✅ StockPilot Scorecard Engineering article uploaded successfully');
  } catch (error) {
    console.error('❌ Could not upload StockPilot Scorecard Engineering article:', error);
    process.exitCode = 1;
  }
}
void seedScorecardEvidenceArticle();

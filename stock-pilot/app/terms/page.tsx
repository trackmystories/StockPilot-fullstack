import {LegalPage} from '../components/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="STOCKPILOT LEGAL"
      title="Terms of Use"
      lastUpdated="September 18, 2026"
      introduction={
        <>
          <p>
            These Terms of Use govern your access to and use of StockPilot,
            including our website, applications, software, research tools,
            financial information, analytics and related services.
          </p>

          <p>
            By accessing or using StockPilot, you agree to these Terms. If you
            do not agree, you must not use the service.
          </p>
        </>
      }
      sections={[
        {
          title: '1. Information Service Only',
          content: (
            <>
              <p>
                StockPilot provides financial information, analytics, company
                data, research tools, screening tools, investor signals and
                related informational content.
              </p>

              <p>
                <strong>
                  StockPilot does not provide investment, financial, legal, tax
                  or accounting advice.
                </strong>
              </p>

              <p>
                Nothing made available through StockPilot constitutes or should
                be interpreted as a recommendation, solicitation, offer or
                endorsement to buy, sell, hold or otherwise transact in any
                security, financial instrument or investment.
              </p>
            </>
          ),
        },

        {
          title: '2. No Investment Adviser or Fiduciary Relationship',
          content: (
            <>
              <p>
                Your use of StockPilot does not create an investment adviser,
                broker-client, fiduciary, advisory or other professional
                relationship between you and StockPilot.
              </p>

              <p>
                Any investment decision you make is made independently and at
                your own discretion and risk.
              </p>
            </>
          ),
        },

        {
          title: '3. Investment Risk',
          content: (
            <>
              <p>
                Investing involves risk, including the possible loss of some or
                all invested capital. Past performance does not guarantee
                future results.
              </p>

              <p>
                Prices, financial conditions, company performance and market
                circumstances may change rapidly. Information displayed in
                StockPilot may therefore become outdated after it is
                published.
              </p>

              <p>
                You are responsible for performing your own research and, where
                appropriate, obtaining advice from qualified professional
                advisers before making financial decisions.
              </p>
            </>
          ),
        },

        {
          title: '4. Automated Analysis, Scores and Investor Signals',
          content: (
            <>
              <p>
                StockPilot may generate automated calculations, financial
                ratios, rankings, investor signals, thesis summaries, bull or
                bear factors, scores or other analytical outputs based on
                available financial and market data.
              </p>

              <p>
                These outputs are analytical tools only. They may rely on
                assumptions, formulas, automated processes, third-party data
                and incomplete or delayed information.
              </p>

              <p>
                No score, signal, thesis, classification, metric or automated
                analysis should be interpreted as a guarantee, prediction or
                recommendation concerning the future performance of an
                investment.
              </p>
            </>
          ),
        },

        {
          title: '5. Accuracy and Availability of Information',
          content: (
            <>
              <p>
                StockPilot obtains information from third-party sources and may
                also calculate derived metrics from those sources.
              </p>

              <p>
                Although we aim to provide useful and reliable information, we
                do not warrant that information is complete, accurate,
                current, error-free or suitable for any particular purpose.
              </p>

              <p>
                Market data may be delayed. Financial statements may later be
                restated. Third-party data may contain errors, omissions or
                inconsistencies.
              </p>
            </>
          ),
        },

        {
          title: '6. No Guarantee of Results',
          content: (
            <>
              <p>
                StockPilot makes no representation or guarantee that using the
                service will result in profits, prevent losses, identify
                successful investments or improve investment performance.
              </p>

              <p>
                Any examples, estimates, projections, scenarios or historical
                analyses are provided for informational purposes only.
              </p>
            </>
          ),
        },

        {
          title: '7. User Responsibility',
          content: (
            <>
              <p>
                You are solely responsible for decisions made on the basis of
                information obtained through StockPilot.
              </p>

              <p>
                Before acting on information provided through the service, you
                should independently verify information that is material to
                your decision and consider your financial circumstances,
                investment objectives and tolerance for risk.
              </p>
            </>
          ),
        },

        {
          title: '8. Accounts and Security',
          content: (
            <>
              <p>
                Where an account is required, you are responsible for providing
                accurate information and maintaining the confidentiality and
                security of your account credentials.
              </p>

              <p>
                You are responsible for activity performed through your
                account unless prohibited by applicable law.
              </p>

              <p>
                You must notify StockPilot promptly if you believe your account
                has been compromised.
              </p>
            </>
          ),
        },

        {
          title: '9. Acceptable Use',
          content: (
            <>
              <p>
                You may not misuse StockPilot. Prohibited conduct includes:
              </p>

              <ul>
                <li>
                  attempting to gain unauthorised access to the service or
                  underlying systems;
                </li>

                <li>
                  interfering with the operation, security or availability of
                  StockPilot;
                </li>

                <li>
                  scraping, harvesting or systematically extracting data except
                  where expressly authorised;
                </li>

                <li>
                  reverse engineering or attempting to derive proprietary
                  source code except where such restriction is prohibited by
                  law;
                </li>

                <li>
                  using StockPilot for unlawful, fraudulent or abusive
                  purposes;
                </li>

                <li>
                  reproducing or redistributing proprietary StockPilot content
                  or licensed data without permission.
                </li>
              </ul>
            </>
          ),
        },

        {
          title: '10. Intellectual Property',
          content: (
            <>
              <p>
                StockPilot and its associated software, designs, trademarks,
                interfaces, analysis, text, graphics and other proprietary
                materials are owned by StockPilot or its licensors and are
                protected by applicable intellectual property laws.
              </p>

              <p>
                These Terms grant you a limited, revocable, non-exclusive and
                non-transferable right to use StockPilot for your personal or
                authorised business use.
              </p>
            </>
          ),
        },

        {
          title: '11. Third-Party Services and Data',
          content: (
            <>
              <p>
                StockPilot may rely upon or link to third-party services,
                financial data providers, websites, APIs and other resources.
              </p>

              <p>
                StockPilot does not control and is not responsible for the
                availability, accuracy, content, security or practices of
                third-party services.
              </p>
            </>
          ),
        },

        {
          title: '12. Service Availability',
          content: (
            <>
              <p>
                We may modify, suspend, restrict or discontinue all or part of
                StockPilot at any time, including for maintenance, security,
                technical, commercial or regulatory reasons.
              </p>

              <p>
                We do not guarantee uninterrupted or error-free access to the
                service.
              </p>
            </>
          ),
        },

        {
          title: '13. Disclaimer of Warranties',
          content: (
            <>
              <p>
                To the maximum extent permitted by applicable law, StockPilot
                is provided on an “as is” and “as available” basis without
                warranties of any kind, whether express, implied or statutory.
              </p>

              <p>
                To the extent permitted by law, we disclaim implied warranties
                including merchantability, fitness for a particular purpose,
                non-infringement, accuracy and uninterrupted availability.
              </p>
            </>
          ),
        },

        {
          title: '14. Limitation of Liability',
          content: (
            <>
              <p>
                To the maximum extent permitted by applicable law, StockPilot,
                its operators, affiliates, officers, employees, contractors
                and service providers will not be liable for investment losses,
                trading losses, lost profits, loss of opportunity, lost data,
                business interruption or any indirect, incidental, special,
                consequential or punitive damages arising out of or relating to
                your use of, or reliance upon, StockPilot.
              </p>

              <p>
                This includes losses resulting from investment decisions made
                using information, analysis, estimates, metrics, scores,
                signals, news or other material provided through StockPilot.
              </p>

              <p>
                Nothing in these Terms excludes or limits liability that cannot
                lawfully be excluded under applicable law.
              </p>
            </>
          ),
        },

        {
          title: '15. Indemnification',
          content: (
            <>
              <p>
                To the extent permitted by applicable law, you agree to
                indemnify and hold harmless StockPilot and its operators from
                claims, liabilities, damages and reasonable costs arising from
                your unlawful use of the service, violation of these Terms or
                infringement of the rights of another person.
              </p>
            </>
          ),
        },

        {
          title: '16. Suspension and Termination',
          content: (
            <>
              <p>
                We may suspend or terminate access to StockPilot where we
                reasonably believe that you have violated these Terms,
                compromised the security of the service, engaged in unlawful
                activity or created material risk to StockPilot or other users.
              </p>
            </>
          ),
        },

        {
          title: '17. Changes to These Terms',
          content: (
            <>
              <p>
                We may update these Terms from time to time. Updated Terms will
                be published with a revised effective date.
              </p>

              <p>
                Continued use of StockPilot after updated Terms become
                effective constitutes acceptance of those Terms to the extent
                permitted by applicable law.
              </p>
            </>
          ),
        },

        {
          title: '18. Governing Law',
          content: (
            <>
              <p>
                These Terms will be governed by the laws applicable to the
                legal entity operating StockPilot, subject to any mandatory
                consumer protection rights or jurisdictional rules that apply
                to you.
              </p>

              <p>
                Before public launch, this section should be updated to identify
                StockPilot&apos;s legal entity, registered address, governing
                law and competent courts.
              </p>
            </>
          ),
        },

        {
          title: '19. Contact',
          content: (
            <>
              <p>
                Questions regarding these Terms may be directed to:
              </p>

              <p>
                <strong>StockPilot</strong>
                <br />
                Legal enquiries:
                {' '}
                <a href="mailto:legal@stockpilot.ai">
                  legal@stockpilot.ai
                </a>
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
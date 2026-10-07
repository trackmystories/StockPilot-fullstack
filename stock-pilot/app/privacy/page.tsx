import {LegalPage} from '../components/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="STOCKPILOT LEGAL"
      title="Privacy Policy"
      lastUpdated="September 18, 2026"
      introduction={
        <>
          <p>
            This Privacy Policy explains how StockPilot collects, uses,
            protects and otherwise processes information when you access or use
            the StockPilot website, applications, services and related
            products.
          </p>

          <p>
            We are committed to handling personal information responsibly. We
            do not sell your personal information and we do not disclose your
            personal information to third parties for their own advertising or
            marketing purposes.
          </p>
        </>
      }
      sections={[
        {
          title: '1. Information We Collect',
          content: (
            <>
              <p>
                Depending on how you use StockPilot, we may collect information
                that you provide directly to us as well as information
                generated automatically through your use of the service.
              </p>

              <p>
                Information we may collect includes:
              </p>

              <ul>
                <li>
                  account information such as your name, email address and
                  authentication information;
                </li>

                <li>
                  preferences, watchlists, saved companies, favourites and
                  other information you choose to store within StockPilot;
                </li>

                <li>
                  communications that you send to us, including support
                  requests or feedback;
                </li>

                <li>
                  device and technical information, including IP address,
                  browser type, operating system, device type and application
                  version;
                </li>

                <li>
                  usage information, including pages or screens viewed,
                  features used, interactions, navigation activity, session
                  duration and similar activity;
                </li>

                <li>
                  diagnostic information such as application errors, crashes,
                  performance information and security events.
                </li>
              </ul>
            </>
          ),
        },

        {
          title: '2. Usage Tracking and Analytics',
          content: (
            <>
              <p>
                StockPilot may use analytics, logging and similar technologies
                to understand how users interact with our services. This may
                include tracking events such as screens viewed, features used,
                searches performed, buttons selected, session activity and
                technical performance.
              </p>

              <p>
                We use this information to operate StockPilot, understand
                product usage, improve functionality, diagnose problems,
                prevent abuse, improve security and develop new features.
              </p>

              <p>
                Where required by applicable law, we will obtain consent before
                using non-essential cookies or similar tracking technologies.
              </p>
            </>
          ),
        },

        {
          title: '3. How We Use Information',
          content: (
            <>
              <p>
                We may process information for purposes including:
              </p>

              <ul>
                <li>providing and maintaining StockPilot;</li>
                <li>creating and managing user accounts;</li>
                <li>personalising features and saved preferences;</li>
                <li>measuring product usage and improving the service;</li>
                <li>maintaining security and preventing fraud or misuse;</li>
                <li>responding to customer support requests;</li>
                <li>complying with applicable legal obligations;</li>
                <li>
                  protecting the rights, property and security of StockPilot,
                  our users and others.
                </li>
              </ul>
            </>
          ),
        },

        {
          title: '4. We Do Not Sell Personal Data',
          content: (
            <>
              <p>
                <strong>
                  StockPilot does not sell your personal information.
                </strong>
              </p>

              <p>
                We also do not disclose your personal information to unrelated
                third parties for their own behavioural advertising or direct
                marketing purposes.
              </p>
            </>
          ),
        },

        {
          title: '5. Service Providers',
          content: (
            <>
              <p>
                We may use trusted third-party service providers to operate
                StockPilot, including providers of hosting, cloud
                infrastructure, authentication, analytics, security,
                communications, market data and technical services.
              </p>

              <p>
                These providers may process information only as necessary to
                provide services to StockPilot and are expected to handle such
                information in accordance with applicable data protection
                requirements and contractual obligations.
              </p>

              <p>
                We may also disclose information where required by law,
                regulation, court order or lawful governmental request, or
                where reasonably necessary to protect legal rights or prevent
                fraud, abuse or security threats.
              </p>
            </>
          ),
        },

        {
          title: '6. Financial and Investment Activity',
          content: (
            <>
              <p>
                StockPilot may record how users interact with research,
                financial metrics, company pages, screening tools, watchlists
                and investment-related features for product operation,
                analytics and improvement.
              </p>

              <p>
                StockPilot is not a brokerage and does not require access to
                your brokerage account credentials unless a future feature
                expressly states otherwise and you separately authorise such
                access.
              </p>
            </>
          ),
        },

        {
          title: '7. Legal Bases for Processing',
          content: (
            <>
              <p>
                Where applicable data protection law requires a legal basis,
                we may process personal information because it is necessary to
                provide services requested by you, because we have legitimate
                interests in operating and improving StockPilot, because we
                must comply with legal obligations, or because you have given
                consent.
              </p>

              <p>
                Where processing is based on consent, you may withdraw that
                consent subject to applicable law.
              </p>
            </>
          ),
        },

        {
          title: '8. Data Retention',
          content: (
            <>
              <p>
                We retain personal information only for as long as reasonably
                necessary for the purposes described in this Privacy Policy,
                including providing the service, maintaining legitimate
                business records, resolving disputes, enforcing agreements
                and complying with legal obligations.
              </p>

              <p>
                Retention periods may vary depending on the type of information
                and the purpose for which it is processed.
              </p>
            </>
          ),
        },

        {
          title: '9. Data Security',
          content: (
            <>
              <p>
                We use reasonable administrative, organisational and technical
                safeguards designed to protect personal information against
                unauthorised access, loss, misuse, alteration or disclosure.
              </p>

              <p>
                However, no electronic transmission, storage system or online
                service can be guaranteed to be completely secure. You use the
                service and transmit information at your own risk.
              </p>
            </>
          ),
        },

        {
          title: '10. International Data Transfers',
          content: (
            <>
              <p>
                StockPilot and its service providers may process information
                in countries other than the country in which you reside.
                Where required, we take appropriate measures intended to
                protect personal information when it is transferred
                internationally.
              </p>
            </>
          ),
        },

        {
          title: '11. Your Privacy Rights',
          content: (
            <>
              <p>
                Depending on your location, you may have rights regarding your
                personal information, including the right to request access,
                correction, deletion, restriction, portability or objection to
                certain processing.
              </p>

              <p>
                You may also have the right to withdraw consent and to lodge a
                complaint with the applicable data protection authority.
              </p>

              <p>
                Certain rights may be subject to legal exceptions,
                verification requirements or retention obligations.
              </p>
            </>
          ),
        },

        {
          title: '12. Children',
          content: (
            <>
              <p>
                StockPilot is not intended for children under the minimum age
                permitted to use financial or online services in their
                jurisdiction. We do not knowingly seek to collect personal
                information from children in violation of applicable law.
              </p>
            </>
          ),
        },

        {
          title: '13. Changes to This Policy',
          content: (
            <>
              <p>
                We may update this Privacy Policy from time to time. The
                revised version will be published with an updated effective
                date. Where required by law, we will provide additional notice
                of material changes.
              </p>
            </>
          ),
        },

        {
          title: '14. Contact',
          content: (
            <>
              <p>
                Questions regarding this Privacy Policy or your personal
                information may be directed to:
              </p>

              <p>
                <strong>StockPilot</strong>
                <br />
                Privacy enquiries:
                {' '}
                <a href="mailto:privacy@stockpilot.ai">
                  privacy@stockpilot.ai
                </a>
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
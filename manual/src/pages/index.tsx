import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          SuperChase OS
        </Heading>
        <p className="hero__subtitle">
          The Executive Operating System for Multi-Business Operators
        </p>
        <p style={{fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2rem'}}>
          AI-powered command center that manages tasks, surfaces insights, and executes across your entire portfolio.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/system/george">
            Meet George (AI Hub)
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{marginLeft: '1rem', color: 'white', borderColor: 'white'}}
            to="/blog">
            Read the Blog
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({title, description, link}: {title: string; description: string; link: string}) {
  return (
    <div className="col col--4">
      <div className="card" style={{height: '100%', padding: '1.5rem'}}>
        <div className="card__header">
          <h3>{title}</h3>
        </div>
        <div className="card__body">
          <p>{description}</p>
        </div>
        <div className="card__footer">
          <Link className="button button--primary button--sm" to={link}>
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section style={{padding: '4rem 0'}}>
      <div className="container">
        <div className="row">
          <FeatureCard
            title="Hub & Spoke Architecture"
            description="Asana as single source of truth. Gmail, Voice, and Chat as spokes. Google Sheets for audit logging only."
            link="/system/ingest-flow"
          />
          <FeatureCard
            title="George: Your AI Chief of Staff"
            description="Voice-activated briefings, real-time task queries, and conversational business intelligence."
            link="/system/george"
          />
          <FeatureCard
            title="Marketing Agency"
            description="4-agent content factory that turns business activity into blog posts and X.com threads."
            link="/blog/synthetic-marketing-agency"
          />
        </div>
      </div>
    </section>
  );
}

function BusinessUnits() {
  const units = [
    {name: 'Scan2Plan', color: '#3b82f6', desc: 'Reality Capture & 3D Scanning'},
    {name: 'Studio C', color: '#10b981', desc: 'Production as a Service'},
    {name: 'CPTV', color: '#a855f7', desc: 'Personal Brand & Content'},
    {name: 'Tuthill Design', color: '#f97316', desc: 'Design Methodology'},
  ];

  return (
    <section style={{padding: '4rem 0', background: 'var(--ifm-background-surface-color)'}}>
      <div className="container">
        <Heading as="h2" style={{textAlign: 'center', marginBottom: '2rem'}}>
          Portfolio Coverage
        </Heading>
        <div className="row" style={{justifyContent: 'center'}}>
          {units.map((unit) => (
            <div key={unit.name} className="col col--3" style={{textAlign: 'center', marginBottom: '1rem'}}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: unit.color,
                margin: '0 auto 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {unit.name.charAt(0)}
              </div>
              <h4 style={{marginBottom: '0.25rem'}}>{unit.name}</h4>
              <p style={{fontSize: '0.875rem', opacity: 0.7}}>{unit.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <section style={{padding: '2rem 0', borderTop: '1px solid var(--ifm-toc-border-color)'}}>
      <div className="container" style={{textAlign: 'center'}}>
        <p style={{fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.5rem'}}>
          SuperChase OS is currently in private beta testing.
        </p>
        <p style={{fontSize: '0.75rem', opacity: 0.5}}>
          <Link to="/terms">Terms of Service</Link>
          {' · '}
          <Link to="/privacy">Privacy Policy</Link>
          {' · '}
          Built with Claude Code
        </p>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Executive OS"
      description="AI-powered command center for multi-business operators">
      <HomepageHeader />
      <main>
        <Features />
        <BusinessUnits />
        <Footer />
      </main>
    </Layout>
  );
}

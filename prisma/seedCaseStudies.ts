import { EvidenceTier } from '@prisma/client';
import { prisma } from '../src/config/db.js';
import { env } from '../src/config/env.js';

/**
 * Seeds sample CaseStudy rows for local development/demo purposes.
 * Idempotent: uses fixed ids so re-running upserts instead of duplicating.
 * Requires the Admin row from seed.ts to already exist (creator FK).
 */

const CASE_STUDIES: Array<{
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  evidenceDescription: string;
  evidenceUrl?: string;
  evidenceTier?: EvidenceTier;
  scoreRiseDate: Date;
  confirmedDate: Date;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  isPublished: boolean;
}> = [
  {
    id: 'seed-case-study-0001',
    name: 'Bole Road Commercial Corridor Expansion',
    latitude: 8.9926,
    longitude: 38.7897,
    evidenceDescription:
      'New retail and office construction along Bole Road, including three multi-story commercial buildings completed within the observation window.',
    evidenceUrl: 'https://example.com/reports/bole-road-corridor',
    evidenceTier: EvidenceTier.INFRASTRUCTURE,
    scoreRiseDate: new Date('2026-02-10'),
    confirmedDate: new Date('2026-03-01'),
    beforeImageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop', // Before: Construction site
    afterImageUrl:
      'https://images.unsplash.com/photo-1486718448742-163732cd1544?w=800&h=400&fit=crop', // After: Modern building
    isPublished: true,
  },
  {
    id: 'seed-case-study-0002',
    name: 'CMC Housing Development',
    latitude: 9.0192,
    longitude: 38.8348,
    evidenceDescription:
      'Large-scale residential housing project near CMC roundabout, with visible night-light growth corresponding to new electrical grid connections.',
    evidenceUrl: 'https://example.com/reports/cmc-housing',
    evidenceTier: EvidenceTier.OFFICIAL,
    scoreRiseDate: new Date('2025-11-15'),
    confirmedDate: new Date('2025-12-20'),
    beforeImageUrl:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=400&fit=crop', // Before: Empty land
    afterImageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop', // After: Housing development
    isPublished: true,
  },
  {
    id: 'seed-case-study-0003',
    name: 'Merkato Market Infrastructure Upgrade',
    latitude: 9.035,
    longitude: 38.74,
    evidenceDescription:
      'Road paving and stall formalization project in the eastern Merkato district, reducing informal vendor congestion and improving vehicle access.',
    evidenceUrl: 'https://example.com/news/merkato-upgrade',
    evidenceTier: EvidenceTier.LOCAL_NEWS,
    scoreRiseDate: new Date('2026-01-05'),
    confirmedDate: new Date('2026-01-28'),
    beforeImageUrl:
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&h=400&fit=crop', // Before: Crowded market
    afterImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f2f6?w=800&h=400&fit=crop', // After: Modernized market
    isPublished: true,
  },
  {
    id: 'seed-case-study-0004',
    name: 'Piassa Mixed-Use Redevelopment',
    latitude: 9.0357,
    longitude: 38.7503,
    evidenceDescription:
      'Historic Piassa block converted into a mixed-use development combining ground-floor retail with upper-floor offices.',
    evidenceUrl: 'https://example.com/reports/piassa-redevelopment',
    evidenceTier: EvidenceTier.MARKET_REPORT,
    scoreRiseDate: new Date('2025-09-22'),
    confirmedDate: new Date('2025-10-30'),
    beforeImageUrl:
      'https://images.unsplash.com/photo-1564325724739-bae0bd08762c?w=800&h=400&fit=crop', // Before: Old buildings
    afterImageUrl:
      'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=400&fit=crop', // After: Renovated area
    isPublished: true,
  },
  {
    id: 'seed-case-study-0005',
    name: 'Summit Business Park Phase II',
    latitude: 9.0084,
    longitude: 38.8654,
    evidenceDescription:
      'Second-phase construction of the Summit business park, adding warehouse and light-industrial units with new road access.',
    evidenceUrl: 'https://example.com/reports/summit-phase-2',
    evidenceTier: EvidenceTier.INFRASTRUCTURE,
    scoreRiseDate: new Date('2026-04-01'),
    confirmedDate: new Date('2026-04-25'),
    beforeImageUrl:
      'https://images.unsplash.com/photo-1486326698412-dac3ad6e0af0?w=800&h=400&fit=crop', // Before: Industrial land
    afterImageUrl:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=400&fit=crop', // After: Business park
    isPublished: true,
  },
  {
    id: 'seed-case-study-0006',
    name: 'Gerji Residential Tower (Draft)',
    latitude: 9.0119,
    longitude: 38.8221,
    evidenceDescription:
      'Reported new residential tower in Gerji; awaiting secondary source confirmation before publishing.',
    evidenceTier: EvidenceTier.LOCAL_NEWS,
    scoreRiseDate: new Date('2026-05-10'),
    confirmedDate: new Date('2026-05-10'),
    beforeImageUrl:
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=400&fit=crop', // Before: Construction site
    afterImageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=400&fit=crop', // After: Tower construction
    isPublished: false,
  },
  {
    id: 'seed-case-study-0007',
    name: 'Kality Industrial Zone Extension (Draft)',
    latitude: 8.9247,
    longitude: 38.7644,
    evidenceDescription:
      'Preliminary satellite signal suggests industrial zone extension near Kality; evidence still being gathered.',
    evidenceTier: EvidenceTier.MARKET_REPORT,
    scoreRiseDate: new Date('2026-06-01'),
    confirmedDate: new Date('2026-06-01'),
    beforeImageUrl:
      'https://images.unsplash.com/photo-1517172740025-3a9c4c00d833?w=800&h=400&fit=crop', // Before: Industrial zone
    afterImageUrl:
      'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=400&fit=crop', // After: Extended industrial area
    isPublished: false,
  },
];

async function main(): Promise<void> {
  const { ADMIN_SEED_EMAIL } = env;

  if (!ADMIN_SEED_EMAIL) {
    throw new Error('Seed failed: ADMIN_SEED_EMAIL must be set in the environment.');
  }

  const admin = await prisma.admin.findUnique({ where: { email: ADMIN_SEED_EMAIL } });
  if (!admin) {
    throw new Error(
      `Seed failed: no Admin found for ${ADMIN_SEED_EMAIL}. Run "npm run prisma:seed" first.`,
    );
  }

  for (const cs of CASE_STUDIES) {
    const { id, ...data } = cs;
    const caseStudy = await prisma.caseStudy.upsert({
      where: { id },
      update: { ...data, gridCellId: null },
      create: { id, ...data, gridCellId: null, createdById: admin.id },
    });
    console.log(`CaseStudy upserted: ${caseStudy.name} (published: ${caseStudy.isPublished})`);
  }
}

main()
  .catch((error) => {
    console.error('Case study seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

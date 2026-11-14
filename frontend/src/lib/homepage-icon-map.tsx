import type { ComponentType, SVGProps } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Percent,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import type { HomepageIconKey } from '@your-academy/shared';
import {
  BanglaBookIcon,
  BankTempleIcon,
  BcsEmblemIcon,
  EnglishLangIcon,
  GearBlueIcon,
  GkGlobeIcon,
  GovSealIcon,
  GradCapIcon,
  MathSymbolsIcon,
} from '@/components/marketing/homepage-icons';

type IconComp = ComponentType<SVGProps<SVGSVGElement>>;

export const HOMEPAGE_ICON_MAP: Record<HomepageIconKey, IconComp> = {
  graduation: GraduationCap,
  users: Users,
  book: BookOpen,
  trophy: Trophy,
  bcs: BcsEmblemIcon,
  bank: BankTempleIcon,
  gov: GovSealIcon,
  grad: GradCapIcon,
  gear: GearBlueIcon,
  bangla: BanglaBookIcon,
  english: EnglishLangIcon,
  math: MathSymbolsIcon,
  gk: GkGlobeIcon,
  check: CheckCircle2,
  xcircle: XCircle,
  percent: Percent,
  trending: TrendingUp,
  barchart: BarChart3,
};

export function HomepageIcon({
  iconKey,
  className,
}: {
  iconKey: HomepageIconKey;
  className?: string;
}) {
  const Icon = HOMEPAGE_ICON_MAP[iconKey] ?? GearBlueIcon;
  return <Icon className={className} aria-hidden />;
}

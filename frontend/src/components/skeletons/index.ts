/**
 * Page-specific skeletons — each mirrors its route layout.
 * Primitives are for composition only; do not use a generic full-page skeleton
 * across unrelated routes.
 */

export {
  MetricTileSkeletonExact as MetricTileSkeleton,
  PageHeaderSkeleton,
  PracticeSetCardSkeletonExact as PracticeSetCardSkeleton,
  PracticeSetGridSkeleton,
  SkBadge,
  SkButton,
  SkCircle,
  SkLine,
  SkPill,
  SkStatus,
  SkTitle,
  StatCardSkeletonExact as StatCardSkeleton,
} from '@/components/skeletons/primitives';

export {
  BookmarksPageSkeleton,
  DocumentDetailPageSkeleton,
  DocumentsPageSkeleton,
  ExamsPageSkeleton,
  HomeActivityListSkeleton,
  HomeAnswerMixSkeleton,
  HomePageSkeleton,
  HomeStudyTimeSkeleton,
  HomeSubjectProgressSkeleton,
  NewsDetailPageSkeleton,
  NewsPageSkeleton,
  OnboardingPageSkeleton,
  PracticeBrowsePageSkeleton,
  PracticePlayerPageSkeleton,
  ProfilePageSkeleton,
  QuestionDetailPageSkeleton,
  QuestionsListBodySkeleton,
  QuestionsPageSkeleton,
  ResultDetailPageSkeleton,
  ResultsPageSkeleton,
  SubjectDetailPageSkeleton,
  SubjectsPageSkeleton,
} from '@/components/skeletons/route/learner';

export {
  AdminBulkPreviewTableSkeleton,
  AdminBulkUploadDetailPageSkeleton,
  AdminBulkUploadNewPageSkeleton,
  AdminBulkUploadPageSkeleton,
  AdminBulkUploadTableSkeleton,
  AdminCategoriesPageSkeleton,
  AdminDashboardPageSkeleton,
  AdminDocumentsPageSkeleton,
  AdminNewsEditPageSkeleton,
  AdminNewsPageSkeleton,
  AdminPracticeSetsPageSkeleton,
  AdminQuestionFormPageSkeleton,
  AdminQuestionsPageSkeleton,
  AdminUsersPageSkeleton,
  AdminUsersTableSkeleton,
  AdminAuditTableSkeleton,
  AdminUsersDetailPageSkeleton,
  AdminActivityPageSkeleton,
} from '@/components/skeletons/route/admin';

export {
  ForgotPasswordPageSkeleton,
  LoginPageSkeleton,
  RegisterPageSkeleton,
  ResetPasswordPageSkeleton,
} from '@/components/skeletons/route/auth';

/** @deprecated Prefer route-specific exports above */
export { ContentIn, Skeleton, SkeletonRegion } from '@/components/ui/skeleton';

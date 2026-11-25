import { Global, Module } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service';
import { AdminPaymentsController, AdminSubscriptionsController } from './admin-billing.controller';
import { BillingController } from './billing.controller';
import { PackagesService } from './packages.service';
import { PaymentRecheckService } from './payment-recheck.service';
import {
  AdminPlanFeaturesController,
  PublicPlanFeaturesController,
} from './plan-features.controller';
import { PlanFeaturesService } from './plan-features.service';
import { PaymentsService } from './payments.service';
import { SiteSettingsService } from './site-settings.service';
import { SubscriptionRemindersService } from './subscription-reminders.service';
import { SubscriptionsService } from './subscriptions.service';

/** DEC-060 — Free vs Paid access, packages, subscriptions and SSLCommerz payments. */
@Global()
@Module({
  controllers: [
    BillingController,
    AdminSubscriptionsController,
    AdminPaymentsController,
    PublicPlanFeaturesController,
    AdminPlanFeaturesController,
  ],
  providers: [
    SiteSettingsService,
    AccessPolicyService,
    PackagesService,
    SubscriptionsService,
    PaymentsService,
    PaymentRecheckService,
    SubscriptionRemindersService,
    PlanFeaturesService,
  ],
  exports: [AccessPolicyService, SiteSettingsService, SubscriptionsService],
})
export class BillingModule {}

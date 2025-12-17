import { PrismaService } from '@/lib/prisma/prisma.service';
import { couponSeedData, planSeedData } from '@/lib/seed/data/stripe.data';
import { StripeService } from '@/lib/stripe/stripe.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SubscriptionPlanService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async onModuleInit() {
    // seed plans
    await this.seedPlans();
    // wait for 5 seconds before seeding coupons
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // seed coupons
    await this.seedCoupons();
  }

  async seedPlans() {
    for (const plan of planSeedData) {
      const existingPlan = await this.prisma.client.subscriptionPlan.findFirst({
        where: { planType: plan.planType },
      });

      if (existingPlan) {
        this.logger.log(
          `[EXIST] ${plan.title} already exists in DB, skipping DB create...`,
        );
        continue;
      }

      // Check for existing Stripe price
      const existingPrice = await this.stripe.getActivePriceByPlanType(
        plan.planType,
      );

      if (existingPrice) {
        this.logger.log(
          `[REUSE] Reusing price ${existingPrice.id} for ${plan.planType}`,
        );

        await this.prisma.client.subscriptionPlan.create({
          data: {
            ...plan,
            stripeProductId: existingPrice.product as string,
            stripePriceId: existingPrice.id,
          },
        });

        this.logger.log(`[CREATED] DB Plan: ${plan.title}`);

        continue;
      }

      const { stripePrice } = await this.stripe.createProductWithPrice({
        title: plan.title,
        description: plan.description,
        price: plan.price,
        planType: plan.planType,
      });

      await this.prisma.client.subscriptionPlan.create({
        data: {
          ...plan,
          stripeProductId: stripePrice.product as string,
          stripePriceId: stripePrice.id,
        },
      });

      this.logger.log(`[CREATED] DB Plan: ${plan.title}`);
    }
  }

  async seedCoupons() {
    for (const coupon of couponSeedData) {
      // 1. Find plan
      const plan = await this.prisma.client.subscriptionPlan.findFirst({
        where: { planType: coupon.planType },
      });

      if (!plan) {
        this.logger.error(
          `[SKIP] Plan not found for ${coupon.planType}, skipping coupon...`,
        );
        continue;
      }

      // 2. Check DB
      const existingPromo = await this.prisma.client.promoCode.findFirst({
        where: { code: coupon.code },
      });

      if (existingPromo) {
        this.logger.log(
          `[EXIST] PromoCode ${coupon.code} already exists in DB, skipping DB create...`,
        );
        continue;
      }

      // 3. Check Stripe
      let stripeCoupon = await this.stripe.getCouponByPlanType(coupon.planType);

      if (!stripeCoupon) {
        stripeCoupon = await this.stripe.createStripeCoupon(
          coupon.discount,
          coupon.planType,
        );
        this.logger.log(
          `[CREATED] Stripe Coupon ${stripeCoupon.id} (${coupon.code})`,
        );
      } else {
        this.logger.log(
          `[REUSE] Reusing Stripe Coupon ${stripeCoupon.id} for ${coupon.code}`,
        );
      }

      // 4. Create Promo in DB
      await this.prisma.client.promoCode.create({
        data: {
          code: coupon.code,
          discount: coupon.discount,
          freeMonths: coupon.freeMonths,
          planId: plan.id,
          stripeCouponId: stripeCoupon.id,
        },
      });

      this.logger.log(`[CREATED] DB PromoCode: ${coupon.code}`);
    }
  }
}
